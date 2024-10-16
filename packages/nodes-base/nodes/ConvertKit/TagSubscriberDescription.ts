import type { INodeProperties } from 'n8n-workflow';

export const tagSubscriberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tagSubscriber'],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a tag to a subscriber',
				action: 'Add a tag to a subscriber',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List subscriptions to a tag including subscriber data',
				action: 'Get many tag subscriptions',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a tag from a subscriber',
				action: 'Delete a tag from a subscriber',
			},
		],
		default: 'create',
	},
];

export const tagSubscriberFields: INodeProperties[] = [
	{
		displayName: 'Tag Name or ID',
		name: 'tagId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTags',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['tagSubscriber'],
				operation: ['add', 'getAll', 'delete'],
			},
		},
		default: '',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		required: true,
		displayOptions: {
			show: {
				resource: ['tagSubscriber'],
				operation: ['add', 'delete'],
			},
		},
		default: '',
		description: 'Subscriber email address',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['tagSubscriber'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'fields',
				placeholder: 'Add Custom Field',
				description:
					'Object of key/value pairs for custom fields (the custom field must exist before you can use it here)',
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
								description: "The field's key",
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'Doe',
								description: 'Value of the field',
							},
						],
					},
				],
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'Subscriber first name',
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['tagSubscriber'],
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
				operation: ['getAll'],
				resource: ['tagSubscriber'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['tagSubscriber'],
				operation: ['getAll'],
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
		description: 'Receive only active subscribers or cancelled subscribers',
	},
];
