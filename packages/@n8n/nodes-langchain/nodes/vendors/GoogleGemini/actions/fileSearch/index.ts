import type { INodeProperties } from 'n8n-workflow';

import * as createStore from './createStore.operation';
import * as deleteStore from './deleteStore.operation';
import * as listStores from './listStores.operation';
import * as uploadToStore from './uploadToStore.operation';

export { createStore, deleteStore, listStores, uploadToStore };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create file search store',
				value: 'createStore',
				action: 'Create a file search store',
				description: 'Create a new File Search store for RAG (Retrieval Augmented Generation)',
			},
			{
				name: 'Delete file search store',
				value: 'deleteStore',
				action: 'Delete a file search store',
				description: 'Delete a File Search store',
			},
			{
				name: 'List file search stores',
				value: 'listStores',
				action: 'List all file search stores',
				description: 'List all File Search stores owned by the user',
			},
			{
				name: 'Upload to file search store',
				value: 'uploadToStore',
				action: 'Upload a file to a file search store',
				description:
					'Upload a file to a File Search store for RAG (Retrieval Augmented Generation)',
			},
		],
		default: 'createStore',
		displayOptions: {
			show: {
				resource: ['fileSearch'],
			},
		},
	},
	...createStore.description,
	...deleteStore.description,
	...listStores.description,
	...uploadToStore.description,
];
