import type { INodeProperties } from 'n8n-workflow';

import * as deleteFile from './delete.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';
import * as load from './load.operation';
import * as upload from './upload.operation';

export { deleteFile, get, getMany, upload, load };

export const description: INodeProperties[] = [
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
				value: 'deleteFile',
				description: 'Delete an uploaded file',
				action: 'Delete a file',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a details of an uploaded file',
				action: 'Get a file',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get details of multiple uploaded files',
				action: 'Get many files',
			},
			{
				name: 'Load',
				value: 'load',
				description: 'Load a file into a session',
				action: 'Load a file',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file into a session',
				action: 'Upload a file',
			},
		],
		default: 'getMany',
	},
	...deleteFile.description,
	...get.description,
	...getMany.description,
	...load.description,
	...upload.description,
];
