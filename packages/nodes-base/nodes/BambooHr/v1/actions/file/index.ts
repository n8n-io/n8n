import * as del from './del';
import * as download from './download';
import * as getAll from './getAll';
import * as update from './update';
import * as upload from './upload';

import type { INodeProperties } from 'n8n-workflow';

export { del, download, getAll, update, upload };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a company file',
				action: 'Download a file',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many company files',
				action: 'Get many files',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a company file',
				action: 'Update a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a company file',
				action: 'Upload a file',
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
