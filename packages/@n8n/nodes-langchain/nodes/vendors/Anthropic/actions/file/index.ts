import type { INodeProperties } from 'n8n-workflow';

import * as deleteOperation from './delete.operation';
import * as get from './get.operation';
import * as list from './list.operation';
import * as upload from './upload.operation';

export { deleteOperation as delete, get, list, upload };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Upload File',
				value: 'upload',
				action: 'Upload a file',
				description: 'Upload a file to the Anthropic API for later use',
			},
			{
				name: 'Get File Metadata',
				value: 'get',
				action: 'Get file metadata',
				description: 'Get metadata for a file from the Anthropic API',
			},
			{
				name: 'List Files',
				value: 'list',
				action: 'List files',
				description: 'List files from the Anthropic API',
			},
			{
				name: 'Delete File',
				value: 'delete',
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
	...deleteOperation.description,
	...get.description,
	...list.description,
	...upload.description,
];
