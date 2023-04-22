import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RemovalPolicy, StackProps, Stack, CfnOutput} from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table} from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';


export class CdkThreeTierServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, "NotesTable", {
      billingMode:BillingMode.PAY_PER_REQUEST,
      partitionKey:{name:'pk', type: AttributeType.STRING},
      removalPolicy: RemovalPolicy.DESTROY,
      sortKey:{name:'sk', type:AttributeType.STRING},
      tableName:"NotesTable"
    });

    const readFunction = new NodejsFunction(this, 'ReadNotesFn', {
      architecture:Architecture.ARM_64,
      entry:`${__dirname}/fns/readFunction.ts`,
      logRetention:RetentionDays.ONE_WEEK
    }
    );

    const writeFunction = new NodejsFunction(this, 'WriteNotesFn', {
      architecture: Architecture.ARM_64,
      entry: `${__dirname}/fns/writeFunction.ts`,
      logRetention: RetentionDays.ONE_WEEK
    });

    table.grantReadData(readFunction);

    table.grantWriteData(writeFunction);

    const api = new HttpApi(this, 'NotesApi', {
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
        allowOrigins: ['*'],
      },
    });

    const readIntegration = new HttpLambdaIntegration(
      'ReadIntegration',
      readFunction
    );

    const writeIntegration = new HttpLambdaIntegration(
      'WriteIntegration',
      writeFunction
    );

    api.addRoutes({
      integration: readIntegration,
      methods: [HttpMethod.GET],
      path: '/notes',
    });

    api.addRoutes({
      integration: writeIntegration,
      methods: [HttpMethod.POST],
      path: '/notes',
    });

    new CfnOutput(this, 'HttpApiUrl', { value: api.apiEndpoint });
  }

}
