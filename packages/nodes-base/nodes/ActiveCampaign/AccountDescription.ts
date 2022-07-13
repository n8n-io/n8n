import {
	INodeProperties,
} from 'n8n-workflow';

import {
	activeCampaignDefaultGetAllProperties,
} from './GenericFunctions';

export const accountOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'account',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an account',
				action: 'Create an account',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an account',
				action: 'Delete an account',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an account',
				action: 'Get an account',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all accounts',
				action: 'Get all accounts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an account',
				action: 'Update an account',
			},
		],
		default: 'create',
	},
];

export const accountFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'account',
				],
			},
		},
		description: 'Account\'s name',
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
					'account',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Account URL',
				name: 'accountUrl',
				type: 'string',
				default: '',
				description: 'Account\'s website',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Custom Fields',
				description: 'Adds a custom fields to set also values which have not been predefined',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAccountCustomFields',
								},
								default: '',
								description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value of the field to set',
							},
						],
					},
				],
			},
		],
	},

	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'account',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the account to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'account',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Account\'s name',
			},
			{
				displayName: 'Account URL',
				name: 'accountUrl',
				type: 'string',
				default: '',
				description: 'Account\'s website',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				placeholder: 'Add Fields',
				description: 'Adds a custom fields to set also values which have not been predefined',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'customFieldId',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getAccountCustomFields',
								},
								default: '',
								description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Value of the field to set',
							},
						],
					},
				],
			},
		],
	},
	// ----------------------------------
	//         account:delete
	// ----------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'account',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the account to delete',
	},
	// ----------------------------------
	//         account:get
	// ----------------------------------
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'account',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the account to get',
	},
	// ----------------------------------
	//         account:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('account', 'getAll'),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'account',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search by name',
			},
		],
	},

];
