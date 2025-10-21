import type { INodeProperties } from 'n8n-workflow';

export const tableOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new table',
				action: 'Create a table',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.CreateTable',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
							TableName: '={{ $parameter["tableName"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a table',
				action: 'Delete a table',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.DeleteTable',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
							TableName: '={{ $parameter["tableName"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a table',
				action: 'Describe a table',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.DescribeTable',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
							TableName: '={{ $parameter["tableName"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all tables in a database',
				action: 'List tables',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.ListTables',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update table settings',
				action: 'Update a table',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.UpdateTable',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
							TableName: '={{ $parameter["tableName"] }}',
						},
					},
				},
			},
			{
				name: 'Write Records',
				value: 'writeRecords',
				description: 'Write time series records',
				action: 'Write records',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.WriteRecords',
						},
						body: {
							DatabaseName: '={{ $parameter["databaseName"] }}',
							TableName: '={{ $parameter["tableName"] }}',
							Records: '={{ $parameter["records"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const tableFields: INodeProperties[] = [
	{
		displayName: 'Database Name',
		name: 'databaseName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['table'],
			},
		},
		default: '',
		description: 'The name of the database',
	},
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['create', 'delete', 'describe', 'update', 'writeRecords'],
			},
		},
		default: '',
		description: 'The name of the table',
	},
	{
		displayName: 'Records',
		name: 'records',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['writeRecords'],
			},
		},
		default: '',
		description: 'Time series records as JSON array',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['create', 'update'],
			},
		},
		options: [
			{
				displayName: 'Retention Properties',
				name: 'RetentionProperties',
				type: 'string',
				default: '',
				description: 'Retention settings as JSON (e.g., {"MemoryStoreRetentionPeriodInHours":24,"MagneticStoreRetentionPeriodInDays":365})',
			},
			{
				displayName: 'Tags',
				name: 'Tags',
				type: 'string',
				default: '',
				description: 'Tags as JSON array',
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
				resource: ['table'],
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['table'],
				operation: ['writeRecords'],
			},
		},
		options: [
			{
				displayName: 'Common Attributes',
				name: 'CommonAttributes',
				type: 'string',
				default: '',
				description: 'Common attributes for all records as JSON',
			},
		],
	},
];
