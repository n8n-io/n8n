import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteOperation from './delete.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as update from './update.operation';

export { create, deleteOperation as delete, get, list, update };

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
				action: 'Create a cached content',
				description: 'Create a new cached content resource',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a cached content',
				description: 'Delete a cached content resource',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a cached content',
				description: 'Get details of a cached content resource',
			},
			{
				name: 'List',
				value: 'list',
				action: 'List cached contents',
				description: 'List all cached content resources',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a cached content',
				description: 'Update a cached content resource',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['cache'],
			},
		},
	},
	...create.description,
	...deleteOperation.description,
	...get.description,
	...list.description,
	...update.description,
];
