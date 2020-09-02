import { INodeProperties } from "n8n-workflow";

export const accountOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
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
			},
/*
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an account',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get data of an account',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all accounts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an account',
			},
 */
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const accountFields = [
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
		description: 'Account\'s name.',
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
				displayName: 'Url',
				name: 'accountUrl',
				type: 'string',
				default: '',
				description: 'Account\'s website',
			},
			{
				displayName: 'Custom Properties',
				name: 'customProperties',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the property to set.',
							},
						]
					},
				],
			},
		],
	},
/*
	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact to update.',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update.',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Email of the contact.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact.',
			},
			{
				displayName: 'Custom Properties',
				name: 'customProperties',
				placeholder: 'Add Custom Property',
				description: 'Adds a custom property to set also values which have not been predefined.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Property',
						values: [
							{
								displayName: 'Property Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the property to set.',
							},
							{
								displayName: 'Property Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the property to set.',
							},
						]
					},
				],
			},
		],
	},

	// ----------------------------------
	//         contact:delete
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact to delete.',
	},

	// ----------------------------------
	//         contact:get
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact to get.',
	},

	// ----------------------------------
	//         contact:getAll
	// ----------------------------------
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
					'contact',
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
					'contact',
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
 */
] as INodeProperties[];
