import {
	INodeProperties,
} from 'n8n-workflow';

export const projectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a project',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a project',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all projects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
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
		description: 'Name of project being created.',
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
				displayName: 'Client ID',
				name: 'clientId',
				type: 'options',
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
		description: 'If all results should be returned or only up to a given limit.',
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
		description: 'How many results to return.',
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
				displayName: 'Client IDs',
				name: 'clients',
				type: 'multiOptions',
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
				description: 'If provided, projects will be filtered by whether they have a client.;			',
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
				description: 'If provided, projects will be filtered by whether they have a client.',
			},
			{
				displayName: 'Contains User',
				name: 'contains-user',
				type: 'boolean',
				default: false,
				description: 'If provided, projects will be filtered by whether they have users.',
			},
			{
				displayName: 'Is Template',
				name: 'is-template',
				type: 'boolean',
				default: false,
				description: 'If provided, projects will be filtered by whether they are used as a template.',
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
				displayName: 'User IDs',
				name: 'users',
				type: 'options',
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
				description: 'If provided, projects will be filtered by whether they have a client.',
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
				displayName: 'Client ID',
				name: 'clientId',
				type: 'options',
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
