import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsApiRequestREST } from '../GenericFunctions';

export class AwsKinesis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Kinesis',
		name: 'awsKinesis',
		icon: 'file:kinesis.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Stream real-time data with Kinesis Data Streams',
		defaults: {
			name: 'AWS Kinesis',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Put Record',
						value: 'putRecord',
						description: 'Write a single record to a Kinesis stream',
						action: 'Put record',
					},
					{
						name: 'Put Records',
						value: 'putRecords',
						description: 'Write multiple records to a Kinesis stream (batch)',
						action: 'Put records',
					},
					{
						name: 'Get Records',
						value: 'getRecords',
						description: 'Retrieve records from a shard',
						action: 'Get records',
					},
					{
						name: 'Describe Stream',
						value: 'describeStream',
						description: 'Get details about a Kinesis stream',
						action: 'Describe stream',
					},
					{
						name: 'Create Stream',
						value: 'createStream',
						description: 'Create a new Kinesis data stream',
						action: 'Create stream',
					},
				],
				default: 'putRecord',
			},
			// Put Record
			{
				displayName: 'Stream Name',
				name: 'streamName',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['putRecord', 'putRecords', 'describeStream'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getStreams',
				},
				default: '',
				required: true,
				description: 'Stream name',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putRecord'],
					},
				},
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Data to send (will be base64 encoded)',
			},
			{
				displayName: 'Partition Key',
				name: 'partitionKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['putRecord'],
					},
				},
				default: '',
				required: true,
				description: 'Partition key for record (determines which shard receives the record)',
			},
			// Put Records
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['putRecords'],
					},
				},
				default: false,
				description:
					'Whether to send input items as records (each input item becomes a record with auto-generated partition key)',
			},
			{
				displayName: 'Records',
				name: 'records',
				type: 'fixedCollection',
				displayOptions: {
					show: {
						operation: ['putRecords'],
						sendInputData: [false],
					},
				},
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'recordsValues',
						displayName: 'Record',
						values: [
							{
								displayName: 'Data',
								name: 'data',
								type: 'string',
								default: '',
								description: 'Record data (JSON)',
							},
							{
								displayName: 'Partition Key',
								name: 'partitionKey',
								type: 'string',
								default: '',
								description: 'Partition key',
							},
						],
					},
				],
			},
			// Get Records
			{
				displayName: 'Shard Iterator',
				name: 'shardIterator',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				default: '',
				required: true,
				description: 'Shard iterator (from getShardIterator operation)',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getRecords'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 10000,
				},
				default: 100,
				description: 'Max number of records to retrieve',
			},
			// Create Stream
			{
				displayName: 'Stream Name',
				name: 'streamName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createStream'],
					},
				},
				default: '',
				required: true,
				description: 'Unique stream name',
			},
			{
				displayName: 'Shard Count',
				name: 'shardCount',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['createStream'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				required: true,
				description: 'Number of shards',
			},
		],
	};

	methods = {
		loadOptions: {
			async getStreams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const data = await awsApiRequestREST.call(
						this,
						'kinesis',
						'POST',
						'/',
						JSON.stringify({}),
						{
							'X-Amz-Target': 'Kinesis_20131202.ListStreams',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					if (!data.StreamNames) return [];

					return data.StreamNames.map((name: string) => ({
						name,
						value: name,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (operation === 'putRecord') {
					const streamName = this.getNodeParameter('streamName', i) as string;
					const data = this.getNodeParameter('data', i) as string;
					const partitionKey = this.getNodeParameter('partitionKey', i) as string;

					const encodedData = Buffer.from(data).toString('base64');

					const body = {
						StreamName: streamName,
						Data: encodedData,
						PartitionKey: partitionKey,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'kinesis',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Kinesis_20131202.PutRecord',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'putRecords') {
					const streamName = this.getNodeParameter('streamName', i) as string;
					const sendInputData = this.getNodeParameter('sendInputData', i) as boolean;

					let records: any[];

					if (sendInputData) {
						// Use input data as records
						records = items.map((item, index) => ({
							Data: Buffer.from(JSON.stringify(item.json)).toString('base64'),
							PartitionKey: `partition-${index}`,
						}));
					} else {
						// Use configured records
						const recordsValues = this.getNodeParameter(
							'records.recordsValues',
							i,
							[],
						) as any[];
						records = recordsValues.map((record) => ({
							Data: Buffer.from(record.data).toString('base64'),
							PartitionKey: record.partitionKey,
						}));
					}

					// Kinesis supports max 500 records per request
					const batches = [];
					for (let j = 0; j < records.length; j += 500) {
						batches.push(records.slice(j, j + 500));
					}

					const responses = [];
					for (const batch of batches) {
						const body = {
							StreamName: streamName,
							Records: batch,
						};

						const batchResponse = await awsApiRequestREST.call(
							this,
							'kinesis',
							'POST',
							'/',
							JSON.stringify(body),
							{
								'X-Amz-Target': 'Kinesis_20131202.PutRecords',
								'Content-Type': 'application/x-amz-json-1.1',
							},
						);

						responses.push(batchResponse);
					}

					responseData = responses;
				} else if (operation === 'getRecords') {
					const shardIterator = this.getNodeParameter('shardIterator', i) as string;
					const limit = this.getNodeParameter('limit', i) as number;

					const body = {
						ShardIterator: shardIterator,
						Limit: limit,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'kinesis',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Kinesis_20131202.GetRecords',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					// Decode base64 data in records
					if (responseData.Records && responseData.Records.length > 0) {
						responseData.Records = responseData.Records.map((record: any) => ({
							...record,
							Data: Buffer.from(record.Data, 'base64').toString('utf-8'),
						}));
					}
				} else if (operation === 'describeStream') {
					const streamName = this.getNodeParameter('streamName', i) as string;

					const body = {
						StreamName: streamName,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'kinesis',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Kinesis_20131202.DescribeStream',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = responseData.StreamDescription || responseData;
				} else if (operation === 'createStream') {
					const streamName = this.getNodeParameter('streamName', i) as string;
					const shardCount = this.getNodeParameter('shardCount', i) as number;

					const body = {
						StreamName: streamName,
						ShardCount: shardCount,
					};

					responseData = await awsApiRequestREST.call(
						this,
						'kinesis',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'Kinesis_20131202.CreateStream',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = { success: true, streamName, shardCount };
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
