import { INodeProperties } from 'n8n-workflow';

import { LANGUAGES } from '../constants';

export const agentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['agent'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an agent',
				action: 'Create an agent',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an agent',
				action: 'Delete an agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an agent',
				action: 'Get an agent',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all agents',
				action: 'Get all agents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an agent',
				action: 'Update an agent',
			},
		],
		default: 'create',
	},
];

export const agentFields: INodeProperties[] = [
	// ----------------------------------------
	//              agent: create
	// ----------------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Roles',
		name: 'roles',
		description: 'Role to assign to the agent',
		type: 'fixedCollection',
		placeholder: 'Add Role',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Role Properties',
				name: 'roleProperties',
				values: [
					{
						displayName: 'Role Name or ID',
						name: 'role',
						description:
							'Name of the role to assign to the agent. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getAgentRoles',
						},
						required: true,
						default: '',
					},
					{
						displayName: 'Scope',
						name: 'assignment_scope',
						description: 'Scope in which the agent may use the permissions granted by the role',
						type: 'options',
						options: [
							{
								name: 'Entire Helpdesk',
								value: 'entire_helpdesk',
							},
							{
								name: 'Member Groups',
								value: 'member_groups',
							},
							{
								name: 'Specified Groups',
								value: 'specified_groups',
							},
							{
								name: 'Assigned Items',
								value: 'assigned_items',
							},
						],
						required: true,
						default: 'specified_groups',
					},
					{
						displayName: 'Group Names or IDs',
						name: 'groups',
						description:
							'Groups in which the permissions granted by the role apply. Required only when Scope is Specified Groups - ignored otherwise. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getAgentGroups',
						},
						default: [],
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Background Information',
				name: 'background_information',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department Names or IDs',
				name: 'department_ids',
				type: 'multiOptions',
				default: [],
				description:
					'IDs of the departments to which the agent belongs. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Location Name or ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Member of Group Names/IDs',
				name: 'member_of',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of the groups that the agent is a member of. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Observer of Group Names/IDs',
				name: 'observer_of',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of the groups that the agent is an observer of. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Scoreboard Level ID',
				name: 'scoreboard_level_id',
				type: 'options',
				description: 'ID of the level of the agent in the Arcade',
				default: 1,
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Beginner',
						value: 1,
					},
					{
						name: 'Intermediate',
						value: 2,
					},
					{
						name: 'Professional',
						value: 3,
					},
					{
						name: 'Expert',
						value: 4,
					},
					{
						name: 'Master',
						value: 5,
					},
					{
						name: 'Guru',
						value: 6,
					},
				],
			},
			{
				displayName: 'Time Format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-Hour Format',
						value: '12h',
					},
					{
						name: '24-Hour Format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work Phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              agent: delete
	// ----------------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		description: 'ID of the agent to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//                agent: get
	// ----------------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		description: 'ID of the agent to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//              agent: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Department Name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department to which the agent belongs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Location Name or ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description:
					'Choose from the list or specify an ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
			},
			{
				displayName: 'Mobile Phone Number',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Work Phone Number',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              agent: update
	// ----------------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		description: 'ID of the agent to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['agent'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Background Information',
				name: 'background_information',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department Names or IDs',
				name: 'department_ids',
				type: 'multiOptions',
				default: [],
				description:
					'IDs of the departments to which the agent belongs. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Location Name or ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description:
					'Choose from the list or specify an ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getLocations',
				},
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Member of Group Names/IDs',
				name: 'member_of',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of the groups that the agent is a member of. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Observer of Group Names/IDs',
				name: 'observer_of',
				type: 'multiOptions',
				default: [],
				description:
					'Comma-separated IDs of the groups that the agent is an observer of. Choose from the list or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
			},
			{
				displayName: 'Scoreboard Level ID',
				name: 'scoreboard_level_id',
				type: 'options',
				description: 'ID of the level of the agent in the Arcade',
				default: 1,
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Beginner',
						value: 1,
					},
					{
						name: 'Intermediate',
						value: 2,
					},
					{
						name: 'Professional',
						value: 3,
					},
					{
						name: 'Expert',
						value: 4,
					},
					{
						name: 'Master',
						value: 5,
					},
					{
						name: 'Guru',
						value: 6,
					},
				],
			},
			{
				displayName: 'Time Format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-Hour Format',
						value: '12h',
					},
					{
						name: '24-Hour Format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work Phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},
];
