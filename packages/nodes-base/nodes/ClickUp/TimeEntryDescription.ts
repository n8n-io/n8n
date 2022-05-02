import {
	INodeProperties,
} from 'n8n-workflow';

export const timeEntryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a time entry',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a time entry',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a time entry',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all time entries',
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a time entry',
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Stop the current running timer',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a time Entry',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
];

export const timeEntryFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:getAll                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
					'timeEntry',
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
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'End Date',
				name: 'end_date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Start Date',
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
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
		displayName: 'Running',
		name: 'running',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'get',
				],
			},
		},
		default: false,
		description: 'When set to true it will return just the current running time entry',
	},
	{
		displayName: 'Time Entry ID',
		name: 'timeEntry',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'get',
				],
				running: [
					false,
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:create                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
		displayName: 'Space ID',
		name: 'space',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: [
				'team',
			],
		},
		required: true,
	},
	{
		displayName: 'Folderless List',
		name: 'folderless',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Folder ID',
		name: 'folder',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
				folderless: [
					false,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolders',
			loadOptionsDependsOn: [
				'space',
			],
		},
		required: true,
	},
	{
		displayName: 'List ID',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
				folderless: [
					true,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolderlessLists',
			loadOptionsDependsOn: [
				'space',
			],
		},
		required: true,
	},
	{
		displayName: 'List ID',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
				folderless: [
					false,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'folder',
			],
		},
		required: true,
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
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
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
			},
		},
		default: 0,
		required: true,
		description: 'Duration in minutes',
	},
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTasks',
			loadOptionsDependsOn: [
				'list',
			],
		},
		default: '',
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
					'timeEntry',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee IDs',
				name: 'assignee',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
					loadOptionsDependsOn: [
						'list',
					],
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
				displayName: 'Tags IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'team',
					],
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
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'start',
				],
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
				resource: [
					'timeEntry',
				],
				operation: [
					'start',
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
					'timeEntry',
				],
				operation: [
					'start',
				],
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
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'stop',
				],
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
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
		displayName: 'Time Entry ID',
		name: 'timeEntry',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},

	/* -------------------------------------------------------------------------- */
	/*                                timeEntry:update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
		displayName: 'Space ID',
		name: 'space',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getSpaces',
			loadOptionsDependsOn: [
				'team',
			],
		},
		required: true,
	},
	{
		displayName: 'Folderless List',
		name: 'folderless',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Folder ID',
		name: 'folder',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
				folderless: [
					false,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolders',
			loadOptionsDependsOn: [
				'space',
			],
		},
		required: true,
	},
	{
		displayName: 'List ID',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
				folderless: [
					true,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolderlessLists',
			loadOptionsDependsOn: [
				'space',
			],
		},
		required: true,
	},
	{
		displayName: 'List ID',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
				folderless: [
					false,
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'folder',
			],
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
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Time Entry ID',
		name: 'timeEntry',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeEntry',
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
					'timeEntry',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Assignee IDs',
				name: 'assignee',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
					loadOptionsDependsOn: [
						'list',
					],
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
				displayName: 'Tags IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'spaceId',
					],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Task ID',
				name: 'task',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTasks',
					loadOptionsDependsOn: [
						'archived',
						'list',
					],
				},
				default: '',
			},
		],
	},
];
