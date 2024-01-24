import type { INodeProperties } from 'n8n-workflow';

import * as uploadFile from './uploadFile.operation';
import * as deleteFile from './deleteFile.operation';
import * as listFiles from './listFiles.operation';

export { uploadFile, deleteFile, listFiles };

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
				value: 'listFiles',
				action: 'List files',
				description: "Returns a list of files that belong to the user's organization",
			},
			{
				name: 'Upload a File',
				value: 'uploadFile',
				action: 'Upload a file',
				description: 'Upload a file that can be used across various endpoints',
			},
		],
		default: 'messageModel',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},

	...uploadFile.description,
	...deleteFile.description,
	...listFiles.description,
];
