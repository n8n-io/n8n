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
			name: 'Create index',
			value: 'createIndex',
			description: 'Create a new vector search index',
			action: 'Create a vector search index',
		},
		{
			name: 'Get index',
			value: 'getIndex',
			description: 'Get details of a vector search index',
			action: 'Get a vector search index',
		},
		{
			name: 'List indexes',
			value: 'listIndexes',
			description: 'List all vector search indexes',
			action: 'List vector search indexes',
		},
		{
			name: 'Query index',
			value: 'queryIndex',
			description: 'Query a vector search index with text or vectors',
			action: 'Query a vector search index',
		},
	],
	default: 'listIndexes',
};
