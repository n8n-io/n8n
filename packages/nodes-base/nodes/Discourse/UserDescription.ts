import type { INodeProperties } from 'n8n-workflow';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		description: 'Choose an operation',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a user',
				action: 'Create a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a user',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many users',
				action: 'Get many users',
			},
		],
		default: 'create',
	},
];

export const userFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                user:create                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Name of the user to create',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'Email of the user to create',
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The username of the user to create',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The password of the user to create',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Approved',
				name: 'approved',
				type: 'boolean',
				default: false,
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'By',
		name: 'by',
		type: 'options',
		options: [
			{
				name: 'Username',
				value: 'username',
			},
			{
				name: 'SSO External ID',
				value: 'externalId',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		default: 'username',
		description: 'What to search by',
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				by: ['username'],
			},
		},
		default: '',
		description: 'The username of the user to return',
	},
	{
		displayName: 'SSO External ID',
		name: 'externalId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
				by: ['externalId'],
			},
		},
		default: '',
		description: 'Discourse SSO external ID',
	},

	/* -------------------------------------------------------------------------- */
	/*                                user:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Flag',
		name: 'flag',
		type: 'options',
		options: [
			{
				name: 'Active',
				value: 'active',
			},
			{
				name: 'Blocked',
				value: 'blocked',
			},
			{
				name: 'New',
				value: 'new',
			},
			{
				name: 'Staff',
				value: 'staff',
			},
			{
				name: 'Suspect',
				value: 'suspect',
			},
			{
				name: 'Suspended',
				value: 'suspended',
			},
		],
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		default: '',
		description: 'User flags to search for',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['user'],
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
				resource: ['user'],
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Ascending',
				name: 'asc',
				type: 'boolean',
				default: true,
				description: 'Whether to sort ascending',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{
						name: 'Created',
						value: 'created',
					},
					{
						name: 'Days Visited',
						value: 'days_visited',
					},
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Last Emailed',
						value: 'last_emailed',
					},
					{
						name: 'Posts',
						value: 'posts',
					},
					{
						name: 'Posts Read',
						value: 'posts_read',
					},
					{
						name: 'Read Time',
						value: 'read_time',
					},
					{
						name: 'Seen',
						value: 'seen',
					},
					{
						name: 'Topics Viewed',
						value: 'topics_viewed',
					},
					{
						name: 'Trust Level',
						value: 'trust_level',
					},
					{
						name: 'Username',
						value: 'username',
					},
				],
				default: 'created',
				description: 'What to order by',
			},
			{
				displayName: 'Show Emails',
				name: 'showEmails',
				type: 'boolean',
				default: false,
				description: 'Whether to include user email addresses',
			},
			{
				displayName: 'Stats',
				name: 'stats',
				type: 'boolean',
				default: false,
				description: 'Whether to return user stats',
			},
		],
	},
];
