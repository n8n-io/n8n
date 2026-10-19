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
			name: 'Delete',
			value: 'deleteRows',
			description: 'Delete the rows that match the conditions',
			action: 'Delete rows',
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
		{
			name: 'Update',
			value: 'update',
			description: 'Update the rows that match a column',
			action: 'Update rows',
		},
	],
	default: 'getAll',
};
