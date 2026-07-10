import type { INodeProperties } from 'n8n-workflow';

export const vectorSearchOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['vectorSearch'],
		},
	},
	options: [
		{
			name: 'Create Index',
			value: 'createIndex',
			description: 'Create a new vector search index',
			action: 'Create a vector search index',
		},
		{
			name: 'Get Index',
			value: 'getIndex',
			description: 'Get details of a vector search index',
			action: 'Get a vector search index',
		},
		{
			name: 'List Indexes',
			value: 'listIndexes',
			description: 'List all vector search indexes',
			action: 'List vector search indexes',
		},
		{
			name: 'Query Index',
			value: 'queryIndex',
			description: 'Query a vector search index with text or vectors',
			action: 'Query a vector search index',
		},
	],
	default: 'listIndexes',
};
