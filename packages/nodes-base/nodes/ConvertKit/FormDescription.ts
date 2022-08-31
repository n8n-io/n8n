import { INodeProperties } from 'n8n-workflow';

export const formOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['form'],
			},
		},
		options: [
			{
				name: 'Add Subscriber',
				value: 'addSubscriber',
				description: 'Add a subscriber',
				action: 'Add a subscriber',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all forms',
				action: 'Get all forms',
			},
			{
				name: 'Get Subscriptions',
				value: 'getSubscriptions',
				description: 'List subscriptions to a form including subscriber data',
				action: 'Get all subscriptions',
			},
		],
		default: 'addSubscriber',
		description: 'The operations to perform',
	},
];

export const formFields: INodeProperties[] = [
	{
		displayName: 'Form Name or ID',
		name: 'id',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getForms',
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['addSubscriber', 'getSubscriptions'],
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
				resource: ['form'],
				operation: ['addSubscriber'],
			},
		},
		default: '',
		description: "The subscriber's email address",
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['form'],
				operation: ['addSubscriber'],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'fieldsUi',
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
						name: 'fieldsValues',
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
				description: "The subscriber's first name",
			},
		],
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll', 'getSubscriptions'],
				resource: ['form'],
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
				operation: ['getAll', 'getSubscriptions'],
				resource: ['form'],
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
				resource: ['form'],
				operation: ['getSubscriptions'],
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
