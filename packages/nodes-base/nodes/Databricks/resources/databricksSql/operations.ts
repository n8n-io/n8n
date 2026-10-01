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
			description: 'Execute a SQL query and wait for results',
			action: 'Execute a SQL query',
		},
	],
	default: 'executeQuery',
};
