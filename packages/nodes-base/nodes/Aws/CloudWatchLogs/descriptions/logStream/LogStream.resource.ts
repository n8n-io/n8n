import type { INodeProperties } from 'n8n-workflow';

export const logStreamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['logStream'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new log stream',
				action: 'Create a log stream',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.CreateLogStream',
						},
						body: {
							logGroupName: '={{ $parameter["logGroupName"] }}',
							logStreamName: '={{ $parameter["logStreamName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a log stream',
				action: 'Delete a log stream',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.DeleteLogStream',
						},
						body: {
							logGroupName: '={{ $parameter["logGroupName"] }}',
							logStreamName: '={{ $parameter["logStreamName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about log streams',
				action: 'Describe log streams',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.DescribeLogStreams',
						},
						body: {
							logGroupName: '={{ $parameter["logGroupName"] }}',
						},
					},
				},
			},
			{
				name: 'Put Events',
				value: 'putEvents',
				description: 'Put log events to a stream',
				action: 'Put log events',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Logs_20140328.PutLogEvents',
						},
						body: {
							logGroupName: '={{ $parameter["logGroupName"] }}',
							logStreamName: '={{ $parameter["logStreamName"] }}',
							logEvents: '={{ $parameter["logEvents"] }}',
						},
					},
				},
			},
		],
		default: 'describe',
	},
];

export const logStreamFields: INodeProperties[] = [
	{
		displayName: 'Log Group Name',
		name: 'logGroupName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['logStream'],
			},
		},
		default: '',
		description: 'The name of the log group',
	},
	{
		displayName: 'Log Stream Name',
		name: 'logStreamName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['logStream'],
				operation: ['create', 'delete', 'putEvents'],
			},
		},
		default: '',
		description: 'The name of the log stream',
	},
	{
		displayName: 'Log Events',
		name: 'logEvents',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['logStream'],
				operation: ['putEvents'],
			},
		},
		default: '',
		description: 'Log events as JSON array (e.g., [{"message":"Log message","timestamp":1234567890000}])',
		placeholder: '[{"message":"Error occurred","timestamp":1234567890000}]',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['logStream'],
				operation: ['describe'],
			},
		},
		options: [
			{
				displayName: 'Log Stream Name Prefix',
				name: 'logStreamNamePrefix',
				type: 'string',
				default: '',
				description: 'Filter by log stream name prefix',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Maximum number of log streams to return',
			},
			{
				displayName: 'Next Token',
				name: 'nextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['logStream'],
				operation: ['putEvents'],
			},
		},
		options: [
			{
				displayName: 'Sequence Token',
				name: 'sequenceToken',
				type: 'string',
				default: '',
				description: 'Sequence token from previous put operation',
			},
		],
	},
];
