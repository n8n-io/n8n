import type { INodeProperties } from 'n8n-workflow';
import { regions } from './regions';

export const awsRegionProperty: INodeProperties = {
	displayName: 'Region',
	name: 'region',
	type: 'options',
	options: regions.map((r) => ({
		name: `${r.displayName} (${r.location}) - ${r.name}`,
		value: r.name,
	})),
	default: 'us-east-1',
};

export const awsCustomEndpoints: INodeProperties[] = [
	{
		displayName: 'Custom Endpoints',
		name: 'customEndpoints',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Rekognition Endpoint',
		name: 'rekognitionEndpoint',
		description:
			'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and Rekognition using a VPC endpoint. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://rekognition.{region}.amazonaws.com',
	},
	{
		displayName: 'Lambda Endpoint',
		name: 'lambdaEndpoint',
		description:
			'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and Lambda using a VPC endpoint. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://lambda.{region}.amazonaws.com',
	},
	{
		displayName: 'SNS Endpoint',
		name: 'snsEndpoint',
		description:
			'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SNS using a VPC endpoint. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://sns.{region}.amazonaws.com',
	},
	{
		displayName: 'SES Endpoint',
		name: 'sesEndpoint',
		description:
			'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SES using a VPC endpoint. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://email.{region}.amazonaws.com',
	},
	{
		displayName: 'SQS Endpoint',
		name: 'sqsEndpoint',
		description:
			'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and SQS using a VPC endpoint. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://sqs.{region}.amazonaws.com',
	},
	{
		displayName: 'S3 Endpoint',
		name: 's3Endpoint',
		description:
			'If you use Amazon VPC to host n8n, you can establish a connection between your VPC and S3 using a VPC endpoint. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://s3.{region}.amazonaws.com',
	},
	{
		displayName: 'SSM Endpoint',
		name: 'ssmEndpoint',
		description: 'Endpoint for AWS Systems Manager (SSM)',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://ssm.{region}.amazonaws.com',
	},
	{
		displayName: 'Bedrock Endpoint',
		name: 'bedrockEndpoint',
		description:
			'Control-plane endpoint used to list Bedrock models (e.g. in the AWS Bedrock model dropdowns). If you route Bedrock through a VPC endpoint (PrivateLink) without Private DNS, set the endpoint here. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://bedrock.{region}.amazonaws.com',
	},
	{
		displayName: 'Bedrock Runtime Endpoint',
		name: 'bedrockRuntimeEndpoint',
		description:
			'Runtime endpoint used for Bedrock inference (chat and embeddings). If you route Bedrock through a VPC endpoint (PrivateLink) without Private DNS, set the endpoint here. Leave blank to use the default endpoint.',
		type: 'string',
		displayOptions: {
			show: {
				customEndpoints: [true],
			},
		},
		default: '',
		placeholder: 'https://bedrock-runtime.{region}.amazonaws.com',
	},
];
