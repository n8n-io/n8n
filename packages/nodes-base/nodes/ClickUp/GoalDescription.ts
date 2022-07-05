import {
	INodeProperties,
} from 'n8n-workflow';

export const goalOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a goal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a goal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a goal',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all goals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a goal',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const goalFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                goal:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Multiple Owners',
				name: 'multipleOwners',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Owners',
				name: 'owners',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                goal:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Goal ID',
		name: 'goal',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                goal:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Goal ID',
		name: 'goal',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                goal:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'getAll',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'getAll',
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
	/*                                goal:update                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Goal ID',
		name: 'goal',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'goal',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Add Owners',
				name: 'addOwners',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Remove Owners',
				name: 'removeOwners',
				type: 'string',
				default: '',
			},
		],
	},
];
