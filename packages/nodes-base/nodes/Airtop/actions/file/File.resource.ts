import type { INodeProperties } from 'n8n-workflow';

import * as deleteFile from './delete.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';

export { deleteFile, get, getMany };

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
				name: 'Delete',
				value: 'deleteFile',
				description: 'Delete an uploaded file',
				action: 'Delete a file',
			},
		],
		default: 'getMany',
	},
	...getMany.description,
	...get.description,
	...deleteFile.description,
];
