import {
	INodeProperties,
 } from 'n8n-workflow';

export const timeTrackingOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
			},
		},
		options: [
			// START_DEPRECATED
			{
				name: 'Log',
				value: 'log',
				description: 'DEPRECATED - Log time on task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'DEPRECATED - Delete a logged time',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'DEPRECATED - Get all logging times on task',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'DEPRECATED - Update a logged time',
			},
			//END_DEPRECATED
			{
				name: 'Get within range',
				value: 'getWithinRange',
				description: 'Get within range',
			},
			{
				name: 'Get singular time entry',
				value: 'getSingular',
				description:'Get singular time entry',
			},
			{
				name: 'Get running',
				value: 'getRunning',
				description: 'Get running',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a time entry',
			},
			{
				name: 'Remove tags',
				value: 'removeTags',
				description:'Remove tags from time entries',
			},
			{
				name: 'Get all tags',
				value: 'getAllTags',
				description:'Get all tags from time entries',
			},
			{
				name: 'Add tags',
				value: 'addTags',
				description:'Add tags from time entries',
			},
			{
				name: 'Change tag name',
				value: 'changeTagName',
				description:'Change tag name from time entries',
			},
			{
				name: 'Start',
				value: 'start',
				description:'Start a time Entry',
			},
			{
				name: 'Stop',
				value: 'stop',
				description:'Stop a time Entry',
			},
			{
				name: 'Delete',
				value: 'deleteV2',
				description:'Delete a time Entry',
			},
			{
				name: 'Update',
				value: 'updateV2',
				description:'Update a time Entry',
			},
		],
		default: 'log',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const timeTrackingFields = [

/* -------------------------------------------------------------------------- */
/*                                timeTracking:log                            */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Duration',
				value: 'duration',
			},
			{
				name: 'From/To',
				value: 'fromTo',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
			},
		},
	},
	{
		displayName: 'Minutes',
		name: 'minutes',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
				type: [
					'duration',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'log',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:delete                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Interval ID',
		name: 'interval',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'delete',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:getAll                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getAll',
				],
			},
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
					'timeTracking',
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
/*                                timeTracking:update                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Interval ID',
		name: 'interval',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: '',
		options: [
			{
				name: 'Duration',
				value: 'duration',
			},
			{
				name: 'From/To',
				value: 'fromTo',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Minutes',
		name: 'minutes',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
				type: [
					'duration',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'update',
				],
				type: [
					'fromTo',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:getWithinRange                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getWithinRange',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
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
					'timeTracking',
				],
				operation: [
					'getWithinRange',
				],
			},
		},
		options: [
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:getSingular                    */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getSingular',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Timer ID',
		name: 'timer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getSingular',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:getRunning                     */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getRunning',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:create                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
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
					'timeTracking',
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
					'timeTracking',
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
					'timeTracking',
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
					'timeTracking',
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
					'timeTracking',
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
		displayName: 'Archived',
		name: 'archived',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
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
				'archived',
			],
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
					'timeTracking',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the time entry'
			},
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Minutes',
				name: 'minutes',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 0,
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'options',
				loadOptionsDependsOn: [
					'list',
				],
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
				},
				default: [],
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:removeTags                     */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'removeTags',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Timer ID',
		name: 'timer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'removeTags',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'removeTags',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:getAllTags                     */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'getAllTags',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:addTags                        */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'addTags',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Timer ID',
		name: 'timer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'addTags',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Tag',
		name: 'tags',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'addTags',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:changeTagName                  */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'changeTagName',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
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
					'timeTracking',
				],
				operation: [
					'changeTagName',
				],
			},
		},
		options: [
			{
				displayName: 'Old name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'New name',
				name: 'new_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Tag bg color',
				name: 'tag_bg',
				type: 'color',
				default: '',
			},
			{
				displayName: 'Tag fg color',
				name: 'tag_fg',
				type: 'color',
				default: '',
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:start                          */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
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
		displayName: 'Space ID',
		name: 'space',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'start',
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
					'timeTracking',
				],
				operation: [
					'start',
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
					'timeTracking',
				],
				operation: [
					'start',
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
					'timeTracking',
				],
				operation: [
					'start',
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
					'timeTracking',
				],
				operation: [
					'start',
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
					'timeTracking',
				],
				operation: [
					'start',
				],
			},
		},
		required: true,
	},
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'start',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTasks',
			loadOptionsDependsOn: [
				'list',
				'archived',
			],
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
					'timeTracking',
				],
				operation: [
					'start',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the time entry'
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:stop                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
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
/*                                timeTracking:deleteV2                       */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'deleteV2',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Timer ID',
		name: 'timer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'deleteV2',
				],
			},
		},
		required: true,
	},
/* -------------------------------------------------------------------------- */
/*                                timeTracking:updateV2                       */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'updateV2',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		required: true,
	},
	{
		displayName: 'Timer ID',
		name: 'timer',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'timeTracking',
				],
				operation: [
					'updateV2',
				],
			},
		},
		required: true,
	},
] as INodeProperties[];
