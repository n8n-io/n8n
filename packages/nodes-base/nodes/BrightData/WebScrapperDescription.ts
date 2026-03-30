import { INodeProperties } from 'n8n-workflow';

// When the resource `` is selected, this `operation` parameter will be shown.
export const webScrapperOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['webScrapper'],
			},
		},
		options: [
			{
				name: 'Deliver Snapshot',
				value: 'deliverSnapshot',
				action: 'Deliver the snapshot content to the specified storage',
				routing: {
					request: {
						method: 'POST',
						url: '/datasets/v3/deliver/{{$parameter["snapshot_id"]}}',
					},
				},
			},
			{
				name: 'Get Snapshots',
				value: 'getSnapshots',
				action: 'Get filtered snapshots',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/v3/snapshots',
						qs: {
							dataset_id: '={{$parameter["dataset_id"]}}',
						},
					},
				},
			},

			{
				name: 'Monitor Progress Snapshot',
				value: 'monitorProgressSnapshot',
				action: 'Monitor the progress of a snapshot',
				routing: {
					request: {
						method: 'GET',
						url: '/datasets/v3/progress/{{$parameter["snapshot_id"]}}',
					},
				},
			},

			{
				name: 'Scrape By URL',
				value: 'scrapeByUrl',
				action: 'Scrape data synchronously by URL',
				routing: {
					request: {
						method: 'POST',
						url: '/datasets/v3/scrape',
						qs: {
							dataset_id: '={{$parameter["dataset_id"]}}',
						},
					},
				},
			},
			{
				name: 'Trigger Collection By URL',
				value: 'triggerCollectionByUrl',
				action: 'Trigger a collection and generate a snapshot by URL',
				routing: {
					request: {
						method: 'POST',
						url: '/datasets/v3/trigger',
						qs: {
							dataset_id: '={{$parameter["dataset_id"]}}',
						},
					},
				},
			},
		],
		default: 'scrapeByUrl',
	},
];

// Here we define what to show when the `get` operation is selected.
// We do that by adding `operation: ["get"]` to `displayOptions.show`
const webScrapperParameters: INodeProperties[] = [
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
				resource: ['webScrapper'],
				operation: ['getSnapshots', 'scrapeByUrl', 'triggerCollectionByUrl'],
			},
		},
	},

	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 'ready',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['getSnapshots'],
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
		displayName: 'Skip',
		name: 'skip',
		type: 'number',
		default: 0,
		description: 'Number of snapshots to skip',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['getSnapshots'],
			},
		},
		routing: {
			request: {
				qs: {
					skip: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['getSnapshots'],
			},
		},
		routing: {
			request: {
				qs: {
					limit: '={{$value}}',
				},
			},
		},
	},
	{
		displayName: 'From Date',
		name: 'from_date',
		type: 'dateTime',
		default: '',
		description: 'Start date to filter snapshots (ISO 8601 format)',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['getSnapshots'],
			},
		},
		routing: {
			request: {
				qs: {
					from_date: '={{$value}}',
				},
			},
		},
		required: true,
	},
	{
		displayName: 'To Date',
		name: 'to_date',
		type: 'dateTime',
		default: '',
		description: 'End date to filter snapshots (ISO 8601 format)',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['getSnapshots'],
			},
		},
		routing: {
			request: {
				qs: {
					to_date: '={{$value}}',
				},
			},
		},
		required: true,
	},

	{
		displayName: 'Snapshot ID',
		name: 'snapshot_id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['monitorProgressSnapshot', 'deliverSnapshot'],
			},
		},
		required: true,
		description: 'The ID of the snapshot to operate on',
	},

	{
		displayName: 'URLs',
		name: 'urls',
		type: 'json',
		default: '[{"url":"https://www.linkedin.com/in/bulentakar"}]',
		description: 'The URLs to trigger the snapshot',
		required: true,
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['triggerCollectionByUrl', 'scrapeByUrl'],
			},
		},
		routing: {
			send: {
				type: 'body',
			},
		},
	},

	{
		displayName: 'Include Errors',
		name: 'include_errors',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['scrapeByUrl'],
			},
		},
		required: true,
		description: 'Whether to include errors in the response',
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
				name: 'CSV',
				value: 'csv',
			},
		],
		default: 'json',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['scrapeByUrl'],
			},
		},
		description: 'The format of the data to be returned',
	},

	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		default: 'https://brightdata-test.free.beeceptor.com',
		description: 'The endpoint to send the data obtained from the snapshot',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['triggerCollectionByUrl'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'endpoint',
			},
		},
	},

	{
		displayName: 'Notify',
		name: 'notify',
		type: 'string',
		default: '',
		description: 'The URL to notify when the collection is finished',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['triggerCollectionByUrl'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'notify',
			},
		},
	},

	{
		displayName: 'Notify',
		name: 'notify',
		type: 'string',
		default: '',
		description: 'URL where a notification will be sent once the delivery is finished',
		displayOptions: {
			show: {
				resource: ['webScrapper'],
				operation: ['deliverSnapshot'],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'notify',
			},
		},
	},

	/* Properties for deliveSnapshot */

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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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
				resource: ['webScrapper'],
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

export const webScrapperFields: INodeProperties[] = [...webScrapperParameters];
