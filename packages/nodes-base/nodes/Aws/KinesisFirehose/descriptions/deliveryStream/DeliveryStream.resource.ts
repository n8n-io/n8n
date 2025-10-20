import type { INodeProperties } from 'n8n-workflow';
import { handleError } from '../../helpers/errorHandler';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'list',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a delivery stream',
				action: 'Create a delivery stream',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.CreateDeliveryStream',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							DeliveryStreamType: '={{ $parameter["deliveryStreamType"] }}',
							ExtendedS3DestinationConfiguration: '={{ $parameter["s3Configuration"] }}',
							RedshiftDestinationConfiguration: '={{ $parameter["redshiftConfiguration"] }}',
							ElasticsearchDestinationConfiguration: '={{ $parameter["elasticsearchConfiguration"] }}',
							Tags: '={{ $parameter["tags"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a delivery stream',
				action: 'Delete a delivery stream',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.DeleteDeliveryStream',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							AllowForceDelete: '={{ $parameter["allowForceDelete"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Describe a delivery stream',
				action: 'Describe a delivery stream',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.DescribeDeliveryStream',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							Limit: '={{ $parameter["limit"] }}',
							ExclusiveStartDestinationId: '={{ $parameter["exclusiveStartDestinationId"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List delivery streams',
				action: 'List delivery streams',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.ListDeliveryStreams',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							Limit: '={{ $parameter["limit"] }}',
							ExclusiveStartDeliveryStreamName: '={{ $parameter["exclusiveStartDeliveryStreamName"] }}',
							DeliveryStreamType: '={{ $parameter["deliveryStreamTypeFilter"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Put Record',
				value: 'putRecord',
				description: 'Write a single data record into a delivery stream',
				action: 'Put a record',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.PutRecord',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							Record: {
								Data: '={{ $parameter["data"] }}',
							},
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Put Record Batch',
				value: 'putRecordBatch',
				description: 'Write multiple data records into a delivery stream',
				action: 'Put record batch',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.PutRecordBatch',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							Records: '={{ $parameter["records"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Start Delivery Stream Encryption',
				value: 'startEncryption',
				description: 'Enable server-side encryption',
				action: 'Start encryption',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.StartDeliveryStreamEncryption',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							DeliveryStreamEncryptionConfigurationInput: '={{ $parameter["encryptionConfig"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Stop Delivery Stream Encryption',
				value: 'stopEncryption',
				description: 'Disable server-side encryption',
				action: 'Stop encryption',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.StopDeliveryStreamEncryption',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
			{
				name: 'Update Destination',
				value: 'updateDestination',
				description: 'Update the destination configuration',
				action: 'Update destination',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'Firehose_20150804.UpdateDestination',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							DeliveryStreamName: '={{ $parameter["deliveryStreamName"] }}',
							CurrentDeliveryStreamVersionId: '={{ $parameter["currentVersionId"] }}',
							DestinationId: '={{ $parameter["destinationId"] }}',
							ExtendedS3DestinationUpdate: '={{ $parameter["s3DestinationUpdate"] }}',
						},
						ignoreHttpStatusErrors: true,
					},
					output: {
						postReceive: [handleError],
					},
				},
			},
		],
	},
	// Common field
	{
		displayName: 'Delivery Stream Name',
		name: 'deliveryStreamName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['delete', 'describe', 'putRecord', 'putRecordBatch', 'startEncryption', 'stopEncryption', 'updateDestination'],
			},
		},
		default: '',
		description: 'Name of the delivery stream',
	},
	// Create operation fields
	{
		displayName: 'Delivery Stream Name',
		name: 'deliveryStreamName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the delivery stream to create',
	},
	{
		displayName: 'Delivery Stream Type',
		name: 'deliveryStreamType',
		type: 'options',
		options: [
			{ name: 'Direct Put', value: 'DirectPut' },
			{ name: 'Kinesis Stream As Source', value: 'KinesisStreamAsSource' },
		],
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['create'],
			},
		},
		default: 'DirectPut',
		description: 'Delivery stream type',
	},
	{
		displayName: 'S3 Configuration',
		name: 's3Configuration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['create'],
			},
		},
		default: '{"RoleARN": "arn:aws:iam::account:role/firehose-role", "BucketARN": "arn:aws:s3:::my-bucket"}',
		description: 'S3 destination configuration as JSON',
	},
	{
		displayName: 'Redshift Configuration',
		name: 'redshiftConfiguration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Redshift destination configuration as JSON (optional)',
	},
	{
		displayName: 'Elasticsearch Configuration',
		name: 'elasticsearchConfiguration',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Elasticsearch destination configuration as JSON (optional)',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['create'],
			},
		},
		default: '[]',
		description: 'Tags as array of {Key, Value} objects',
	},
	// Delete operation
	{
		displayName: 'Allow Force Delete',
		name: 'allowForceDelete',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['delete'],
			},
		},
		default: false,
		description: 'Whether to allow force deletion even if stream is not empty',
	},
	// Describe operation
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['describe'],
			},
		},
		default: 10,
		description: 'Maximum number of destinations to describe',
	},
	{
		displayName: 'Exclusive Start Destination ID',
		name: 'exclusiveStartDestinationId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['describe'],
			},
		},
		default: '',
		description: 'ID of the destination to start after for pagination',
	},
	// List operation
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['list'],
			},
		},
		default: 100,
		description: 'Maximum number of delivery streams to list',
	},
	{
		displayName: 'Exclusive Start Delivery Stream Name',
		name: 'exclusiveStartDeliveryStreamName',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Delivery stream name to start after for pagination',
	},
	{
		displayName: 'Delivery Stream Type Filter',
		name: 'deliveryStreamTypeFilter',
		type: 'options',
		options: [
			{ name: 'All', value: '' },
			{ name: 'Direct Put', value: 'DirectPut' },
			{ name: 'Kinesis Stream As Source', value: 'KinesisStreamAsSource' },
		],
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['list'],
			},
		},
		default: '',
		description: 'Filter by delivery stream type',
	},
	// Put Record operation
	{
		displayName: 'Data',
		name: 'data',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['putRecord'],
			},
		},
		default: '',
		description: 'Data to send (base64 encoded)',
	},
	// Put Record Batch operation
	{
		displayName: 'Records',
		name: 'records',
		type: 'json',
		required: true,
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['putRecordBatch'],
			},
		},
		default: '[{"Data": "base64-encoded-data"}]',
		description: 'Array of records with Data field (base64 encoded)',
	},
	// Start Encryption operation
	{
		displayName: 'Encryption Config',
		name: 'encryptionConfig',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['startEncryption'],
			},
		},
		default: '{"KeyType": "AWS_OWNED_CMK"}',
		description: 'Encryption configuration (KeyType: AWS_OWNED_CMK or CUSTOMER_MANAGED_CMK, KeyARN for CMK)',
	},
	// Update Destination operation
	{
		displayName: 'Current Version ID',
		name: 'currentVersionId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['updateDestination'],
			},
		},
		default: '',
		description: 'Current version ID of the delivery stream',
	},
	{
		displayName: 'Destination ID',
		name: 'destinationId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['updateDestination'],
			},
		},
		default: '',
		description: 'ID of the destination to update',
	},
	{
		displayName: 'S3 Destination Update',
		name: 's3DestinationUpdate',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['deliveryStream'],
				operation: ['updateDestination'],
			},
		},
		default: '{}',
		description: 'S3 destination update configuration as JSON',
	},
];
