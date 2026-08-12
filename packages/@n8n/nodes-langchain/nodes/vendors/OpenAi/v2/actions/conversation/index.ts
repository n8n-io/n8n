import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as get from './get.operation';
import * as remove from './remove.operation';
import * as update from './update.operation';

export { create, get, remove, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a conversation',
				description: 'Create a conversation',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a conversation',
				description: 'Get a conversation',
			},
			{
				name: 'Remove',
				value: 'remove',
				action: 'Remove a conversation',
				description: 'Remove a conversation',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a conversation',
				description: 'Update a conversation',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['conversation'],
			},
		},
	},
	...create.description,
	...remove.description,
	...update.description,
	...get.description,
];
