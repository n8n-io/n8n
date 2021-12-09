import * as addCategory from './addCategory';
import * as del from './del';
import * as download from './download';
import * as getAll from './getAll';
import * as update from './update';

import { INodeProperties } from 'n8n-workflow';

export {
	addCategory,
	del,
	download,
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
					'employeeFile',
				],
			},
		},
		options: [
			{
				name: 'Add Category',
				value: 'addCategory',
				description: 'Add an employee file category',
			},
			{
				name: 'Delete',
				value: 'del',
				description: 'Delete an employee file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download an Employee File',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Lists employee files and categories',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an employee file',
			},
		],
		default: 'addCategory',
		description: '',
	},
	...addCategory.description,
	...del.description,
	...download.description,
	...getAll.description,
	...update.description,
] as INodeProperties[];
