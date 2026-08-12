import type { INodeProperties } from 'n8n-workflow';

import * as create from './create';
import * as get from './get';
import * as getAll from './getAll';
import * as update from './update';

export { create, get, getAll, update };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['employee'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an employee',
				action: 'Create an employee',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an employee',
				action: 'Get an employee',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many employees',
				action: 'Get many employees',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an employee',
				action: 'Update an employee',
			},
		],
		default: 'create',
	},
	...create.description,
	...get.description,
	...getAll.description,
	...update.description,
];
