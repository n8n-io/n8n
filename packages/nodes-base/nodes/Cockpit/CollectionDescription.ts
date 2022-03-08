import { INodeProperties } from 'n8n-workflow';

export const collectionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
			},
		},
		options: [
			{
				name: 'Create an Entry',
				value: 'create',
				description: 'Create a collection entry',
			},
			{
				name: 'Get all Entries',
				value: 'getAll',
				description: 'Get all collection entries',
			},
			{
				name: 'Update an Entry',
				value: 'update',
				description: 'Update a collection entry',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const collectionFields: INodeProperties[] = [
	{
		displayName: 'Collection',
		name: 'collection',
		type: 'options',
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
		},
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
			},
		},
		required: true,
		description: 'Name of the collection to operate on.',
	},

	// Collection:entry:getAll
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'collection',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'collection',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				placeholder: '_id,name',
				description: 'Comma separated list of fields to get.',
			},
			{
				displayName: 'Filter Query',
				name: 'filter',
				type: 'json',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				placeholder: '{"name": "Jim"}',
				description: 'Filter query in <a href="https://jeroen.github.io/mongolite/query-data.html">Mongolite format</a>.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Return normalized language fields.',
			},
			{
				displayName: 'Populate',
				name: 'populate',
				type: 'boolean',
				required: true,
				default: true,
				description: 'Resolve linked collection items.',
			},
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				default: false,
				description: `Returns the data exactly in the way it got received from the API.`,
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: '',
				description: 'Skip number of entries.',
			},
			{
				displayName: 'Sort Query',
				name: 'sort',
				type: 'json',
				default: '',
				placeholder: '{"price": -1}',
				description: 'Sort query in <a href="https://jeroen.github.io/mongolite/query-data.html">Mongolite format</a>.',
			},
		],
	},

	// Collection:entry:update
	{
		displayName: 'Entry ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'The entry ID.',
	},

	// Collection:entry:create
	// Collection:entry:update
	{
		displayName: 'JSON Data fields',
		name: 'jsonDataFields',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		description: 'If new entry fields should be set via the value-key pair UI or JSON.',
	},
	{
		displayName: 'Entry Data',
		name: 'dataFieldsJson',
		type: 'json',
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				jsonDataFields: [
					true,
				],
				resource: [
					'collection',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		description: 'Entry data to send as JSON.',
	},
	{
		displayName: 'Entry Data',
		name: 'dataFieldsUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				jsonDataFields: [
					false,
				],
				resource: [
					'collection',
				],
				operation: [
					'create',
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name of the field.',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Value of the field.',
					},
				],
			},
		],
		description: 'Entry data to send.',
	},
];
