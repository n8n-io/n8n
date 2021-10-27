import {
	INodeProperties,
} from 'n8n-workflow';

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
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a task',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all tasks',
			},
			{
				name: 'Member',
				value: 'member',
				description: 'Get task members',
			},
			{
				name: 'Set Custom Field',
				value: 'setCustomField',
				description: 'Set a custom field',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
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
		displayName: 'Team ID',
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
		displayName: 'Space ID',
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
					'task',
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
					'task',
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
					'task',
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
					'task',
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
				displayName: 'Assignees',
				name: 'assignees',
				type: 'multiOptions',
				loadOptionsDependsOn: [
					'list',
				],
				typeOptions: {
					loadOptionsMethod: 'getAssignees',
				},
				default: [],
			},
			{
				displayName: 'Custom Fields JSON',
				name: 'customFieldsJson',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'Custom fields to set as JSON in the format:<br />[{"id": "", "value": ""}]',
			},
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
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Markdown Content',
				name: 'markdownContent',
				type: 'boolean',
				default: false,
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
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 4,
				},
				description: 'Integer mapping as 1 : Urgent, 2 : High, 3 : Normal, 4 : Low',
				default: 3,
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Start Date Time',
				name: 'startDateTime',
				type: 'boolean',
				default: false,
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
				displayName: 'Add Assignees',
				name: 'addAssignees',
				type: 'string',
				default: '',
				description: 'Assignees IDs. Multiple ca be added separated by comma',
			},
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
				displayName: 'Due Date',
				name: 'dueDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Due Date Time',
				name: 'dueDateTime',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Is Markdown Content',
				name: 'markdownContent',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
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
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 4,
				},
				description: 'Integer mapping as 1 : Urgent, 2 : High, 3 : Normal, 4 : Low',
				default: 3,
			},
			{
				displayName: 'Remove Assignees',
				name: 'removeAssignees',
				type: 'string',
				default: '',
				description: 'Assignees IDs. Multiple ca be added separated by comma',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'status',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Start Date Time',
				name: 'startDateTime',
				type: 'boolean',
				default: false,
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
	/*                                 task:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Team ID',
		name: 'team',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
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
		displayName: 'Space ID',
		name: 'space',
		type: 'options',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
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
					'task',
				],
				operation: [
					'getAll',
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
					'task',
				],
				operation: [
					'getAll',
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
					'task',
				],
				operation: [
					'getAll',
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
					'task',
				],
				operation: [
					'getAll',
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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: true,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'task',
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
			maxValue: 100,
		},
		default: 50,
		description: 'How many results to return.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
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
					loadOptionsMethod: 'getAssignees',
				},

				default: [],
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								options: [
									{
										name: 'Equal',
										value: 'equal',
									},
									{
										name: '<',
										value: '<',
									},
									{
										name: '<=',
										value: '<=',
									},
									{
										name: '>',
										value: '>',
									},
									{
										name: '>=',
										value: '>=',
									},
									{
										name: '!=',
										value: '!=',
									},
									{
										name: 'Is Null',
										value: 'IS NULL',
									},
									{
										name: 'Is Not Null',
										value: 'IS NOT NULL',
									},
								],
								default: 'equal',
								description: 'The value to set on custom field.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								displayOptions: {
									hide: {
										operator: [
											'IS NULL',
											'IS NOT NULL',
										],
									},
								},
								default: '',
								description: 'The value to set on custom field.',
							},
						],
					},
				],
			},
			{
				displayName: 'Date Created Greater Than',
				name: 'dateCreatedGt',
				type: 'dateTime',
				default: '',
				description: 'Filter date created greater',
			},
			{
				displayName: 'Date Created Less Than',
				name: 'dateCreatedLt',
				type: 'dateTime',
				default: '',
				description: 'Filter date created less than posix time',
			},
			{
				displayName: 'Date Updated Greater Than',
				name: 'dateUpdatedGt',
				type: 'dateTime',
				default: '',
				description: 'Filter date updated greater than',
			},
			{
				displayName: 'Date Update Less Than',
				name: 'dateUpdatedLt',
				type: 'dateTime',
				default: '',
				description: 'Filter date updated less than',
			},
			{
				displayName: 'Due Date Greater Than',
				name: 'dueDateGt',
				type: 'dateTime',
				default: '',
				description: 'Filter due date greater than',
			},
			{
				displayName: 'Due Date Less Than',
				name: 'dueDateLt',
				type: 'dateTime',
				default: '',
				description: 'Filter due date less than',
			},
			{
				displayName: 'Include Closed',
				name: 'includeClosed',
				type: 'boolean',
				default: false,
				description: 'The response does by default not include closed tasks. Set this to true and dont send a status filter to include closed tasks.',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				default: '',
				options: [
					{
						name: 'ID',
						value: 'id',
					},
					{
						name: 'Created',
						value: 'created',
					},
					{
						name: 'Updated',
						value: 'updated',
					},
					{
						name: 'Due Date',
						value: 'dueDate',
					},
				],
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				loadOptionsDependsOn: [
					'list',
				],
				typeOptions: {
					loadOptionsMethod: 'getStatuses',
				},
				default: [],
			},
			{
				displayName: 'Subtasks',
				name: 'subtasks',
				type: 'boolean',
				default: false,
				description: 'Include subtasks, default false',
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
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                task:delete                                 */
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
					'delete',
				],
			},
		},
		description: 'task ID',
	},

	/* -------------------------------------------------------------------------- */
	/*                                task:member                                 */
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
					'member',
				],
			},
		},
		description: 'Task ID',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'member',
				],
			},
		},
		default: true,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'member',
				],
				returnAll: [
					false,
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
	/*                                task:setCustomField                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Task ID',
		name: 'task',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'setCustomField',
				],
			},
		},
		description: 'The ID of the task to add custom field to.',
	},
	{
		displayName: 'Field ID',
		name: 'field',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'setCustomField',
				],
			},
		},
		description: 'The ID of the field to add custom field to.',
	},
	{
		displayName: 'Value is JSON',
		name: 'jsonParse',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'setCustomField',
				],
			},
		},
		default: false,
		description: `The value is JSON and will be parsed as such. Is needed
		if for example needed for labels which expects the value
		to be an array.`,
	},
	{
		displayName: 'Value',
		name: 'value',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'task',
				],
				operation: [
					'setCustomField',
				],
			},
		},
		description: 'The value to set on custom field.',
	},
] as INodeProperties[];
