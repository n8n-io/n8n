import {
	INodeProperties,
} from 'n8n-workflow';

export const guestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Create a guest',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a guest',
				action: 'Delete a guest',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a guest',
				action: 'Get a guest',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a guest',
				action: 'Update a guest',
			},
		],
		default: 'create',
	},
];

export const guestFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                guest:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team Name or ID',
		name: 'team',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		placeholder: 'name@email.com',
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
				displayName: 'Can See Time Estimated',
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
		displayName: 'Team Name or ID',
		name: 'team',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		displayName: 'Team Name or ID',
		name: 'team',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
		displayName: 'Team Name or ID',
		name: 'team',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
				displayName: 'Can See Time Estimated',
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
