import {
	INodeProperties,
} from 'n8n-workflow';

export const guestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a guest',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a guest',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a guest',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a guest',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const guestFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                guest:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
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
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
				operation: [
					'create',
				],
			},
		},
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
					'guest',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Can Edit Tags',
				name: 'can_edit_tags',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Can See Time Spend',
				name: 'can_see_time_spend',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Can See Time estimated',
				name: 'can_see_time_estimated',
				type: 'boolean',
				default: false,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                guest:delete                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
				operation: [
					'delete',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Guest ID',
		name: 'guest',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                guest:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
				operation: [
					'get',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Guest ID',
		name: 'guest',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
				operation: [
					'get',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                guest:update                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
				],
				operation: [
					'update',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Guest ID',
		name: 'guest',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'guest',
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
					'guest',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Can Edit Tags',
				name: 'can_edit_tags',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Can See Time Spend',
				name: 'can_see_time_spend',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Can See Time estimated',
				name: 'can_see_time_estimated',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
			},
		],
	},
];
