import type { INodeProperties } from 'n8n-workflow';

export const sqlQueryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sqlQuery'],
			},
		},
		options: [
			{
				name: 'Execute',
				value: 'execute',
				description: 'Run a SQL statement and return the results',
				action: 'Execute a SQL statement',
			},
		],
		default: 'execute',
	},
];

export const sqlQueryFields: INodeProperties[] = [
	// ----------------------------------------
	//            sqlQuery: execute
	// ----------------------------------------
	{
		displayName: 'SQL Warehouse ID',
		name: 'warehouseId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the SQL warehouse to run the statement on',
		displayOptions: {
			show: {
				resource: ['sqlQuery'],
				operation: ['execute'],
			},
		},
	},
	{
		displayName: 'SQL Statement',
		name: 'statement',
		type: 'string',
		required: true,
		default: '',
		description: 'The SQL statement to execute',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				resource: ['sqlQuery'],
				operation: ['execute'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['sqlQuery'],
				operation: ['execute'],
			},
		},
		options: [
			{
				displayName: 'Catalog',
				name: 'catalog',
				type: 'string',
				default: '',
				description: 'Default catalog to use for the statement',
			},
			{
				displayName: 'Schema',
				name: 'schema',
				type: 'string',
				default: '',
				description: 'Default schema to use for the statement',
			},
			{
				displayName: 'Wait Timeout',
				name: 'waitTimeout',
				type: 'string',
				default: '50s',
				description:
					'Time to wait for statement completion before returning. Format: <code>0s</code> to <code>50s</code>. Use <code>0s</code> for fully asynchronous execution.',
				placeholder: '50s',
			},
		],
	},
];
