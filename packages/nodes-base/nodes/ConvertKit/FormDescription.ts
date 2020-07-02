import {
	INodeProperties
} from 'n8n-workflow';

export const formOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
			},
		},
		options: [
			{
				name: 'Add Subscriber',
				value: 'addSubscriber',
				description: 'Add a subscriber.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get a list of all the forms for your account.',
			},
			{
				name: 'Get Subscriptions',
				value: 'getSubscriptions',
				description: 'List subscriptions to a form including subscriber data.',
			},
		],
		default: 'addSubscriber',
		description: 'The operations to perform.',
	},
] as INodeProperties[];

export const formFields = [
	{
		displayName: 'Email Address',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'addSubscriber',
				],
			},
		},
		default: '',
		description: `The subscriber's email address.`,
	},
	{
		displayName: 'Form ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'form',
				],
				operation: [
					'addSubscriber',
					'getSubscriptions',
				],
			},
		},
		default: '',
		description: 'Form ID.',
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
					'form',
				],
				operation: [
					'addSubscriber',
				],
			},
		},
		options: [
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: `The subscriber's first name.`,
			},
			{
				displayName: 'Custom Fields',
				name: 'fields',
				placeholder: 'Add Custom Field',
				description: 'Object of key/value pairs for custom fields (the custom field must exist before you can use it here).',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'field',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Key',
								name: 'key',
								type: 'string',
								default: '',
								placeholder: 'last_name',
								description: `The field's key.`,
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'Doe',
								description: 'Value of the field.',
							},
						],
					},
				],
			},
		],
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
					'form',
				],
				operation: [
					'getSubscriptions',
				],
			},
		},
		options: [
			{
				displayName: 'Subscriber State',
				name: 'subscriberState',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'active',
					},
					{
						name: 'Cancelled',
						value: 'cancelled',
					},
				],
				default: 'active',
			},
		],
		description: 'Receive only active subscribers or cancelled subscribers.',
	},
] as INodeProperties[];
