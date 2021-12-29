import * as create from './create';
import * as get from './get';
import * as getAll from './getAll';
import * as update from './update';

import { INodeProperties } from 'n8n-workflow';

export {
	create,
	get,
	getAll,
	update
};


export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'employees',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an employee',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get basic employee information',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Gets all employee directory.',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an employee',
			},
		],
		default: 'create',
		description: '',
	},
	...create.description,
	...get.description,
	...getAll.description,
	...update.description,
];
