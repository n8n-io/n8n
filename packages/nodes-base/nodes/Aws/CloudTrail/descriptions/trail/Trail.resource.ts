import type { INodeProperties } from 'n8n-workflow';

export const trailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['trail'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a trail',
				action: 'Create a trail',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.CreateTrail',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a trail',
				action: 'Delete a trail',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.DeleteTrail',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get trail details',
				action: 'Get a trail',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.GetTrail',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'List trails',
				action: 'Get many trails',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.ListTrails',
						},
					},
				},
			},
			{
				name: 'Start Logging',
				value: 'startLogging',
				description: 'Start logging for a trail',
				action: 'Start logging',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.StartLogging',
						},
					},
				},
			},
			{
				name: 'Stop Logging',
				value: 'stopLogging',
				description: 'Stop logging for a trail',
				action: 'Stop logging',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CloudTrail_20131101.StopLogging',
						},
					},
				},
			},
		],
		default: 'create',
	},
];

export const trailFields: INodeProperties[] = [
	{
		displayName: 'Trail Name',
		name: 'Name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['trail'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					Name: '={{ $value }}',
				},
			},
		},
		description: 'The name of the trail',
	},
	{
		displayName: 'S3 Bucket Name',
		name: 'S3BucketName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['trail'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					S3BucketName: '={{ $value }}',
				},
			},
		},
		description: 'The S3 bucket for log file storage',
	},
	{
		displayName: 'Include Global Service Events',
		name: 'IncludeGlobalServiceEvents',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['trail'],
				operation: ['create'],
			},
		},
		default: true,
		routing: {
			request: {
				body: {
					IncludeGlobalServiceEvents: '={{ $value }}',
				},
			},
		},
		description: 'Whether to include global services like IAM',
	},
	{
		displayName: 'Is Multi Region Trail',
		name: 'IsMultiRegionTrail',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['trail'],
				operation: ['create'],
			},
		},
		default: false,
		routing: {
			request: {
				body: {
					IsMultiRegionTrail: '={{ $value }}',
				},
			},
		},
		description: 'Whether this is a multi-region trail',
	},
	{
		displayName: 'Is Organization Trail',
		name: 'IsOrganizationTrail',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['trail'],
				operation: ['create'],
			},
		},
		default: false,
		routing: {
			request: {
				body: {
					IsOrganizationTrail: '={{ $value }}',
				},
			},
		},
		description: 'Whether this is an organization trail',
	},
	{
		displayName: 'Enable Log File Validation',
		name: 'EnableLogFileValidation',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['trail'],
				operation: ['create'],
			},
		},
		default: false,
		routing: {
			request: {
				body: {
					EnableLogFileValidation: '={{ $value }}',
				},
			},
		},
		description: 'Whether to enable log file integrity validation',
	},
	{
		displayName: 'SNS Topic Name',
		name: 'SnsTopicName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['trail'],
				operation: ['create'],
			},
		},
		default: '',
		routing: {
			request: {
				body: {
					SnsTopicName: '={{ $value }}',
				},
			},
		},
		description: 'SNS topic for log file notifications',
	},
];
