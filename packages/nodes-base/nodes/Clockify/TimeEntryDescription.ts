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
				description: 'Get time entrie',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a time entry',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
				resource: [
					'timeEntry',
				],
				operation: [
					'create',
				],
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
				operation: [
					'create',
				],
				resource: [
					'timeEntry',
				],
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
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'workspaceId',
									],
									loadOptionsMethod: 'loadCustomFieldsForWorkspace',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field.',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
					loadOptionsMethod: 'loadProjectsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Tag IDs',
				name: 'tagIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
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
				resource: [
					'timeEntry',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'timeEntry',
				],
				operation: [
					'get',
				],
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
				operation: [
					'get',
				],
				resource: [
					'timeEntry',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Consider Duration Format',
				name: 'consider-duration-format',
				type: 'boolean',
				default: false,
				description: `If provided, returned timeentry's duration will be rounded to minutes or seconds based on duration format (hh:mm or hh:mm:ss) from workspace settings.`,
			},
			{
				displayName: 'Hydrated',
				name: 'hydrated',
				type: 'boolean',
				default: false,
				description: `If provided, returned timeentry's project,task and tags will be returned in full and not just their ids`,
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
				resource: [
					'timeEntry',
				],
				operation: [
					'update',
				],
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
				operation: [
					'update',
				],
				resource: [
					'timeEntry',
				],
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
				description: 'Filter by custom fields ',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsDependsOn: [
										'workspaceId',
									],
									loadOptionsMethod: 'loadCustomFieldsForWorkspace',
								},
								default: '',
								description: 'The ID of the field to add custom field to.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field.',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
			},
			{
				displayName: 'End',
				name: 'end',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'options',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
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
				displayName: 'Tag IDs',
				name: 'tagIds',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
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
