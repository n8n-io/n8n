import {
	INodeProperties,
} from 'n8n-workflow';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		description: 'Choose an operation',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'group',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a group',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a group',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all groups',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a group',
			},
		],
		default: 'create',
	},
];

export const groupFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                group:create & get                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'get',
					'create',
				],
			},
		},
		default: '',
		description: 'Name of the group.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                group:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'getAll',
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
				resource: [
					'group',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                group:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'ID of the group to update.',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'group',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'New name of the group.',
	},
];
