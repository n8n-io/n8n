import * as del from './del';
import * as download from './download';
import * as getAll from './getAll';
import * as update from './update';
import * as upload from './upload';

import { INodeProperties } from 'n8n-workflow';

export { del, download, getAll, update, upload };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['employeeDocument'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an employee document',
				action: 'Delete an employee document',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download an employee document',
				action: 'Download an employee document',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all employee document',
				action: 'Get all employee documents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an employee document',
				action: 'Update an employee document',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload an employee document',
				action: 'Upload an employee document',
			},
		],
		default: 'delete',
	},
	...del.description,
	...download.description,
	...getAll.description,
	...update.description,
	...upload.description,
];
