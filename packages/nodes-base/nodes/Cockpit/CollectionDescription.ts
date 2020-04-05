import { INodeProperties } from 'n8n-workflow';

export const collectionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'collections',
				],
			},
		},
		options: [
			{
				name: 'Create an entry',
				value: 'create',
				description: 'Create a collection entry',
			},
			{
				name: 'Get all entries',
				value: 'getAll',
				description: 'Get all collection entries',
			},
			{
				name: 'Update an entry',
				value: 'update',
				description: 'Update a collection entries',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const collectionFields = [
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
					'collections',
				],
			},
		},
		required: true,
		description: 'Name of the collection to operate on.'
	},

	// Collections:entry:create
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		required: true,
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'collections',
				],
				operation: [
					'create',
				]
			},
		},
		description: 'The data to create.',
	},

	// Collections:entry:getAll
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'collections',
				],
				operation: [
					'getAll',
				]
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'json',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Fields to get.',
			},
			{
				displayName: 'Filter',
				name: 'filter',
				type: 'json',
				default: '',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				description: 'Filter result by fields.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Return normalized language fields.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: '',
				description: 'Limit number of returned entries.',
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
				displayName: 'Simple',
				name: 'simple',
				type: 'boolean',
				required: true,
				default: true,
				description: 'Return only result entries.',
			},
			{
				displayName: 'Skip',
				name: 'skip',
				type: 'number',
				default: '',
				description: 'Skip number of entries.',
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'json',
				default: '',
				description: 'Sort result by fields.',
			},
		],
	},

	// Collections:entry:update
	{
		displayName: 'Entry ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'collections',
				],
				operation: [
					'update',
				]
			},
		},
		description: 'The entry ID.',
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		required: true,
		default: '',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'collections',
				],
				operation: [
					'update',
				]
			},
		},
		description: 'The data to update.',
	},
] as INodeProperties[];
