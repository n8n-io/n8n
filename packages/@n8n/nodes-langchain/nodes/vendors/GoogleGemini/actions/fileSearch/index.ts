import type { INodeProperties } from 'n8n-workflow';

import * as createStore from './createStore.operation';
import * as uploadToStore from './uploadToStore.operation';

export { createStore, uploadToStore };

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
	...uploadToStore.description,
];
