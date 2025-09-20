import type { INodeProperties } from 'n8n-workflow';

export const nodeProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Insert One',
				value: 'insertOne',
				description:
					'Insert single document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-one.html" target="_blank">documentation</a>',
			},
			{
				name: 'Insert Many',
				value: 'insertMany',
				description:
					'Insert multiple documents. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-many.html" target="_blank">documentation</a>',
			},
			//			{ name: 'Insert With Vector Embeddings', value: 'insertWithVectorEmbeddings', description: 'Insert document with pre-generated vector embeddings. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-one.html#insert-a-document-with-vector-embeddings" target="_blank">documentation</a>' },
			//			{ name: 'Insert With Vectorize', value: 'insertWithVectorize', description: 'Insert document with automatic vector embedding generation. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-one.html#insert-a-document-and-generate-vector-embeddings" target="_blank">documentation</a>' },
			{
				name: 'Update Many',
				value: 'updateMany',
				description:
					'Update documents. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/update-many.html" target="_blank">documentation</a>',
			},
			{
				name: 'Delete',
				value: 'delete',
				description:
					'Delete documents. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/delete-many.html" target="_blank">documentation</a>',
			},
			{
				name: 'Find',
				value: 'findMany',
				description:
					'Find documents. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-many.html" target="_blank">documentation</a>',
			},
			{
				name: 'Find One',
				value: 'findOne',
				description:
					'Find single document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one.html" target="_blank">documentation</a>',
			},
			{
				name: 'Find And Update Document',
				value: 'findAndUpdate',
				description:
					'Find and update single document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-update.html" target="_blank">documentation</a>',
			},
			{
				name: 'Find And Replace Document',
				value: 'findAndReplace',
				description:
					'Find and replace single document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-replace.html" target="_blank">documentation</a>',
			},
			{
				name: 'Find And Delete Document',
				value: 'findAndDelete',
				description:
					'Find and delete single document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-delete.html" target="_blank">documentation</a>',
			},
			{
				name: 'Estimated Document Count',
				value: 'estimatedDocumentCount',
				description:
					'Estimated document count. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/count-estimate.html" target="_blank">documentation</a>',
			},
		],
		default: 'findMany',
		required: true,
		description:
			'Collection operation to perform. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/collections.html" target="_blank">documentation</a>',
	},
	// Keyspace field
	{
		displayName: 'Keyspace',
		name: 'keyspace',
		type: 'string',
		required: true,
		default: 'default_keyspace',
		description:
			'Astra DB keyspace name. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/databases/manage-keyspaces.html" target="_blank">documentation</a>',
	},
	// Collection field
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		required: true,
		default: '',
		description:
			'Astra DB collection name. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/collections.html" target="_blank">documentation</a>',
	},
	// Insert One fields
	{
		displayName: 'Document',
		name: 'document',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['insertOne'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Document to insert. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-one.html" target="_blank">documentation</a>',
	},
	// Insert Many fields
	{
		displayName: 'Documents',
		name: 'documents',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['insertMany'],
			},
		},
		default: '[]',
		required: true,
		description:
			'Array of documents to insert. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-many.html" target="_blank">documentation</a>',
	},
	// Insert Many options
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['insertMany'],
			},
		},
		description:
			'Options to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/insert-many.html#ts-options" target="_blank">documentation</a>',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Chunk Size',
				name: 'chunkSize',
				type: 'number',
				default: 20,
				description: 'Number of documents to process in each batch',
			},
			{
				displayName: 'Concurrency',
				name: 'concurrency',
				type: 'number',
				default: 3,
				description: 'Number of concurrent operations',
			},
			{
				displayName: 'Ordered',
				name: 'ordered',
				type: 'boolean',
				default: false,
				description: 'Whether to process documents in order',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Timeout in milliseconds',
			},
		],
	},
	// Insert With Vector Embeddings fields
	{
		displayName: 'Document',
		name: 'document',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['insertWithVectorEmbeddings'],
			},
		},
		default: '{}',
		required: true,
		description: 'Document to insert (must include $vector field with array of numbers)',
	},
	// Insert With Vectorize fields
	{
		displayName: 'Document',
		name: 'document',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['insertWithVectorize'],
			},
		},
		default: '{}',
		required: true,
		description: 'Document to insert (must include $vectorize field with text string)',
	},
	// Update fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['updateMany'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find documents to update. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Update',
		name: 'update',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['updateMany'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Update operations to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/update-many.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['updateMany'],
			},
		},
		default: {},
		placeholder: 'Add option',
		description:
			'Options to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/update-many.html#ts-options" target="_blank">documentation</a>',
		options: [
			{
				displayName: 'Upsert',
				name: 'upsert',
				type: 'boolean',
				default: false,
				description: 'Insert document if no match found',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Timeout in milliseconds',
			},
		],
	},
	// Delete fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['delete'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find documents to delete. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	// Find fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findMany'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find documents. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['findMany'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 0,
				description:
					'Maximum number of documents to return (0 for unlimited). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-many.html#limit-the-number-of-documents-returned" target="_blank">documentation</a>',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: 0,
				description:
					'Number of documents to skip. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-many.html#skip-documents" target="_blank">documentation</a>',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '{}',
				description:
					'Sort criteria (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/sort-documents.html" target="_blank">documentation</a>',
			},
			{
				displayName: 'Projection',
				name: 'projection',
				type: 'json',
				default: '{}',
				description:
					'Fields to include/exclude (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/projections-collections.html" target="_blank">documentation</a>',
			},
		],
	},
	// Find One fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findOne'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['findOne'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '{}',
				description: 'Sort criteria (JSON format)',
			},
			{
				displayName: 'Projection',
				name: 'projection',
				type: 'json',
				default: '{}',
				description: 'Fields to include/exclude (JSON format)',
			},
		],
	},
	// Find And Update fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findAndUpdate'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find the document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Update',
		name: 'update',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findAndUpdate'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Update operations to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/update-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['findAndUpdate'],
			},
		},
		description:
			'Options to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-and-update.html#ts-options" target="_blank">documentation</a>',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Upsert',
				name: 'upsert',
				type: 'boolean',
				default: false,
				description: 'Insert document if no match found',
			},
			{
				displayName: 'Return Document',
				name: 'returnDocument',
				type: 'options',
				options: [
					{ name: 'Before', value: 'before' },
					{ name: 'After', value: 'after' },
				],
				default: 'after',
				description: 'Which version of document to return',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '{}',
				description: 'Sort criteria (JSON format)',
			},
			{
				displayName: 'Projection',
				name: 'projection',
				type: 'json',
				default: '{}',
				description:
					'Fields to include/exclude (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/projections-collections.html" target="_blank">documentation</a>',
			},
			{
				displayName: 'Include Result Metadata',
				name: 'includeResultMetadata',
				type: 'boolean',
				default: false,
				description:
					'Whether to include details about the success of the operation in the response',
			},
		],
	},
	// Find And Replace fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findAndReplace'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find the document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Replacement',
		name: 'replacement',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findAndReplace'],
			},
		},
		default: '{}',
		required: true,
		description: 'Document to replace the found document with',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		description:
			'Options to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-replace.html#ts-options" target="_blank">documentation</a>',
		displayOptions: {
			show: {
				operation: ['findAndReplace'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Upsert',
				name: 'upsert',
				type: 'boolean',
				default: false,
				description: 'Insert document if no match found',
			},
			{
				displayName: 'Return Document',
				name: 'returnDocument',
				type: 'options',
				options: [
					{ name: 'Before', value: 'before' },
					{ name: 'After', value: 'after' },
				],
				default: 'after',
				description: 'Which version of document to return',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '{}',
				description:
					'Sort criteria (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/sort-documents.html" target="_blank">documentation</a>',
			},
			{
				displayName: 'Projection',
				name: 'projection',
				type: 'json',
				default: '{}',
				description:
					'Fields to include/exclude (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/projections-collections.html" target="_blank">documentation</a>',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Timeout in milliseconds',
			},
			{
				displayName: 'Include Result Metadata',
				name: 'includeResultMetadata',
				type: 'boolean',
				default: false,
				description:
					'Whether to include details about the success of the operation in the response',
			},
		],
	},
	// Find And Delete fields
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'json',
		displayOptions: {
			show: {
				operation: ['findAndDelete'],
			},
		},
		default: '{}',
		required: true,
		description:
			'Filter criteria to find the document. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/filter-operator-collections.html" target="_blank">documentation</a>',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		description:
			'Options to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/find-one-and-delete.html#ts-options" target="_blank">documentation</a>',
		displayOptions: {
			show: {
				operation: ['findAndDelete'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '{}',
				description:
					'Sort criteria (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/sort-documents.html" target="_blank">documentation</a>',
			},
			{
				displayName: 'Projection',
				name: 'projection',
				type: 'json',
				default: '{}',
				description:
					'Fields to include/exclude (JSON format). Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/projections-collections.html" target="_blank">documentation</a>',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Timeout in milliseconds',
			},
			{
				displayName: 'Include Result Metadata',
				name: 'includeResultMetadata',
				type: 'boolean',
				default: false,
				description:
					'Whether to include details about the success of the operation in the response',
			},
		],
	},
	// Estimated Document Count fields,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		description:
			'Options to apply. Refer to <a href="https://docs.datastax.com/en/astra-db-serverless/api-reference/document-methods/count-estimate.html#ts-options" target="_blank">documentation</a>',
		displayOptions: {
			show: {
				operation: ['estimatedDocumentCount'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Timeout in milliseconds',
			},
		],
	},
];
