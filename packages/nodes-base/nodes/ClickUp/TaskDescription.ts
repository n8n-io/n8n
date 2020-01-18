import { INodeProperties } from 'n8n-workflow';

export const taskOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a task',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const taskFields = [

/* -------------------------------------------------------------------------- */
/*                                task:create                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
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
		displayName: 'Space',
		name: 'space',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
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
			]
		},
		required: true,
	},
	{
		displayName: 'Folder',
		name: 'folder',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFolders',
			loadOptionsDependsOn: [
				'space',
			]
		},
		required: true,
	},
	{
		displayName: 'List',
		name: 'list',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getLists',
			loadOptionsDependsOn: [
				'folder',
			]
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
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		description: 'The first name on the task',
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
					'task',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Is Markdown Content',
				name: 'markdownContent',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Assignees',
				name: 'assignees',
				type: 'multiOptions',
				loadOptionsDependsOn: [
					'list',
				],
				typeOptions: {
					loadOptionsMethod: 'getAssignees'
				},

				default: [],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				loadOptionsDependsOn: [
					'space',
				],
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The array of tags applied to this task',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				loadOptionsDependsOn: [
					'list',
				],
				typeOptions: {
					loadOptionsMethod: 'getStatuses',
				},
				default: '',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				typeOptions: {
					maxValue: 4,
				},
				description: 'Integer mapping as 1 : Urgent, 2 : High, 3 : Normal, 4 : Low',
				default: 1,
			},
			{
				displayName: 'Notify All',
				name: 'notifyAll',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start Date Time',
				name: 'startDateTime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Time Estimate',
				name: 'timeEstimate',
				type: 'number',
				description: 'time estimate in minutes',
				default: 1,
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                task:update                                 */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Task ID',
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
					'task',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'Is Markdown Content',
				name: 'markdownContent',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				typeOptions: {
					maxValue: 4,
				},
				description: 'Integer mapping as 1 : Urgent, 2 : High, 3 : Normal, 4 : Low',
				default: 1,
			},
			{
				displayName: 'Notify All',
				name: 'notifyAll',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Parent ID',
				name: 'parentId',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Start Date Time',
				name: 'startDateTime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Time Estimate',
				name: 'timeEstimate',
				type: 'number',
				description: 'time estimate in minutes',
				default: 1,
			},
		],

	},
/* -------------------------------------------------------------------------- */
/*                                 task:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Task ID',
	},
/* -------------------------------------------------------------------------- */
/*                                task:delete                               */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'task ID',
	},
] as INodeProperties[];
