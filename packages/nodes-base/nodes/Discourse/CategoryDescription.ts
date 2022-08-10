import { INodeProperties } from 'n8n-workflow';

export const categoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		description: 'Choose an operation',
		required: true,
		displayOptions: {
			show: {
				resource: ['category'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a category',
				action: 'Create a category',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all categories',
				action: 'Get all categories',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a category',
				action: 'Update a category',
			},
		],
		default: 'create',
	},
];

export const categoryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                category:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the category',
	},
	{
		displayName: 'Color',
		name: 'color',
		type: 'color',
		required: true,
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['create'],
			},
		},
		default: '0000FF',
		description: 'Color of the category',
	},
	{
		displayName: 'Text Color',
		name: 'textColor',
		type: 'color',
		required: true,
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['create'],
			},
		},
		default: '0000FF',
		description: 'Text color of the category',
	},

	/* -------------------------------------------------------------------------- */
	/*                                category:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
	},

	/* -------------------------------------------------------------------------- */
	/*                                category:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Category ID',
		name: 'categoryId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'ID of the category',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		default: '',
		description: 'New name of the category',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '0000FF',
				description: 'Color of the category',
			},
			{
				displayName: 'Text Color',
				name: 'textColor',
				type: 'color',
				default: '0000FF',
				description: 'Text color of the category',
			},
		],
	},
];
