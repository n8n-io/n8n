import type { INodeProperties } from 'n8n-workflow';

export const nodeProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'insert',
				description:
					'Create document in couchbase given an ID or autogenreated ID, and a JSON String',
				action: 'Create document in couchbase',
			},
			{
				name: 'Delete',
				value: 'remove',
				description: 'Delete a document in couchbase given its ID',
				action: 'Delete a document in couchbase',
			},
			{
				name: 'Import',
				value: 'import',
				description: 'Import input documents in couchbase',
				action: 'Import input documents in couchbase',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query documents in couchbase',
				action: 'Query documents in couchbase',
			},
			{
				name: 'Read',
				value: 'find',
				description: 'Read a document in couchbase given its ID',
				action: 'Read a document in couchbase',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a document in couchbase given an ID and a JSON String',
				action: 'Update a document in couchbase',
			},
		],
		default: 'query',
	},

	{
		displayName: 'Bucket',
		name: 'bucket',
		type: 'string',
		default: 'default',
		description: 'Couchbase Bucket',
		placeholder: 'default'
	},

	{
		displayName: 'Scope',
		name: 'scope',
		type: 'string',
		default: '_default',
		description: 'Couchbase Scope',
		placeholder: '_default'
	},

	{
		displayName: 'Collection',
		name: 'collection',
		type: 'string',
		default: '_default',
		description: 'Couchbase Collection',
		placeholder: '_default'
	},

	// ----------------------------------
	//         insert
	// ----------------------------------
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['insert'],
			},
		},
		default: {},
		placeholder: 'Add options',
		description: 'Add query options',
		options: [
			{
				displayName: 'Specify Document ID',
				name: 'specified',
				type: 'string',
				default: '',
				description: 'Specify ID',
			},
			{
				displayName: 'Generate Document ID',
				name: 'generate',
				type: 'boolean',
				default: false,
				description: 'Whether Generated ID',
			},
		],
	},

	{
		displayName: 'Value',
		name: 'myDocument',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['insert'],
			},
		},
		default: '',
		placeholder: 'Placeholder value',
		description: 'The description text',
	},

	// ----------------------------------
	//         update
	// ----------------------------------
	{
		displayName: 'Document ID',
		name: 'myDocument',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
			},
		},
		default: '',
		placeholder: 'Placeholder value',
		description: 'The description text',
	},
	{
		displayName: 'New Value',
		name: 'myValue',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
			},
		},
		default: '',
		placeholder: 'Placeholder value',
		description: 'The description text',
	},

	// ----------------------------------
	//         delete
	// ----------------------------------
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['remove'],
			},
		},
		default: '',
		placeholder: 'Placeholder value',
		description: 'The description text',
	},

	// ----------------------------------
	//         read
	// ----------------------------------
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['find'],
			},
		},
		default: '',
		placeholder: 'Placeholder value',
		description: 'The description text',
	},

	// ----------------------------------
	//         query
	// ----------------------------------
	{
		displayName: 'Run Query',
		name: 'query',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['query'],
			},
		},
		typeOptions: {
			rows: 5,
		},
		default: '',
		placeholder: 'e.g. SELECT * FROM users WHERE name="Michael"',
		description: 'The N1QL query to execute',
	},
];
