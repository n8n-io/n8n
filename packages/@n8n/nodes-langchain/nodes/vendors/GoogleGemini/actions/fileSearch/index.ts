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
				name: 'Create File Search Store',
				value: 'createStore',
				action: 'Create a File Search store',
				description: 'Create a new File Search store for RAG (Retrieval Augmented Generation)',
			},
			{
				name: 'Delete File Search Store',
				value: 'deleteStore',
				action: 'Delete a File Search store',
				description: 'Delete a File Search store',
			},
			{
				name: 'List File Search Stores',
				value: 'listStores',
				action: 'List all File Search stores',
				description: 'List all File Search stores owned by the user',
			},
			{
				name: 'Upload to File Search Store',
				value: 'uploadToStore',
				action: 'Upload a file to a File Search store',
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
