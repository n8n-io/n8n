import { INodeProperties } from 'n8n-workflow';

export const listOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a list',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a list',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all lists',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a list',
			},
		],
		default: 'get',
	},
];

export const listFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 list:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List Name',
		name: 'displayName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['list'],
			},
		},
		required: true,
		default: '',
		description: 'List display name',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 list:get/delete/update                     */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete', 'get', 'update'],
				resource: ['list'],
			},
		},
		required: true,
		default: '',
		description: "The identifier of the list, unique in the user's mailbox",
	},

	/* -------------------------------------------------------------------------- */
	/*                                 list:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['list'],
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
				resource: ['list'],
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
	/*                                 list:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'New List Name',
		name: 'displayName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['list'],
			},
		},
		required: true,
		default: '',
		description: 'List display name',
	},
];
