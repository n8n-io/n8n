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


export const descriptions = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tabularData',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Adds a table row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Gets table rows for a given employee and table combination',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Gets all updated employee table data',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Updates a table row',
			},
		],
		default: 'create',
		description: '',
	},
	...create.description,
	...get.description,
	...getAll.description,
	...update.description,
] as INodeProperties[];