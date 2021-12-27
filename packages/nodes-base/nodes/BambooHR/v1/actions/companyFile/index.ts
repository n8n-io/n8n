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
					'companyFile',
				],
			},
		},
		options: [
			{
				name: 'Add Category',
				value: 'addCategory',
				description: 'Add a company file category',
			},
			{
				name: 'Delete',
				value: 'del',
				description: 'Delete a company file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download an company file',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Lists company files and categories',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Upload a company file',
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
