import type { INodeProperties } from 'n8n-workflow';

export const recordOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['record'],
			},
		},
		options: [
			{
				name: 'Get Records',
				value: 'getRecords',
				description: 'Get records from a shard',
				action: 'Get records',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.GetRecords',
						},
						body: {
							ShardIterator: '={{ $parameter["shardIterator"] }}',
						},
					},
				},
			},
			{
				name: 'Get Shard Iterator',
				value: 'getShardIterator',
				description: 'Get a shard iterator',
				action: 'Get shard iterator',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.GetShardIterator',
						},
						body: {
							StreamName: '={{ $parameter["streamName"] }}',
							ShardId: '={{ $parameter["shardId"] }}',
							ShardIteratorType: '={{ $parameter["shardIteratorType"] }}',
						},
					},
				},
			},
			{
				name: 'Put Record',
				value: 'putRecord',
				description: 'Put a single record into a stream',
				action: 'Put a record',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.PutRecord',
						},
						body: {
							StreamName: '={{ $parameter["streamName"] }}',
							Data: '={{ $parameter["data"] }}',
							PartitionKey: '={{ $parameter["partitionKey"] }}',
						},
					},
				},
			},
			{
				name: 'Put Records',
				value: 'putRecords',
				description: 'Put multiple records into a stream',
				action: 'Put records',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Kinesis_20131202.PutRecords',
						},
						body: {
							StreamName: '={{ $parameter["streamName"] }}',
							Records: '={{ $parameter["records"] }}',
						},
					},
				},
			},
		],
		default: 'putRecord',
	},
];

export const recordFields: INodeProperties[] = [
	{
		displayName: 'Stream Name',
		name: 'streamName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['putRecord', 'putRecords', 'getShardIterator'],
			},
		},
		default: '',
		description: 'The name of the stream',
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['putRecord'],
			},
		},
		default: '',
		description: 'The data to put into the stream (will be base64 encoded)',
	},
	{
		displayName: 'Partition Key',
		name: 'partitionKey',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['putRecord'],
			},
		},
		default: '',
		description: 'Partition key for the record',
	},
	{
		displayName: 'Records',
		name: 'records',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['putRecords'],
			},
		},
		default: '',
		description: 'Array of records as JSON (e.g., [{"Data":"...","PartitionKey":"..."}])',
		placeholder: '[{"Data":"base64data","PartitionKey":"key1"}]',
	},
	{
		displayName: 'Shard ID',
		name: 'shardId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getShardIterator'],
			},
		},
		default: '',
		description: 'The ID of the shard',
	},
	{
		displayName: 'Shard Iterator Type',
		name: 'shardIteratorType',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getShardIterator'],
			},
		},
		options: [
			{ name: 'Trim Horizon', value: 'TRIM_HORIZON' },
			{ name: 'Latest', value: 'LATEST' },
			{ name: 'At Sequence Number', value: 'AT_SEQUENCE_NUMBER' },
			{ name: 'After Sequence Number', value: 'AFTER_SEQUENCE_NUMBER' },
			{ name: 'At Timestamp', value: 'AT_TIMESTAMP' },
		],
		default: 'LATEST',
		description: 'The type of shard iterator',
	},
	{
		displayName: 'Shard Iterator',
		name: 'shardIterator',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getRecords'],
			},
		},
		default: '',
		description: 'The shard iterator from GetShardIterator',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['record'],
				operation: ['getRecords'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'Limit',
				type: 'number',
				default: 10000,
				description: 'Maximum number of records to return',
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
				resource: ['record'],
				operation: ['getShardIterator'],
			},
		},
		options: [
			{
				displayName: 'Starting Sequence Number',
				name: 'StartingSequenceNumber',
				type: 'string',
				default: '',
				description: 'Sequence number to start from',
			},
			{
				displayName: 'Timestamp',
				name: 'Timestamp',
				type: 'string',
				default: '',
				description: 'Timestamp to start from',
			},
		],
	},
];
