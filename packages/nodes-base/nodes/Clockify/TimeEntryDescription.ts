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
				description: 'Get time entrie',
				action: 'Get a time entry',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['timeEntry'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Consider Duration Format',
				name: 'consider-duration-format',
				type: 'boolean',
				default: false,
				description:
					"Whether to return the time entry's duration rounded to minutes or seconds based on duration format (hh:mm or hh:mm:ss) from workspace settings",
			},
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
				operation: ['update'],
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
