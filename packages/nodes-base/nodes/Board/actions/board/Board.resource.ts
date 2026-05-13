import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteBoard from './delete.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import { BOARD_RESOURCE_LOCATOR_BASE } from '../../common/fields';

export { create, deleteBoard, get, list };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['board'],
			},
		},
		options: [
			{
				name: 'Create',
				value: create.FIELD,
				description: 'Create a new board',
				action: 'Create a board',
			},
			{
				name: 'Delete',
				value: deleteBoard.FIELD,
				description: 'Delete a board',
				action: 'Delete a board',
			},
			{
				name: 'Get',
				value: get.FIELD,
				description: 'Get a board',
				action: 'Get a board',
			},
			{
				name: 'List',
				value: list.FIELD,
				description: 'List all boards',
				action: 'List boards',
			},
		],
		default: 'list',
	},
	{
		...BOARD_RESOURCE_LOCATOR_BASE,
		displayOptions: {
			show: {
				resource: ['board'],
				operation: [deleteBoard.FIELD, get.FIELD],
			},
		},
	},
	...create.description,
	...deleteBoard.description,
	...get.description,
	...list.description,
];
