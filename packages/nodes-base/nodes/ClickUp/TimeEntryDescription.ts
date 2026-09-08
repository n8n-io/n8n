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
				name: 'Get many',
				value: 'getAll',
				description: 'Get many time entries',
				action: 'Get many time entries',
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a time entry',
				action: 'Start a time entry',
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop the current running timer',
				action: 'Stop a time entry',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a time Entry',
				action: 'Update a time entry',
			},
		],
		default: 'create',
	},
];

export const timeEntryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['getAll'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Return all',
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
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'End date',
				name: 'end_date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Start date',
				name: 'start_date',
				type: 'dateTime',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['get'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Running',
		name: 'running',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['get'],
			},
		},
		default: false,
		description: 'Whether to return just the current running time entry',
	},
	{
		displayName: 'Time entry ID',
		name: 'timeEntry',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['get'],
				running: [false],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:create                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Space name or ID',
		name: 'space',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: ['team'],
		},
		required: true,
	},
	{
		displayName: 'Folderless list',
		name: 'folderless',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		required: true,
	},
	{
		displayName: 'Folder name or ID',
		name: 'folder',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
				folderless: [false],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolders',
			loadOptionsDependsOn: ['space'],
		},
		required: true,
	},
	{
		displayName: 'List name or ID',
		name: 'list',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
				folderless: [true],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolderlessLists',
			loadOptionsDependsOn: ['space'],
		},
		required: true,
	},
	{
		displayName: 'List name or ID',
		name: 'list',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
				folderless: [false],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: ['folder'],
		},
		required: true,
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		required: true,
		default: '',
	},
	{
		displayName: 'Duration (minutes)',
		name: 'duration',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		default: 0,
		required: true,
		description: 'Duration in minutes',
	},
	{
		displayName: 'Task name or ID',
		name: 'task',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTasks',
			loadOptionsDependsOn: ['list'],
		},
		default: '',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assignee name or ID',
				name: 'assignee',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
					loadOptionsDependsOn: ['list'],
				},
				default: [],
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the time entry',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['team'],
					loadOptionsMethod: 'getTimeEntryTags',
				},
				default: [],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:start                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['start'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['start'],
			},
		},
		required: true,
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['start'],
			},
		},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the time entry',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:stop                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['stop'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:delete                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['delete'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Time entry ID',
		name: 'timeEntry',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['delete'],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team name or ID',
		name: 'team',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Space name or ID',
		name: 'space',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: ['team'],
		},
		required: true,
	},
	{
		displayName: 'Folderless list',
		name: 'folderless',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Folder name or ID',
		name: 'folder',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
				folderless: [false],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolders',
			loadOptionsDependsOn: ['space'],
		},
		required: true,
	},
	{
		displayName: 'List name or ID',
		name: 'list',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
				folderless: [true],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolderlessLists',
			loadOptionsDependsOn: ['space'],
		},
		required: true,
	},
	{
		displayName: 'List name or ID',
		name: 'list',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
				folderless: [false],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: ['folder'],
		},
		required: true,
	},
	{
		displayName: 'Archived',
		name: 'archived',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Time entry ID',
		name: 'timeEntry',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		required: true,
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['timeEntry'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assignee name or ID',
				name: 'assignee',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
					loadOptionsDependsOn: ['list'],
				},
				default: [],
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the time entry',
			},
			{
				displayName: 'Duration (minutes)',
				name: 'duration',
				type: 'number',
				default: 0,
				description: 'Duration in minutes',
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Tag names or IDs',
				name: 'tags',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['spaceId'],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Task name or ID',
				name: 'task',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTasks',
					loadOptionsDependsOn: ['archived', 'list'],
				},
				default: '',
			},
		],
	},
];
