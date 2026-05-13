import type { INodeProperties } from 'n8n-workflow';

import * as add from './add.operation';
import * as deleteStatus from './delete.operation';
import * as list from './list.operation';
import * as rename from './rename.operation';
import * as reorder from './reorder.operation';
import { BOARD_RESOURCE_LOCATOR_BASE } from '../../common/fields';

export { add, deleteStatus, list, rename, reorder };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['status'],
			},
		},
		options: [
			{
				name: 'Add',
				value: add.FIELD,
				description: 'Add a new status to the board',
				action: 'Add a status',
			},
			{
				name: 'Delete',
				value: deleteStatus.FIELD,
				description: 'Delete a status from the board',
				action: 'Delete a status',
			},
			{
				name: 'List',
				value: list.FIELD,
				description: 'List all statuses on the board',
				action: 'List statuses',
			},
			{
				name: 'Rename',
				value: rename.FIELD,
				description: 'Rename a status on the board',
				action: 'Rename a status',
			},
			{
				name: 'Reorder',
				value: reorder.FIELD,
				description: 'Reorder the statuses on the board',
				action: 'Reorder statuses',
			},
		],
		default: 'list',
	},
	{
		...BOARD_RESOURCE_LOCATOR_BASE,
		displayOptions: { show: { resource: ['status'] } },
	},
	...add.description,
	...deleteStatus.description,
	...list.description,
	...rename.description,
	...reorder.description,
];
