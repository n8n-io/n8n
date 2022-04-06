import {
	INodeProperties,
} from 'n8n-workflow';

export const sequenceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'sequence',
				],
			},
		},
		options: [
			{
				name: 'Add Subscriber',
				value: 'addSubscriber',
				description: 'Add a subscriber',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all sequences',
			},
			{
				name: 'Get Subscriptions',
				value: 'getSubscriptions',
				description: 'Get all subscriptions to a sequence including subscriber data',
			},
		],
		default: 'addSubscriber',
		description: 'The operations to perform.',
	},
];

export const sequenceFields: INodeProperties[] = [
	{
		displayName: 'Sequence ID',
		name: 'id',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getSequences',
		},
		required: true,
		displayOptions: {
			show: {
				resource: [
					'sequence',
				],
				operation: [
					'addSubscriber',
					'getSubscriptions',
				],
			},
		},
		default: '',
		description: 'Sequence ID.',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'sequence',
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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
					'getSubscriptions',
				],
				resource: [
					'sequence',
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
					'getSubscriptions',
				],
				resource: [
					'sequence',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'sequence',
				],
				operation: [
					'addSubscriber',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'fieldsUi',
				placeholder: 'Add Custom Field',
				description: 'Object of key/value pairs for custom fields (the custom field must exist before you can use it here).',
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
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: `The subscriber's first name.`,
			},
			{
				displayName: 'Tag IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'Tags',
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
					'sequence',
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
];
