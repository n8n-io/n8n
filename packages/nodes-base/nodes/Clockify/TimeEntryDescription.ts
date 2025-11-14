import type { INodeProperties } from 'n8n-workflow';

export const timeEntryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['timeEntry'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a time entry',
				action: 'Create a time entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a time entry',
				action: 'Delete a time entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a time entry',
				action: 'Get a time entry',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many time entries',
				action: 'Get many time entries',
			},
			{
				name: 'Stop Timer',
				value: 'stopTimer',
				description: 'Stop currently running timer on workspace for user',
				action: 'Stop currently running timer ',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a time entry',
				action: 'Update a time entry',
			},
		],
		default: 'create',
	},
];

export const timeEntryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 timeEntry:create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['timeEntry'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['workspaceId'],
									loadOptionsMethod: 'loadCustomFieldsForWorkspace',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadProjectsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tagIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadTagsForWorkspace',
				},
				default: [],
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 timeEntry:delete                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Time Entry ID',
		name: 'timeEntryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 timeEntry:get                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Time Entry ID',
		name: 'timeEntryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Hydrated',
				name: 'hydrated',
				type: 'boolean',
				default: false,
				description:
					"Whether to return the time entry's project, task and tags in full and not just their IDs",
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                               timeEntry:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'In Progress',
		name: 'inProgress',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return return in progress time entries for the workspace',
	},
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['workspaceId'],
			loadOptionsMethod: 'loadUsersForWorkspace',
		},
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['getAll'],
				inProgress: [false],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
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
				resource: ['timeEntry'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['getAll'],
				inProgress: [false],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Project Name or ID',
				name: 'project',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadProjectsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description:
					"If provided, you'll get a filtered list of time entires that contain the provided string in their description",
			},
			{
				displayName: 'Hydrated',
				name: 'hydrated',
				type: 'boolean',
				default: false,
				description:
					"Whether to return the time entry's project, task and tags in full and not just their IDs",
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
				description: 'Start time in UTC',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'End time in UTC',
			},
			{
				displayName: 'Week Before',
				name: 'get-week-before',
				type: 'dateTime',
				default: '',
				description: 'Get the week before this datetime in UTC',
			},
			{
				displayName: 'Task',
				name: 'task',
				type: 'string',
				default: '',
				description:
					"If provided, you'll get a filtered list of time entries that matches the provided string in their task ID",
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadTagsForWorkspace',
				},
				default: [],
			},
			// in-progress boolean
			{
				displayName: 'In Progress',
				name: 'in-progress',
				type: 'boolean',
				default: false,
				description: 'Whether to filter only in progress time entries',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                             timeEntry:stopTimer                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'User Name or ID',
		name: 'userId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: ['workspaceId'],
			loadOptionsMethod: 'loadUsersForWorkspace',
		},
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['stopTimer'],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['stopTimer'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'End Time',
				name: 'end',
				type: 'dateTime',
				default: '',
				description: 'Specify the end time of the time entry',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 timeEntry:update                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Time Entry ID',
		name: 'timeEntryId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
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
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: ['workspaceId'],
									loadOptionsMethod: 'loadCustomFieldsForWorkspace',
								},
								default: '',
								description:
									'The ID of the field to add custom field to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Project Name or ID',
				name: 'projectId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadProjectsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Tag Names or IDs',
				name: 'tagIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadTagsForWorkspace',
				},
				default: [],
			},
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'string',
				default: '',
			},
		],
	},
];
