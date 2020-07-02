import {
	INodeProperties
} from 'n8n-workflow';

export const tagOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a tag.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns a list of tags for the account.',
			},
			{
				name: 'Get Subscriptions',
				value: 'getSubscriptions',
				description: 'List subscriptions to a tag including subscriber data.',
			},
			{
				name: 'Remove Subscriber',
				value: 'removeSubscriber',
				description: 'Remove a tag from a subscriber.',
			},
			{
				name: 'Add Subscriber',
				value: 'addSubscriber',
				description: 'Add a tag to a subscriber.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const tagFields = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'create',
				],
			},
		},
		default: '',
		description: 'Tag name.',
	},
	{
		displayName: 'Email Address',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'addSubscriber',
					'removeSubscriber',
				],
			},
		},
		default: '',
		description: 'Subscriber email address.',
	},
	{
		displayName: 'Tag ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				operation: [
					'addSubscriber',
					'removeSubscriber',
					'getSubscriptions',
				],
			},
		},
		default: '',
		description: 'Tag ID.',
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
					'tag',
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
				description: 'Subscriber first name.',
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
					'tag',
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
