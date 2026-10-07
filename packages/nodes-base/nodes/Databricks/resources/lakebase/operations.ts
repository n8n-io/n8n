import type { INodeProperties } from 'n8n-workflow';

export const lakebaseOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['lakebase'],
		},
	},
	options: [
		{
			name: 'Execute Function',
			value: 'executeFunction',
			description: 'Run a Postgres function in the schema',
			action: 'Execute a function',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			description: 'Get many rows from a table',
			action: 'Get many rows',
		},
		{
			name: 'Insert',
			value: 'insert',
			description: 'Insert a row into a table',
			action: 'Insert a row',
		},
	],
	default: 'getAll',
};
