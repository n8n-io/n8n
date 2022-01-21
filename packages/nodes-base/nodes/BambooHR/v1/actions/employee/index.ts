import * as create from './create';
import * as get from './get';
import * as getAll from './getAll';
import * as update from './update';

import {
	INodeProperties,
} from 'n8n-workflow';

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
					'employee',
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
				description: 'Get an employee',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all employees',
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
