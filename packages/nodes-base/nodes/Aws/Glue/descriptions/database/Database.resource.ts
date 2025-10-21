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
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.CreateDatabase',
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
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.DeleteDatabase',
						},
						body: {
							Name: '={{ $parameter["databaseName"] }}',
						},
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get details about a database',
				action: 'Get a database',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetDatabase',
						},
						body: {
							Name: '={{ $parameter["databaseName"] }}',
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
						url: '/',
						headers: {
							'X-Amz-Target': 'AWSGlue.GetDatabases',
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
				operation: ['create', 'get', 'delete'],
			},
		},
		default: '',
		description: 'Name of the database',
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
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'Database description',
				routing: {
					request: {
						body: {
							DatabaseInput: {
								Name: '={{ $parameter["databaseName"] }}',
								Description: '={{ $value }}',
							},
						},
					},
				},
			},
			{
				displayName: 'Location URI',
				name: 'LocationUri',
				type: 'string',
				default: '',
				description: 'S3 location URI',
				routing: {
					request: {
						body: {
							DatabaseInput: {
								Name: '={{ $parameter["databaseName"] }}',
								LocationUri: '={{ $value }}',
							},
						},
					},
				},
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
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				default: 100,
				description: 'Maximum number of results',
				routing: {
					request: {
						body: {
							MaxResults: '={{ $value }}',
						},
					},
				},
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Pagination token',
				routing: {
					request: {
						body: {
							NextToken: '={{ $value }}',
						},
					},
				},
			},
		],
	},
];
