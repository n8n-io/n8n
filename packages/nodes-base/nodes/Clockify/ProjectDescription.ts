import type { INodeProperties } from 'n8n-workflow';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['project'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a project',
				action: 'Create a project',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project',
				action: 'Delete a project',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a project',
				action: 'Get a project',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many projects',
				action: 'Get many projects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project',
				action: 'Update a project',
			},
		],
		default: 'create',
	},
];

export const projectFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 project:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of project being created',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['project'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#0000FF',
			},
			{
				displayName: 'Client name or ID',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Estimate',
				name: 'estimateUi',
				placeholder: 'Add estimate',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Estimate',
						name: 'estimateValues',
						values: [
							{
								displayName: 'Estimate',
								name: 'estimate',
								type: 'number',
								default: 0,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Auto',
										value: 'AUTO',
									},
									{
										name: 'Manual',
										value: 'MANUAL',
									},
								],
								default: 'AUTO',
							},
						],
					},
				],
			},
			{
				displayName: 'Is public',
				name: 'isPublic',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'Note about the project',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['get'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['project'],
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
				operation: ['getAll'],
				resource: ['project'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['project'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Client names or IDs',
				name: 'clients',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				default: [],
			},
			{
				displayName: 'Contains client',
				name: 'contains-client',
				type: 'boolean',
				default: false,
				description: 'Whether to return only projects having a client',
			},
			{
				displayName: 'Client status',
				name: 'client-status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
					},
					{
						name: 'Archived',
						value: 'ARCHIVED',
					},
				],
				default: '',
				description: 'If provided, projects will be filtered by whether they have a client',
			},
			{
				displayName: 'Contains user',
				name: 'contains-user',
				type: 'boolean',
				default: false,
				description: 'Whether to return only projects having users',
			},
			{
				displayName: 'Is template',
				name: 'is-template',
				type: 'boolean',
				default: false,
				description: 'Whether to return only projects as templates',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Sort column',
				name: 'sort-column',
				type: 'options',
				options: [
					{
						name: 'Name',
						value: 'NAME',
					},
					{
						name: 'Client name',
						value: 'CLIENT_NAME',
					},
					{
						name: 'Duration',
						value: 'DURATION',
					},
				],
				default: '',
			},
			{
				displayName: 'Sort order',
				name: 'sort-order',
				type: 'options',
				options: [
					{
						name: 'Ascending',
						value: 'ASCENDING',
					},
					{
						name: 'Descending',
						value: 'DESCENDING',
					},
				],
				default: '',
			},
			{
				displayName: 'User name or ID',
				name: 'users',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadUsersForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'User status',
				name: 'user-status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
					},
					{
						name: 'Archived',
						value: 'ARCHIVED',
					},
				],
				default: '',
				description: 'If provided, projects will be filtered by whether they have a client',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 project:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Project ID',
		name: 'projectId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['project'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['project'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Billable',
				name: 'billable',
				type: 'boolean',
				default: true,
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'color',
				default: '#0000FF',
			},
			{
				displayName: 'Client name or ID',
				name: 'clientId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: ['workspaceId'],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Estimate',
				name: 'estimateUi',
				placeholder: 'Add estimate',
				type: 'fixedCollection',
				default: {},
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Estimate',
						name: 'estimateValues',
						values: [
							{
								displayName: 'Estimate',
								name: 'estimate',
								type: 'number',
								default: 0,
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Auto',
										value: 'AUTO',
									},
									{
										name: 'Manual',
										value: 'MANUAL',
									},
								],
								default: 'AUTO',
							},
						],
					},
				],
			},
			{
				displayName: 'Is public',
				name: 'isPublic',
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
				displayName: 'Note',
				name: 'note',
				type: 'string',
				default: '',
				description: 'Note about the project',
			},
		],
	},
];
