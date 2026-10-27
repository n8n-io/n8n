import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';
import * as update from './update.operation';

export { create, del as delete, get, getMany, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['schedule'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a schedule',
				action: 'Create a schedule',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a schedule',
				action: 'Delete a schedule',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a schedule',
				action: 'Get a schedule',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve many schedules',
				action: 'Get many schedules',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a schedule',
				action: 'Update a schedule',
			},
		],
		default: 'getMany',
	},
	...create.description,
	...del.description,
	...get.description,
	...getMany.description,
	...update.description,
];
