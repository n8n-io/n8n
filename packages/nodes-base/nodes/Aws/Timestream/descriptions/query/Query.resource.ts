import type { INodeProperties } from 'n8n-workflow';

export const queryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['query'],
			},
		},
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Execute a query',
				action: 'Execute a query',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'Timestream_20181101.Query',
						},
						body: {
							QueryString: '={{ $parameter["queryString"] }}',
						},
					},
				},
			},
		],
		default: 'execute',
	},
];

export const queryFields: INodeProperties[] = [
	{
		displayName: 'Query String',
		name: 'queryString',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['query'],
				operation: ['execute'],
			},
		},
		default: '',
		description: 'The query to execute (SQL-like syntax)',
		placeholder: 'SELECT * FROM "database"."table" WHERE time > ago(1h)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['query'],
				operation: ['execute'],
			},
		},
		options: [
			{
				displayName: 'Max Rows',
				name: 'MaxRows',
				type: 'number',
				default: 1000,
				description: 'Maximum number of rows to return',
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
