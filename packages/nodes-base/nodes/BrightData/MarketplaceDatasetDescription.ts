import { INodeProperties } from 'n8n-workflow';

// When the resource `` is selected, this `operation` parameter will be shown.
export const marketplaceDatasetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
			},
		},
		options: [
			{
				name: 'Deliver Snapshot',
				value: 'deliverSnapshot',
				action: 'Deliver the dataset snapshot',
				routing: {
					request: {
						method: 'POST',
						url: '/datasets/snapshots/{{$parameter["snapshot_id"]}}/deliver',
					},
				},
			},

			{
				name: 'Filter Dataset',
				value: 'filterDataset',
				action: 'Create a dataset snapshot based on a provided filter',
				routing: {
					request: {
						method: 'POST',
						url: '/datasets/filter',
						body: {
							records_limit: '={{$parameter["records_limit"]}}',
							filter: '={{$parameter["filter"]}}',
							dataset_id: '={{$parameter["dataset_id"]}}',
						},
					},
				},
			},
			{
				name: 'Get Dataset Metadata',
				value: 'getDatasetMetadata',
				action: 'Retrieve detailed metadata for a specific dataset',
				routing: {
					request: {
						method: 'GET',
						url: '=/datasets/{{$parameter["dataset_id"]}}/metadata',
					},
				},
			},
			{
				name: 'Get Snapshot Content',
				value: 'getSnapshotContent',
				action: 'Get dataset snapshot content',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/snapshots/{{$parameter["snapshot_id"]}}/content',
						qs: {
							format: '={{$parameter["format"]}}',
							compress: '={{$parameter["compress"] || false}}',
							batch_size: '={{$parameter["batch_size"]}}',
							part: '={{$parameter["part"]}}',
						},
					},
				},
			},
			{
				name: 'Get Snapshot Metadata',
				value: 'getSnapshotMetadata',
				action: 'Get dataset snapshot metadata',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/snapshots/{{$parameter["snapshot_id"]}}/metadata',
					},
				},
			},
			{
				name: 'Get Snapshot Parts',
				value: 'getSnapshotParts',
				action: 'Get dataset snapshot delivery parts',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/snapshots/{{$parameter["snapshot_id"]}}/parts',
					},
				},
			},

			{
				name: 'List Datasets',
				value: 'listDatasets',
				action: 'Retrieve a list of available datasets',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/list',
					},
				},
			},

			{
				name: 'List Snapshots',
				value: 'listSnapshots',
				action: 'Get dataset snapshots',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/snapshots',
					},
				},
			},
		],
		default: 'listDatasets',
	},
];

// Here we define what to show when the `get` operation is selected.
// We do that by adding `operation: ["get"]` to `displayOptions.show`
const marketplaceDatasetParameters: INodeProperties[] = [
	{
		displayName: 'Dataset',
		name: 'dataset_id',
		type: 'resourceLocator',
		default: {
			mode: 'list',
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a DataSet ...',
				typeOptions: {
					searchListMethod: 'getDataSets',
					searchable: true,
				},
			},
		],
		required: true,
		description: 'Select the DataSet',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['getDatasetMetadata', 'filterDataset', 'listSnapshots'],
			},
		},
	},

	{
		displayName: 'View',
		name: 'view_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['listSnapshots'],
			},
		},
		description: 'The ID of the view to filter the snapshots',
	},

	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'ready',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['listSnapshots'],
			},
		},
		options: [
			{
				name: 'Building',
				value: 'building',
			},
			{
				name: 'Canceled',
				value: 'canceled',
			},
			{
				name: 'Collecting',
				value: 'collecting',
			},
			{
				name: 'Delivering',
				value: 'delivering',
			},
			{
				name: 'Digesting',
				value: 'digesting',
			},
			{
				name: 'Failed',
				value: 'failed',
			},
			{
				name: 'Pending Developer Review',
				value: 'pending_developer_review',
			},
			{
				name: 'Pending Discovery Input',
				value: 'pending_discovery_input',
			},
			{
				name: 'Pending Owner Review',
				value: 'pending_owner_review',
			},
			{
				name: 'Pending PDP Input',
				value: 'pending_pdp_input',
			},
			{
				name: 'Queued For Developer Review',
				value: 'queued_for_developer_review',
			},
			{
				name: 'Ready',
				value: 'ready',
			},
			{
				name: 'Rolling Back',
				value: 'rolling_back',
			},
			{
				name: 'Scheduled',
				value: 'scheduled',
			},
			{
				name: 'Validating',
				value: 'validating',
			},
		],
		description: 'The status of the snapshot to filter the snapshots',
	},

	{
		displayName: 'Snapshot ID',
		name: 'snapshot_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: [
					'getSnapshotMetadata',
					'getSnapshotParts',
					'getSnapshotContent',
					'deliverSnapshot',
				],
			},
		},
		required: true,
		description: 'The ID of the snapshot to operate on',
	},

	{
		displayName: 'Records Limit',
		name: 'records_limit',
		type: 'number',
		default: 100,
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
			},
		},
		description: 'The maximum number of records to include in the snapshot',
	},

	{
		displayName: 'Compress',
		name: 'compress',
		type: 'boolean',
		default: false,
		description: 'Whether compress the response in gzip format',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['getSnapshotContent'],
			},
		},
		routing: {
			request: {
				qs: {
					compress: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Batch Size',
		name: 'batch_size',
		type: 'number',
		default: 1000,
		description: 'Number of records to include in each response batch',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['getSnapshotContent'],
			},
		},
		routing: {
			request: {
				qs: {
					batch_size: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Part',
		name: 'part',
		type: 'number',
		default: 1,
		description: 'Number of batch to return. The numbering starts from 1.',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['getSnapshotContent'],
			},
		},
		routing: {
			request: {
				qs: {
					part: '={{$value}}',
				},
			},
		},
	},

	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'JSONL',
				value: 'jsonl',
			},
			{
				name: 'CSV',
				value: 'csv',
			},
		],
		default: 'json',
		description: 'Format of the response. Available options: JSON, JSONL, CSV.',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['getSnapshotContent'],
			},
		},
	},

	{
		displayName: 'Filter Type',
		name: 'filter_type',
		type: 'options',
		options: [
			{
				name: 'Group Filters',
				value: 'filters_group',
			},
			{
				name: 'Single Filter',
				value: 'filter_single',
			},
			// {
			// 	name: 'CSV Filter',
			// 	value: 'csv_filter',
			// },
			// {
			// 	name: 'JSON Filter',
			// 	value: 'json_filter',
			// },
		],
		default: 'filter_single',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
			},
		},
		description:
			'Type of filter to apply. Simple filter or multiple filter (using "and" with filters array).',
	},

	{
		displayName: 'Field Name',
		name: 'field_name',
		type: 'string',
		default: '',

		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
				filter_type: ['filter_single'],
			},
		},
		description: 'Field name to filter on',
		routing: {
			request: {
				body: {
					filter: {
						name: '={{$parameter["field_name"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Operator',
		name: 'field_operator',
		type: 'options',
		options: [
			{
				name: 'Array Includes',
				value: 'array_includes',
			},
			{
				name: 'Equals',
				value: '=',
			},
			{
				name: 'Greater Than',
				value: '>',
			},
			{
				name: 'Greater Than or Equal To',
				value: '>=',
			},
			{
				name: 'In',
				value: 'in',
			},
			{
				name: 'Includes',
				value: 'includes',
			},
			{
				name: 'Less Than',
				value: '<',
			},
			{
				name: 'Less Than or Equal To',
				value: '<=',
			},
			{
				name: 'Not Array Includes',
				value: 'not_array_includes',
			},
			{
				name: 'Not Equals',
				value: '!=',
			},
			{
				name: 'Not In',
				value: 'not_in',
			},
			{
				name: 'Not Includes',
				value: 'not_includes',
			},
		],
		default: '=',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
				filter_type: ['filter_single'],
			},
		},
		description: 'Operator to use for the filter',
		routing: {
			request: {
				body: {
					filter: {
						operator: '={{$parameter["field_operator"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Field Value',
		name: 'field_value',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
				filter_type: ['filter_single'],
			},
		},
		description: 'Value to filter on',
		routing: {
			request: {
				body: {
					filter: {
						value: '={{$parameter["field_value"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Filters Group',
		name: 'filters_group',
		type: 'json',
		typeOptions: {
			rows: 4,
		},
		placeholder:
			'Enter filter JSON. E.g.: {"name": "name", "operator": "=", "value": "John"} or {"operator": "and", "filters": [ {"name": "name", "operator": "=", "value": "John"}, {"name": "age", "operator": ">", "value": "30"} ] }',
		default: '{"operator":"","filters":[{"name":"","operator":"","value":""}]}',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
				filter_type: ['filters_group'],
			},
		},
		description:
			'JSON filter. Supports a simple filter or a composite filter (using "and" with filters array).',
		routing: {
			request: {
				body: {
					filter_type: '={{$value}}',
				},
			},
		},
	},

	{
		displayName: 'CSV Filter',
		name: 'csv_filter',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		default: 'industries:value\nAccounting\nAd Network\nAdvertising\n',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
				filter_type: ['csv_filter'],
			},
		},
		routing: {
			request: {
				body: {
					filter_type: '={{$value}}',
				},
			},
		},
	},

	{
		displayName: 'JSON Filter',
		name: 'json_filter',
		type: 'json',
		default:
			'[{"industries:value": "Accounting"},{"industries:value": "Ad Network"},{"industries:value": "Advertising"}]',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['filterDataset'],
				filter_type: ['json_filter'],
			},
		},
		routing: {
			request: {
				body: {
					filter_type: '={{$value}}',
				},
			},
		},
	},

	// Deliver Snapshot
	{
		displayName: 'Deliver Type',
		name: 'deliver_type',
		type: 'options',
		options: [
			{
				name: 'Aliyun Object Storage Service',
				value: 'ali_oss',
			},
			{
				name: 'Amazon S3',
				value: 's3',
			},
			{
				name: 'Google Cloud PubSub',
				value: 'gcs_pubsub',
			},
			{
				name: 'Google Cloud Storage',
				value: 'gcs',
			},
			{
				name: 'Microsoft Azure',
				value: 'azure',
			},
			{
				name: 'SFTP',
				value: 'sftp',
			},
			{
				name: 'Snowflake',
				value: 'snowflake',
			},
			{
				name: 'Webhook',
				value: 'webhook',
			},
		],
		default: 's3',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						type: '={{$parameter["deliver_type"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Webhook Endpoint',
		name: 'endpoint',
		type: 'string',
		default: '',
		description: 'Webhook URL to deliver the snapshot',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['webhook'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						endpoint: '={{$parameter["endpoint"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Filename Template',
		name: 'filename_template',
		type: 'string',
		default: '',
		description: 'Template for the filename, including placeholders',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: [
					'webhook',
					'ali_oss',
					'gcs_pubsub',
					'gcs',
					's3',
					'azure',
					'sftp',
					'snowflake',
				],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						filename: {
							template: '={{$parameter["filename_template"]}}',
						},
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'File Extension',
		name: 'filename_extension',
		type: 'options',
		options: [
			{
				name: 'JSON',
				value: 'json',
			},
			{
				name: 'JSONL',
				value: 'jsonl',
			},
			{
				name: 'CSV',
				value: 'csv',
			},
		],
		default: 'json',
		description: 'Extension for the delivered file (JSON, JSONL, CSV)',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: [
					'webhook',
					'ali_oss',
					'gcs_pubsub',
					'gcs',
					's3',
					'azure',
					'sftp',
					'snowflake',
				],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						type: 'webhook',
						filename: {
							extension: '={{$parameter["filename_extension"]}}',
						},
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Topic ID',
		name: 'topic_id',
		type: 'string',
		default: '',
		description: 'Google PubSub topic ID',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['gcs_pubsub'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						topic_id: '={{$parameter["topic_id"]}}',
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Client Email',
		name: 'client_email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['gcs_pubsub', 'gcs'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							client_email: '={{$parameter["client_email"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'Private Key',
		name: 'private_key',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['gcs_pubsub', 'gcs'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							private_key: '={{$parameter["private_key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Attributes',
		name: 'attributes',
		type: 'json',
		default: '',
		description: 'Attributes to include in the PubSub message',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['gcs_pubsub'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						attributes: '={{$parameter["attributes"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Container',
		name: 'container',
		type: 'string',
		default: '',
		description: 'Name of the Azure container',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['azure'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						container: '={{$parameter["container"]}}',
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Bucket',
		name: 'bucket',
		type: 'string',
		default: '',
		description: 'Name of the bucket',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3', 'ali_oss', 'gcs'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						bucket: '={{$parameter["bucket"]}}',
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'AWS Access Key',
		name: 'aws-access-key',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3'],
			},
		},
		description: 'AWS Access Key ID',
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							'aws-access-key': '={{$parameter["aws-access-key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'AWS Secret Key',
		name: 'aws-secret-key',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3'],
			},
		},
		description: 'AWS Secret Access Key',
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							'aws-secret-key': '={{$parameter["aws-secret-key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'Access Key',
		name: 'aws-access-key',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['ali_oss'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							'access-key': '={{$parameter["access-key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'Secret Key',
		name: 'secret-key',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['ali_oss'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							'secret-key': '={{$parameter["secret-key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Account',
		name: 'account',
		type: 'string',
		default: '',
		description: 'Azure storage account',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['azure'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							account: '={{$parameter["account"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'Key',
		name: 'key',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description: 'Azure storage key',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['azure'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							key: '={{$parameter["key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'SAS Token',
		name: 'sas_token',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description: 'Azure SAS token for access',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['azure'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							sas_token: '={{$parameter["sas_token"]}}',
						},
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Role ARN',
		name: 'role_arn',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							role_arn: '={{$parameter["role_arn"]}}',
						},
					},
				},
			},
		},
	},
	{
		displayName: 'External ID',
		name: 'external_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							external_id: '={{$parameter["external_id"]}}',
						},
					},
				},
			},
		},
	},

	{
		displayName: 'Directory',
		name: 'directory',
		type: 'string',
		default: '',
		description: 'Target path',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3', 'ali_oss', 'gcs', 'azure', 'sftp', 'snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						directory: '={{$parameter["directory"]}}',
					},
				},
			},
		},
	},

	{
		displayName: 'Region',
		name: 'region',
		type: 'string',
		default: '',
		description: 'AWS Region',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['s3', 'ali_oss'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						region: '={{$parameter["region"]}}',
					},
				},
			},
		},
	},

	//specific properties for sftp

	{
		displayName: 'Host',
		name: 'host',
		type: 'string',
		default: '',
		description: 'SFTP server host',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						host: '={{$parameter["host"]}}',
					},
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Port',
		name: 'port',
		type: 'number',
		default: 22,
		description: 'SFTP server port',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						port: '={{$parameter["port"]}}',
					},
				},
			},
		},
	},
	{
		displayName: 'Path',
		name: 'path',
		type: 'string',
		default: '',
		description: 'Remote path on the SFTP server to store the file',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						path: '={{$parameter["path"]}}',
					},
				},
			},
		},
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		description: 'SFTP username',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							username: '={{$parameter["username"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description: 'SFTP password',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							password: '={{$parameter["password"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'SSH Key',
		name: 'ssh_key',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description: 'SSH key for SFTP authentication',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							ssh_key: '={{$parameter["ssh_key"]}}',
						},
					},
				},
			},
		},
		required: true,
	},
	{
		displayName: 'Passphrase',
		name: 'passphrase',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		description: 'Passphrase for the SSH key, if any',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['sftp'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							passphrase: '={{$parameter["passphrase"]}}',
						},
					},
				},
			},
		},
	},

	//specific properties for snowflake
	{
		displayName: 'Database',
		name: 'database',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						database: '={{$parameter["database"]}}',
					},
				},
			},
		},
		required: true,
		description: 'Snowflake database name',
	},
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						schema: '={{$parameter["schema"]}}',
					},
				},
			},
		},
		required: true,
		description: 'Snowflake schema name',
	},
	{
		displayName: 'Stage',
		name: 'stage',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						stage: '={{$parameter["stage"]}}',
					},
				},
			},
		},
		required: true,
		description: 'Snowflake stage name',
	},
	{
		displayName: 'Role',
		name: 'role',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						role: '={{$parameter["role"]}}',
					},
				},
			},
		},
		required: true,
		description: 'Snowflake role',
	},
	{
		displayName: 'Warehouse',
		name: 'warehouse',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						warehouse: '={{$parameter["warehouse"]}}',
					},
				},
			},
		},
		required: true,
		description: 'Snowflake warehouse',
	},
	{
		displayName: 'Account',
		name: 'credentials.account',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							account: '={{$parameter["credentials.account"]}}',
						},
					},
				},
			},
		},
		required: true,
		description: 'Snowflake account',
	},
	{
		displayName: 'User',
		name: 'credentials.user',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							user: '={{$parameter["credentials.user"]}}',
						},
					},
				},
			},
		},
		required: true,
		description: 'Snowflake user',
	},
	{
		displayName: 'Password',
		name: 'credentials.password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
				deliver_type: ['snowflake'],
			},
		},
		routing: {
			request: {
				body: {
					deliver: {
						credentials: {
							password: '={{$parameter["credentials.password"]}}',
						},
					},
				},
			},
		},
		required: true,
		description: 'Snowflake password',
	},

	{
		displayName: 'Compress',
		name: 'compress',
		type: 'boolean',
		default: false,
		description: 'Whether compress the response in gzip format',
		displayOptions: {
			show: {
				resource: ['marketplaceDataset'],
				operation: ['deliverSnapshot'],
			},
		},
		routing: {
			request: {
				body: {
					compress: '={{$parameter["compress"]}}',
				},
			},
		},
	},
];

export const marketplaceDatasetFields: INodeProperties[] = [...marketplaceDatasetParameters];
