import type { INodeProperties } from 'n8n-workflow';

import * as deleteFile from './delete.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as upload from './upload.operation';

export { deleteFile, get, list, upload };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Upload file',
				value: 'upload',
				action: 'Upload a file',
				description: 'Upload a file to the Anthropic API for later use',
			},
			{
				name: 'Get file metadata',
				value: 'get',
				action: 'Get file metadata',
				description: 'Get metadata for a file from the Anthropic API',
			},
			{
				name: 'List files',
				value: 'list',
				action: 'List files',
				description: 'List files from the Anthropic API',
			},
			{
				name: 'Delete file',
				value: 'deleteFile',
				action: 'Delete a file',
				description: 'Delete a file from the Anthropic API',
			},
		],
		default: 'upload',
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
	},
	...deleteFile.description,
	...get.description,
	...list.description,
	...upload.description,
];
