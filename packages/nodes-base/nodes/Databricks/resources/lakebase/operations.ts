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
			name: 'Get Many',
			value: 'getAll',
			description: 'Get many rows from a table',
			action: 'Get many rows',
		},
	],
	default: 'getAll',
};
