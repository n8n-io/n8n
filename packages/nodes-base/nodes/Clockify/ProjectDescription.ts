import {
	INodeProperties,
} from 'n8n-workflow';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'project',
				],
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all projects',
				action: 'Get all projects',
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
		displayName: 'Project Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of project being created',
		displayOptions: {
			show: {
				resource: [
					'project',
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
					'project',
				],
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
				displayName: 'Client Name or ID',
				name: 'clientId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Estimate',
				name: 'estimateUi',
				placeholder: 'Add Estimate',
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
				displayName: 'Is Public',
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
				resource: [
					'project',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'project',
				],
				operation: [
					'get',
				],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 project:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'project',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'project',
				],
				returnAll: [
					false,
				],
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'project',
				],
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
				displayName: 'Client Names or IDs',
				name: 'clients',
				type: 'multiOptions',
				description: 'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				default: [],
			},
			{
				displayName: 'Contains Client',
				name: 'contains-client',
				type: 'boolean',
				default: false,
				description: 'Whether to return only projects having a client',
			},
			{
				displayName: 'Client Status',
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
				displayName: 'Contains User',
				name: 'contains-user',
				type: 'boolean',
				default: false,
				description: 'Whether to return only projects having users',
			},
			{
				displayName: 'Is Template',
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
				displayName: 'Sort Column',
				name: 'sort-column',
				type: 'options',
				options: [
					{
						name: 'Name',
						value: 'NAME',
					},
					{
						name: 'Client Name',
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
				displayName: 'Sort Order',
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
				displayName: 'User Name or ID',
				name: 'users',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
					loadOptionsMethod: 'loadUsersForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'User Status',
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
				resource: [
					'project',
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
					'project',
				],
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
				displayName: 'Client Name or ID',
				name: 'clientId',
				type: 'options',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
				typeOptions: {
					loadOptionsDependsOn: [
						'workspaceId',
					],
					loadOptionsMethod: 'loadClientsForWorkspace',
				},
				default: '',
			},
			{
				displayName: 'Estimate',
				name: 'estimateUi',
				placeholder: 'Add Estimate',
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
				displayName: 'Is Public',
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
