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
			name: 'Create',
			value: 'create',
			action: 'Create a table',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a table',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a table',
		},
		// {
		// 	name: 'Update',
		// 	value: 'update',
		// 	action: 'Update a table',
		// },
	],
	default: 'create',
};

export const rowDescriptions: INodeProperties[] = [
	{ ...tableRLC, displayOptions: { show: { resource: ['row'] } } },
];
