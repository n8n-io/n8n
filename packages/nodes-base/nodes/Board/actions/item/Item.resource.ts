import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteItem from './delete.operation';
import * as get from './get.operation';
import * as update from './update.operation';
import { BOARD_RESOURCE_LOCATOR_BASE } from '../../common/fields';

export { create, deleteItem, get, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['item'],
			},
		},
		options: [
			{
				name: 'Create',
				value: create.FIELD,
				description: 'Create a new item on the board',
				action: 'Create an item',
			},
			{
				name: 'Delete',
				value: deleteItem.FIELD,
				description: 'Delete an item from the board',
				action: 'Delete an item',
			},
			{
				name: 'Get',
				value: get.FIELD,
				description: 'Get items from the board',
				action: 'Get items',
			},
			{
				name: 'Update',
				value: update.FIELD,
				description: 'Update an item on the board',
				action: 'Update an item',
			},
		],
		default: 'get',
	},
	{
		...BOARD_RESOURCE_LOCATOR_BASE,
		displayOptions: { show: { resource: ['item'] } },
	},
	...create.description,
	...deleteItem.description,
	...get.description,
	...update.description,
];
