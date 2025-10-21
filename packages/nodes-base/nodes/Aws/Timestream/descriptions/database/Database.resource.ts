import type { INodeProperties } from 'n8n-workflow';

export const databaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['database'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new database',
				action: 'Create a database',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.CreateDatabase',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a database',
				action: 'Delete a database',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.DeleteDatabase',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a database',
				action: 'Describe a database',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.DescribeDatabase',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all databases',
				action: 'List databases',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.ListDatabases',
						},
						body: {},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update database settings',
				action: 'Update a database',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.UpdateDatabase',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const databaseFields: INodeProperties[] = [
	{
		displayName: 'Database Name',
		name: 'databaseName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'delete', 'describe', 'update'],
			},
		},
		default: '',
		description: 'The name of the database',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['database'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'KMS Key ID',
				name: 'KmsKeyId',
				type: 'string',
				default: '',
				description: 'KMS key identifier for encryption',
			},
			{
				displayName: 'Tags',
				name: 'Tags',
				type: 'string',
				default: '',
				description: 'Tags as JSON array (e.g., [{"Key":"Environment","Value":"Production"}])',
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
				resource: ['database'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 100,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
		],
	},
];
