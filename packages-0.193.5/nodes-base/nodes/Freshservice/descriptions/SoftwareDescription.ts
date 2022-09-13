import { INodeProperties } from 'n8n-workflow';

export const softwareOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['software'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a software application',
				action: 'Create a software application',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a software application',
				action: 'Delete a software application',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a software application',
				action: 'Get a software application',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all software applications',
				action: 'Get all software applications',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a software application',
				action: 'Update a software application',
			},
		],
		default: 'create',
	},
];

export const softwareFields: INodeProperties[] = [
	// ----------------------------------------
	//             software: create
	// ----------------------------------------
	{
		displayName: 'Application Type',
		name: 'applicationType',
		type: 'options',
		required: true,
		options: [
			{
				name: 'Desktop',
				value: 'desktop',
			},
			{
				name: 'Mobile',
				value: 'mobile',
			},
			{
				name: 'SaaS',
				value: 'saas',
			},
		],
		default: 'desktop',
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'managed',
				options: [
					{
						name: 'Disabled',
						value: 'disabled',
					},
					{
						name: 'Ignored',
						value: 'ignored',
					},
					{
						name: 'Needs Review',
						value: 'needs review',
					},
					{
						name: 'Restricted',
						value: 'restricted',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             software: delete
	// ----------------------------------------
	{
		displayName: 'Software ID',
		name: 'softwareId',
		description: 'ID of the software application to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//              software: get
	// ----------------------------------------
	{
		displayName: 'Software ID',
		name: 'softwareId',
		description: 'ID of the software application to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             software: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//             software: update
	// ----------------------------------------
	{
		displayName: 'Software ID',
		name: 'softwareId',
		description: 'ID of the software application to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['software'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Application Type',
				name: 'application_type',
				type: 'options',
				default: 'desktop',
				description: 'Type of the software',
				options: [
					{
						name: 'Desktop',
						value: 'desktop',
					},
					{
						name: 'Mobile',
						value: 'mobile',
					},
					{
						name: 'SaaS',
						value: 'saas',
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
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'managed',
				options: [
					{
						name: 'Disabled',
						value: 'disabled',
					},
					{
						name: 'Ignored',
						value: 'ignored',
					},
					{
						name: 'Needs Review',
						value: 'needs review',
					},
					{
						name: 'Restricted',
						value: 'restricted',
					},
				],
			},
		],
	},
];
