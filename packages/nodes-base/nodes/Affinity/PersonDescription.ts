import type { INodeProperties } from 'n8n-workflow';

export const personOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['person'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a person',
				action: 'Create a person',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a person',
				action: 'Delete a person',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a person',
				action: 'Get a person',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many persons',
				action: 'Get many people',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a person',
				action: 'Update a person',
			},
		],
		default: 'create',
	},
];

export const personFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                person:create                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['create'],
			},
		},
		description: 'The first name of the person',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['create'],
			},
		},
		description: 'The last name of the person',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Organization Names or IDs',
				name: 'organizations',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				default: [],
				description:
					'Organizations that the person is associated with. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'string',
		description: 'The email addresses of the person',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add To Email',
		},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['create'],
			},
		},
		placeholder: 'info@example.com',
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 person:update                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Person ID',
		name: 'personId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['update'],
			},
		},
		description: 'Unique identifier for the person',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'The first name of the person',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'The last name of the person',
			},
			{
				displayName: 'Organization Names or IDs',
				name: 'organizations',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				default: [],
				description:
					'Organizations that the person is associated with. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
		],
	},
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'string',
		description: 'The email addresses of the person',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add To Email',
		},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['update'],
			},
		},
		placeholder: 'info@example.com',
		default: [],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 person:get                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Person ID',
		name: 'personId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for the person',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'With Interaction Dates',
				name: 'withInteractionDates',
				type: 'boolean',
				default: false,
				description: 'Whether interaction dates will be present on the returned resources',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 person:getAll                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['getAll'],
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
				resource: ['person'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Term',
				name: 'term',
				type: 'string',
				default: '',
				description:
					'A string used to search all the persons in your team’s address book. This could be an email address, a first name or a last name.',
			},
			{
				displayName: 'With Interaction Dates',
				name: 'withInteractionDates',
				type: 'boolean',
				default: false,
				description: 'Whether interaction dates will be present on the returned resources',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 person:delete                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Person ID',
		name: 'personId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['person'],
				operation: ['delete'],
			},
		},
		description: 'Unique identifier for the person',
	},
];
