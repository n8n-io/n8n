import type { INodeProperties } from 'n8n-workflow';

import * as append from './append.operation';
import * as create from './create.operation';
import * as get from './get.operation';
import * as update from './update.operation';

export { append, create, get, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['page'],
			},
		},
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Append content to the bottom of an existing page',
				action: 'Append content to a page',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new page in a space',
				action: 'Create a page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a page, optionally with its full sub-tree',
				action: 'Get a page',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Replace the title and body of an existing page',
				action: 'Update a page',
			},
		],
		default: 'create',
	},
	...append.description,
	...create.description,
	...get.description,
	...update.description,
];
