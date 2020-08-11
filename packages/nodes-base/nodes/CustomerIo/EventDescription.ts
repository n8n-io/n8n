import { INodeProperties } from 'n8n-workflow';

export const eventOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Track',
				value: 'track',
				description: 'Track a customer event.',
			},
			{
				name: 'Track Anonymous',
				value: 'trackAnonymous',
				description: 'Track an anonymous event.',
			},
		],
		default: 'track',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const eventFields = [

/* -------------------------------------------------------------------------- */
/*                                   event:track                              */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'ID',
		name: 'id',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'track'
				]
			},
		},
		description: 'The unique identifier for the customer.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'create', 'update'
				]
			},
		},
		description: 'The email address of the user.',
	},
	{
		displayName: 'Created at',
		name: 'createdAt',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'create', 'update'
				]
			},
		},
		description: 'The UNIX timestamp from when the user was created.',
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
					'event',
				],
				operation: [
					'track'
				],
			},
		},
		options: [
			{
				displayName: 'Custom Attributes',
				name: 'customAttributes',
				type: 'fixedCollection',
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Attribute',
						name: 'customAttribute',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'Attribute name.',
								placeholder: 'Price'
							},

							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Attribute value.',
								placeholder: '25.50'
							},
						],
					},
				]
			},
		],
	},
/* -------------------------------------------------------------------------- */
/*                                   event:track anonymous                    */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'trackAnonymous'
				]
			},
		},
		description: 'The unique identifier for the customer.',
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
					'event',
				],
				operation: [
					'trackAnonymous'
				],
			},
		},
		options: [
			{
				displayName: 'Custom Attributes',
				name: 'customAttributes',
				type: 'fixedCollection',
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Attribute',
						name: 'customAttribute',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'string',
								required: true,
								default: '',
								description: 'Attribute name.',
								placeholder: 'Price'
							},

							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Attribute value.',
								placeholder: '25.50'
							},
						],
					},
				]
			},
		],
	},
] as INodeProperties[];
