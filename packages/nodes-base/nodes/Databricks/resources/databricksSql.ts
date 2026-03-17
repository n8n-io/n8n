import type { INodeProperties } from 'n8n-workflow';

export const databricksSqlOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['databricksSql'],
		},
	},
	options: [
		{
			name: 'Execute Query',
			value: 'executeQuery',
			description: 'Execute a SQL query',
			action: 'Execute a SQL query',
		},
		{
			name: 'List Tables',
			value: 'listTables',
			description: 'List available tables',
			action: 'List available tables',
		},
	],
	default: 'executeQuery',
};

export const databricksSqlParameters: INodeProperties[] = [
	{
		displayName: 'Warehouse ID',
		name: 'warehouseId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the SQL warehouse to use',
		displayOptions: {
			show: {
				resource: ['databricksSql'],
			},
		},
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: ['executeQuery'],
			},
		},
		default: '',
		placeholder: 'SELECT * FROM my_table LIMIT 10',
		required: true,
		description: 'SQL query to execute',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['databricksSql'],
			},
		},
		options: [
			{
				displayName: 'Catalog',
				name: 'catalog',
				type: 'string',
				default: '',
				description: 'The catalog to use for the query',
			},
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				default: '',
				description: 'The schema to use for the query',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 60,
				description: 'Query timeout in seconds',
			},
		],
	},
];
