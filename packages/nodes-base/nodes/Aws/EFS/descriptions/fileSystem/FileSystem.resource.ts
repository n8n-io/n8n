import type { INodeProperties } from 'n8n-workflow';

export const fileSystemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['fileSystem'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new file system',
				action: 'Create a file system',
				routing: {
					request: {
						method: 'POST',
						url: '/2015-02-01/file-systems',
						body: {
							CreationToken: '={{ $parameter["creationToken"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file system',
				action: 'Delete a file system',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/2015-02-01/file-systems/{{ $parameter["fileSystemId"] }}',
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a file system',
				action: 'Describe a file system',
				routing: {
					request: {
						method: 'GET',
						url: '=/2015-02-01/file-systems/{{ $parameter["fileSystemId"] }}',
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all file systems',
				action: 'List file systems',
				routing: {
					request: {
						method: 'GET',
						url: '/2015-02-01/file-systems',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update file system settings',
				action: 'Update a file system',
				routing: {
					request: {
						method: 'PUT',
						url: '=/2015-02-01/file-systems/{{ $parameter["fileSystemId"] }}',
					},
				},
			},
		],
		default: 'list',
	},
];

export const fileSystemFields: INodeProperties[] = [
	{
		displayName: 'File System ID',
		name: 'fileSystemId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fileSystem'],
				operation: ['delete', 'describe', 'update'],
			},
		},
		default: '',
		description: 'The ID of the file system',
	},
	{
		displayName: 'Creation Token',
		name: 'creationToken',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fileSystem'],
				operation: ['create'],
			},
		},
		default: '={{ $now.toISO() }}',
		description: 'Unique token for idempotent creation',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['fileSystem'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Performance Mode',
				name: 'PerformanceMode',
				type: 'options',
				options: [
					{ name: 'General Purpose', value: 'generalPurpose' },
					{ name: 'Max I/O', value: 'maxIO' },
				],
				default: 'generalPurpose',
				description: 'Performance mode of the file system',
			},
			{
				displayName: 'Throughput Mode',
				name: 'ThroughputMode',
				type: 'options',
				options: [
					{ name: 'Bursting', value: 'bursting' },
					{ name: 'Provisioned', value: 'provisioned' },
					{ name: 'Elastic', value: 'elastic' },
				],
				default: 'bursting',
				description: 'Throughput mode for the file system',
			},
			{
				displayName: 'Encrypted',
				name: 'Encrypted',
				type: 'boolean',
				default: false,
				description: 'Whether to encrypt the file system at rest',
			},
			{
				displayName: 'KMS Key ID',
				name: 'KmsKeyId',
				type: 'string',
				default: '',
				description: 'KMS key ID for encryption',
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
				resource: ['fileSystem'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Throughput Mode',
				name: 'ThroughputMode',
				type: 'options',
				options: [
					{ name: 'Bursting', value: 'bursting' },
					{ name: 'Provisioned', value: 'provisioned' },
					{ name: 'Elastic', value: 'elastic' },
				],
				default: 'bursting',
				description: 'Throughput mode for the file system',
			},
			{
				displayName: 'Provisioned Throughput In Mibps',
				name: 'ProvisionedThroughputInMibps',
				type: 'number',
				default: 1,
				description: 'Provisioned throughput in MiB/s',
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
				resource: ['fileSystem'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Items',
				name: 'MaxItems',
				type: 'number',
				default: 100,
				description: 'Maximum number of file systems to return',
			},
			{
				displayName: 'Marker',
				name: 'Marker',
				type: 'string',
				default: '',
				description: 'Marker for pagination',
			},
		],
	},
];
