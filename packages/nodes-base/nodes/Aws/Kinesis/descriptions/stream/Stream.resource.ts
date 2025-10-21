import type { INodeProperties } from 'n8n-workflow';

export const streamOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['stream'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new stream',
				action: 'Create a stream',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.CreateStream',
						},
						body: {
							StreamName: '={{ $parameter["streamName"] }}',
							ShardCount: '={{ $parameter["shardCount"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a stream',
				action: 'Delete a stream',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.DeleteStream',
						},
						body: {
							StreamName: '={{ $parameter["streamName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a stream',
				action: 'Describe a stream',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.DescribeStream',
						},
						body: {
							StreamName: '={{ $parameter["streamName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all streams',
				action: 'List streams',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.ListStreams',
						},
						body: {},
					},
				},
			},
		],
		default: 'list',
	},
];

export const streamFields: INodeProperties[] = [
	{
		displayName: 'Stream Name',
		name: 'streamName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['stream'],
				operation: ['create', 'delete', 'describe'],
			},
		},
		default: '',
		description: 'The name of the stream',
	},
	{
		displayName: 'Shard Count',
		name: 'shardCount',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				resource: ['stream'],
				operation: ['create'],
			},
		},
		default: 1,
		description: 'The number of shards for the stream',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['stream'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Stream Mode',
				name: 'StreamModeDetails',
				type: 'string',
				default: '',
				description: 'Stream mode details as JSON (e.g., {"StreamMode":"PROVISIONED"})',
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
				resource: ['stream'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'Limit',
				type: 'number',
				default: 100,
				description: 'Maximum number of streams to return',
			},
			{
				displayName: 'Exclusive Start Stream Name',
				name: 'ExclusiveStartStreamName',
				type: 'string',
				default: '',
				description: 'Stream name to start listing from',
			},
		],
	},
];
