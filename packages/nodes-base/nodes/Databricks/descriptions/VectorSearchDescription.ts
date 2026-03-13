import type { INodeProperties } from 'n8n-workflow';

export const vectorSearchOperations: INodeProperties[] = [
	{
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
				name: 'Get',
				value: 'get',
				description: 'Get details of a vector search index',
				action: 'Get a vector search index',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List many vector search indexes on an endpoint',
				action: 'Get many vector search indexes',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query a vector search index for similar results',
				action: 'Query a vector search index',
			},
		],
		default: 'query',
	},
];

export const vectorSearchFields: INodeProperties[] = [
	// ----------------------------------------
	//          vectorSearch: getAll
	// ----------------------------------------
	{
		displayName: 'Endpoint Name',
		name: 'endpointName',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the vector search endpoint',
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['getAll'],
			},
		},
	},

	// ----------------------------------------
	//           vectorSearch: get
	// ----------------------------------------
	{
		displayName: 'Index Name',
		name: 'indexName',
		type: 'string',
		required: true,
		default: '',
		description: 'Full name of the index in the format <code>catalog.schema.index</code>',
		placeholder: 'my_catalog.my_schema.my_index',
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//          vectorSearch: query
	// ----------------------------------------
	{
		displayName: 'Index Name',
		name: 'indexName',
		type: 'string',
		required: true,
		default: '',
		description: 'Full name of the index to query in the format <code>catalog.schema.index</code>',
		placeholder: 'my_catalog.my_schema.my_index',
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['query'],
			},
		},
	},
	{
		displayName: 'Query Type',
		name: 'queryType',
		type: 'options',
		options: [
			{
				name: 'ANN (Approximate Nearest Neighbor)',
				value: 'ann',
				description: 'Find results by vector similarity',
			},
			{
				name: 'Hybrid',
				value: 'hybrid',
				description: 'Combine vector similarity with keyword search',
			},
		],
		default: 'ann',
		description: 'Search strategy to use',
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['query'],
			},
		},
	},
	{
		displayName: 'Query Vector (JSON)',
		name: 'queryVector',
		type: 'string',
		required: true,
		default: '',
		description: 'Embedding vector to search with, as a JSON array of numbers',
		placeholder: '[0.12, -0.34, 0.56]',
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['query'],
				queryType: ['ann'],
			},
		},
	},
	{
		displayName: 'Query Text',
		name: 'queryText',
		type: 'string',
		required: true,
		default: '',
		description: 'Text to search with for hybrid queries',
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['query'],
				queryType: ['hybrid'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['vectorSearch'],
				operation: ['query'],
			},
		},
		options: [
			{
				displayName: 'Columns to Return',
				name: 'columnsToReturn',
				type: 'string',
				default: '',
				description: 'Comma-separated list of column names to include in the results',
				placeholder: 'ID,text,metadata',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'string',
				default: '',
				description:
					"SQL-like filter expression, e.g. <code>language = 'en' AND score > 0.5</code>",
			},
			{
				displayName: 'Number of Results',
				name: 'numResults',
				type: 'number',
				default: 10,
				description: 'Maximum number of results to return',
				typeOptions: {
					minValue: 1,
				},
			},
		],
	},
];
