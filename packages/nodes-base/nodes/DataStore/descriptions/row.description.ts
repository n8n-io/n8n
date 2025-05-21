import type { INodeProperties } from 'n8n-workflow';

import { tableRLC } from './common.descriptions';

export const rowOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['row'],
		},
	},
	options: [
		{
			name: 'Add',
			value: 'add',
			action: 'Add a row to a table',
		},
		{
			name: 'Get All',
			value: 'get',
			action: 'Gets all rows from a table',
		},
	],
	default: 'add',
};

export const rowDescriptions: INodeProperties[] = [
	{
		displayName: 'Row Payload',
		name: 'text',
		type: 'json',
		description: 'The row payload to add to the table in JSON format',
		default: '{}',
		displayOptions: {
			show: {
				resource: ['row'],
				operation: ['add'],
			},
		},
	},
	{ ...tableRLC, displayOptions: { show: { resource: ['row'] } } },
];
