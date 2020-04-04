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
				value: 'save',
				description: 'Create a collection entry',
			},
			{
				name: 'Get all entries',
				value: 'get',
				description: 'Get all collection entries',
			},
			{
				name: 'Update an entry',
				value: 'update',
				description: 'Update a collection entries',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	}
] as INodeProperties[];

export const collectionFields = [
	// Collections:entry:save
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
					'save',
				]
			},
		},
		description: 'The data to save.',
	},

	// Collections:entry:get
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'collections',
				],
				operation: [
					'get',
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
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: '',
				description: 'Limit number of returned entries.',
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
			{
				displayName: 'Populate',
				name: 'populate',
				type: 'boolean',
				required: true,
				default: true,
				description: 'Resolve linked collection items.',
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
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				description: 'Return normalized language fields.',
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
