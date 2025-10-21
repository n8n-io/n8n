import type { INodeProperties } from 'n8n-workflow';

export const trainingJobOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a training job',
				action: 'Create a training job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.CreateTrainingJob',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							TrainingJobName: '={{ $parameter["trainingJobName"] }}',
							RoleArn: '={{ $parameter["roleArn"] }}',
							AlgorithmSpecification: '={{ $parameter["algorithmSpecification"] }}',
							InputDataConfig: '={{ $parameter["inputDataConfig"] }}',
							OutputDataConfig: '={{ $parameter["outputDataConfig"] }}',
							ResourceConfig: '={{ $parameter["resourceConfig"] }}',
							StoppingCondition: '={{ $parameter["stoppingCondition"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a training job',
				action: 'Describe a training job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.DescribeTrainingJob',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							TrainingJobName: '={{ $parameter["trainingJobName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all training jobs',
				action: 'List training jobs',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.ListTrainingJobs',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					},
				},
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop a training job',
				action: 'Stop a training job',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'SageMaker.StopTrainingJob',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							TrainingJobName: '={{ $parameter["trainingJobName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const trainingJobFields: INodeProperties[] = [
	// Common fields
	{
		displayName: 'Training Job Name',
		name: 'trainingJobName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create', 'describe', 'stop'],
			},
		},
		default: '',
		description: 'The name of the training job',
	},
	// Create fields
	{
		displayName: 'Role ARN',
		name: 'roleArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The IAM role ARN that SageMaker can assume',
	},
	{
		displayName: 'Algorithm Specification (JSON)',
		name: 'algorithmSpecification',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create'],
			},
		},
		default: '{\n  "TrainingImage": "382416733822.dkr.ecr.us-east-1.amazonaws.com/xgboost:latest",\n  "TrainingInputMode": "File"\n}',
		description: 'Algorithm specification including training image and input mode',
	},
	{
		displayName: 'Input Data Config (JSON)',
		name: 'inputDataConfig',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create'],
			},
		},
		default: '[\n  {\n    "ChannelName": "training",\n    "DataSource": {\n      "S3DataSource": {\n        "S3DataType": "S3Prefix",\n        "S3Uri": "s3://bucket/training-data",\n        "S3DataDistributionType": "FullyReplicated"\n      }\n    },\n    "ContentType": "text/csv"\n  }\n]',
		description: 'Input data configuration including S3 locations',
	},
	{
		displayName: 'Output Data Config (JSON)',
		name: 'outputDataConfig',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create'],
			},
		},
		default: '{\n  "S3OutputPath": "s3://bucket/output"\n}',
		description: 'Output data configuration',
	},
	{
		displayName: 'Resource Config (JSON)',
		name: 'resourceConfig',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create'],
			},
		},
		default: '{\n  "InstanceType": "ml.m5.xlarge",\n  "InstanceCount": 1,\n  "VolumeSizeInGB": 30\n}',
		description: 'Resource configuration for training',
	},
	{
		displayName: 'Stopping Condition (JSON)',
		name: 'stoppingCondition',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['trainingJob'],
				operation: ['create'],
			},
		},
		default: '{\n  "MaxRuntimeInSeconds": 86400\n}',
		description: 'Stopping condition - max runtime in seconds',
	},
	// List fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['trainingJob'],
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
			{
				displayName: 'Status Equals',
				name: 'StatusEquals',
				type: 'options',
				options: [
					{ name: 'InProgress', value: 'InProgress' },
					{ name: 'Completed', value: 'Completed' },
					{ name: 'Failed', value: 'Failed' },
					{ name: 'Stopping', value: 'Stopping' },
					{ name: 'Stopped', value: 'Stopped' },
				],
				default: '',
				description: 'Filter by status',
			},
		],
	},
];
