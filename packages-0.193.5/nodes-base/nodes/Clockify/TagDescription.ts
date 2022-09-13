import { INodeProperties } from 'n8n-workflow';

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tag'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a tag',
				action: 'Create a tag',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a tag',
				action: 'Delete a tag',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all tags',
				action: 'Get all tags',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a tag',
				action: 'Update a tag',
			},
		],
		default: 'create',
	},
];

export const tagFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 tag:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of tag being created',
		displayOptions: {
			show: {
				resource: ['tag'],
				operation: ['create'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 tag:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tag'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 tag:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['tag'],
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
				operation: ['getAll'],
				resource: ['tag'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['tag'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sort Column',
				name: 'sort-column',
				type: 'options',
				options: [
					{
						name: 'Name',
						value: 'NAME',
					},
				],
				default: '',
			},
			{
				displayName: 'Sort Order',
				name: 'sort-order',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 tag:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['tag'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['tag'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
];
