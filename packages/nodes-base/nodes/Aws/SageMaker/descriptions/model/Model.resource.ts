import type { INodeProperties } from 'n8n-workflow';

export const modelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['model'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a model',
				action: 'Create a model',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.CreateModel',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ModelName: '={{ $parameter["modelName"] }}',
							ExecutionRoleArn: '={{ $parameter["executionRoleArn"] }}',
							PrimaryContainer: '={{ $parameter["primaryContainer"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a model',
				action: 'Delete a model',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DeleteModel',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ModelName: '={{ $parameter["modelName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a model',
				action: 'Describe a model',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DescribeModel',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							ModelName: '={{ $parameter["modelName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all models',
				action: 'List models',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.ListModels',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const modelFields: INodeProperties[] = [
	{
		displayName: 'Model Name',
		name: 'modelName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['model'],
				operation: ['create', 'delete', 'describe'],
			},
		},
		default: '',
		description: 'The name of the model',
	},
	{
		displayName: 'Execution Role ARN',
		name: 'executionRoleArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['model'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The IAM role ARN that SageMaker can assume',
	},
	{
		displayName: 'Primary Container (JSON)',
		name: 'primaryContainer',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['model'],
				operation: ['create'],
			},
		},
		default: '{\n  "Image": "382416733822.dkr.ecr.us-east-1.amazonaws.com/xgboost:latest",\n  "ModelDataUrl": "s3://bucket/model.tar.gz"\n}',
		description: 'Primary container definition including image and model data location',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['model'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 10,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
		],
	},
];
