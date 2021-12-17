import { INodeProperties } from 'n8n-workflow';

export const customerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
			},
		},
		options: [
			{
				name: 'Create/Update',
				value: 'upsert',
				description: 'Create/Update a customer.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a customer.',
			},
		],
		default: 'upsert',
		description: 'The operation to perform.',
	},
];

export const customerFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                   customer:delete			            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'delete',
				],
			},
		},
		description: 'The unique identifier for the customer.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                   customer:upsert			              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'upsert',
				],
			},
		},
		description: 'The unique identifier for the customer.',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'upsert',
				],
			},
		},
	},
	{
		displayName: ' Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'upsert',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: 'Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-companys---companies-api">here</a>.',
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
					'customer',
				],
				operation: [
					'upsert',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Custom Properties',
				name: 'customProperties',
				type: 'fixedCollection',
				default: {},
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'Property name.',
								placeholder: 'Plan',
							},

							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Property value.',
								placeholder: 'Basic',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'The email address of the user.',
			},
			{
				displayName: 'Created at',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
				description: 'The UNIX timestamp from when the user was created.',
			},
		],
	},
];
