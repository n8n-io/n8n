import type { INodeProperties } from 'n8n-workflow';

export const actionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['action'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new action for a project',
				routing: {
					request: {
						method: 'POST',
						url: '/actions',
					},
				},
				action: 'Create an action',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Archive an action (soft delete)',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/actions/{{$parameter["actionId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "success": true } }}',
								},
							},
						],
					},
				},
				action: 'Delete an action',
			},
			{
				name: 'Disable',
				value: 'disable',
				description: 'Deactivate an active action',
				routing: {
					request: {
						method: 'PUT',
						url: '=/actions/{{$parameter["actionId"]}}/disable',
					},
				},
				action: 'Disable an action',
			},
			{
				name: 'Enable',
				value: 'enable',
				description: 'Reactivate a disabled action',
				routing: {
					request: {
						method: 'PUT',
						url: '=/actions/{{$parameter["actionId"]}}/enable',
					},
				},
				action: 'Enable an action',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single action by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/actions/{{$parameter["actionId"]}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get an action',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many actions for a project',
				routing: {
					request: {
						method: 'GET',
						url: '/actions',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get many actions',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an existing action',
				routing: {
					request: {
						method: 'PUT',
						url: '=/actions/{{$parameter["actionId"]}}',
					},
				},
				action: 'Update an action',
			},
		],
		default: 'getAll',
	},
];

export const actionFields: INodeProperties[] = [
	// ----------------------------------
	//         action:get, delete, enable, disable, update
	// ----------------------------------
	{
		displayName: 'Action ID',
		name: 'actionId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['get', 'delete', 'enable', 'disable', 'update'],
			},
		},
		description: 'The ID of the action',
	},

	// ----------------------------------
	//         action:getAll
	// ----------------------------------
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['getAll'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a project...',
				typeOptions: {
					searchListMethod: 'getProjects',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. abc123',
			},
		],
		routing: {
			send: {
				type: 'query',
				property: 'projectId',
				value: '={{ $value }}',
			},
		},
		description: 'The Currents project',
	},

	// ----------------------------------
	//         action:create
	// ----------------------------------
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
			},
		},
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a project...',
				typeOptions: {
					searchListMethod: 'getProjects',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. abc123',
			},
		],
		routing: {
			send: {
				type: 'body',
				property: 'projectId',
				value: '={{ $value }}',
			},
		},
		description: 'The Currents project',
	},

	// ----------------------------------
	//         action:getAll
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'query',
						property: 'search',
					},
				},
				description: 'Search actions by name (max 100 characters)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Disabled', value: 'disabled' },
				],
				default: [],
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
				description: 'Filter by action status',
			},
		],
	},

	// ----------------------------------
	//         action:create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'name',
			},
		},
		description: 'The name of the action (1-255 characters)',
	},
	{
		displayName: 'Action Type',
		name: 'actionType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Quarantine', value: 'quarantine', description: 'Quarantine matching tests' },
			{ name: 'Skip', value: 'skip', description: 'Skip matching tests' },
			{ name: 'Tag', value: 'tag', description: 'Add tags to matching tests' },
		],
		default: 'quarantine',
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'action.type',
			},
		},
	},
	{
		displayName: 'Tags',
		name: 'actionTags',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
				actionType: ['tag'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'action.tags',
				value: '={{ $value.split(",").map(t => t.trim()).filter(t => t) }}',
			},
		},
		description: 'Comma-separated list of tags to apply',
	},
	{
		displayName: 'Matcher Type',
		name: 'matcherType',
		type: 'options',
		required: true,
		options: [
			{ name: 'Spec File Contains', value: 'specContains' },
			{ name: 'Spec File Equals', value: 'specEquals' },
			{ name: 'Test Signature', value: 'signature' },
			{ name: 'Test Title Contains', value: 'titleContains' },
			{ name: 'Test Title Equals', value: 'titleEquals' },
		],
		default: 'titleContains',
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'matcher.type',
			},
		},
		description: 'How to match tests for this action',
	},
	{
		displayName: 'Matcher Value',
		name: 'matcherValue',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
			},
		},
		routing: {
			send: {
				type: 'body',
				property: 'matcher.value',
			},
		},
		description: 'The value to match against (test title, spec file path, or signature)',
	},
	{
		displayName: 'Options',
		name: 'createOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'description',
					},
				},
				description: 'A description for the action',
			},
			{
				displayName: 'Expires After',
				name: 'expiresAfter',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'expiresAfter',
					},
				},
				description: 'When the action should expire (ISO 8601 format)',
			},
		],
	},

	// ----------------------------------
	//         action:update
	// ----------------------------------
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['action'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
				description: 'The name of the action (1-255 characters)',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'description',
					},
				},
				description: 'A description for the action',
			},
			{
				displayName: 'Expires After',
				name: 'expiresAfter',
				type: 'dateTime',
				default: '',
				routing: {
					send: {
						type: 'body',
						property: 'expiresAfter',
					},
				},
				description: 'When the action should expire (ISO 8601 format)',
			},
		],
	},
];
