import type { INodeProperties } from 'n8n-workflow';

export const eventOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Track',
				value: 'track',
				description: 'Track a customer event',
				action: 'Track a customer event',
			},
			{
				name: 'Track anonymous',
				value: 'trackAnonymous',
				description: 'Track an anonymous event',
				action: 'Track an anonymous event',
			},
		],
		default: 'track',
	},
];

export const eventFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                   event:track                              */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['track'],
			},
		},
		description: 'The unique identifier for the customer',
	},
	{
		displayName: 'Event name',
		name: 'eventName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['track'],
			},
		},
		description: 'Name of the event to track',
	},
	{
		displayName: 'JSON parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['track'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['track'],
				jsonParameters: [true],
			},
		},
		description:
			'Object of values to set as described <a href="https://customer.io/docs/api-triggered-data-format#basic-data-formatting">here</a>',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['track'],
				jsonParameters: [false],
			},
		},
		options: [
			{
				displayName: 'Custom attributes',
				name: 'customAttributes',
				type: 'fixedCollection',
				default: {},
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
								description: 'Attribute name',
								placeholder: 'Price',
							},

							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Attribute value',
								placeholder: '25.50',
							},
						],
					},
				],
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				description: 'Used to change event type. For Page View events set to "page".',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                   event:track anonymous                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event name',
		name: 'eventName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['trackAnonymous'],
			},
		},
		description: 'The unique identifier for the customer',
	},
	{
		displayName: 'JSON parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['trackAnonymous'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['trackAnonymous'],
				jsonParameters: [true],
			},
		},
		description:
			'Object of values to set as described <a href="https://customer.io/docs/api-triggered-data-format#basic-data-formatting">here</a>',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['trackAnonymous'],
				jsonParameters: [false],
			},
		},
		options: [
			{
				displayName: 'Custom attributes',
				name: 'customAttributes',
				type: 'fixedCollection',
				default: {},
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
								description: 'Attribute name',
								placeholder: 'Price',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								required: true,
								default: '',
								description: 'Attribute value',
								placeholder: '25.50',
							},
						],
					},
				],
			},
		],
	},
];
