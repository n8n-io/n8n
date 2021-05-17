import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Index',
				value: 'index',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'delete',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const documentFields = [
	// ----------------------------------------
	//             document: delete
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the document to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: 'ID of the document to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//              document: get
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the document to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: 'ID of the document to retrieve.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             document: getAll
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Ids',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'IDs of the documents to retrieve. Allowed when the index is specified in the request URI.',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Return all results.',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},

	// ----------------------------------------
	//             document: index
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'index',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: '',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'index',
				],
			},
		},
	},
	{
		displayName: 'Field',
		name: 'field',
		description: 'JSON source for the document data.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'index',
				],
			},
		},
	},

	// ----------------------------------------
	//             document: update
	// ----------------------------------------
	{
		displayName: 'Index ID',
		name: 'indexId',
		description: 'ID of the document to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Document ID',
		name: 'documentId',
		description: 'ID of the document to update.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Script',
		name: 'script',
		description: 'Script to update the document. See the <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting-using.html" target="_blank"> ElasticSearch guide to writing scripts</a>.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
				operation: [
					'update',
				],
			},
		},
	},
] as INodeProperties[];
