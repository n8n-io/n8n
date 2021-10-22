import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class Aws implements ICredentialType {
	name = 'aws';
	displayName = 'AWS';
	documentationUrl = 'aws';
	icon = 'file:AWS.svg';
	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'string',
			default: 'us-east-1',
		},
		{
			displayName: 'Access Key ID',
			name: 'accessKeyId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Secret Access Key',
			name: 'secretAccessKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'Custom Endpoints',
			name: 'customEndpoints',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'Rekognition Endpoint',
			name: 'rekognitionEndpoint',
			description: 'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and Rekognition using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [
						true,
					],
				},
			},
			default: '',
			placeholder: 'https://rekognition.{region}.amazonaws.com',
		},
		{
			displayName: 'Lambda Endpoint',
			name: 'lambdaEndpoint',
			description: 'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and Lambda using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [
						true,
					],
				},
			},
			default: '',
			placeholder: 'https://lambda.{region}.amazonaws.com',
		},
		{
			displayName: 'SNS Endpoint',
			name: 'snsEndpoint',
			description: 'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SNS using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [
						true,
					],
				},
			},
			default: '',
			placeholder: 'https://sns.{region}.amazonaws.com',
		},
		{
			displayName: 'SES Endpoint',
			name: 'sesEndpoint',
			description: 'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SES using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [
						true,
					],
				},
			},
			default: '',
			placeholder: 'https://email.{region}.amazonaws.com',
		},
		{
			displayName: 'SQS Endpoint',
			name: 'sqsEndpoint',
			description: 'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SQS using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [
						true,
					],
				},
			},
			default: '',
			placeholder: 'https://sqs.{region}.amazonaws.com',
		},
		{
			displayName: 'S3 Endpoint',
			name: 's3Endpoint',
			description: 'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and S3 using a VPC endpoint. Leave blank to use the default endpoint.',
			type: 'string',
			displayOptions: {
				show: {
					customEndpoints: [
						true,
					],
				},
			},
			default: '',
			placeholder: 'https://s3.{region}.amazonaws.com',
		},
	];
}
