import type { INodeProperties } from 'n8n-workflow';

import * as deleteFile from './deleteFile.operation';
import * as list from './list.operation';
import * as upload from './upload.operation';

export { upload, deleteFile, list };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Delete a File',
				value: 'deleteFile',
				action: 'Delete a file',
				description: 'Delete a file from the server',
			},
			{
				name: 'List Files',
				value: 'list',
				action: 'List files',
				description: "Returns a list of files that belong to the user's organization",
			},
			{
				name: 'Upload a File',
				value: 'upload',
				action: 'Upload a file',
				description: 'Upload a file that can be used across various endpoints',
			},
		],
		default: 'upload',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},

	...upload.description,
	...deleteFile.description,
	...list.description,
];
