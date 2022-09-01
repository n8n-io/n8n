import { INodeProperties } from 'n8n-workflow';

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
				name: 'Get',
				value: 'get',
				description: 'Get an event',
				action: 'Get an event',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events',
				action: 'Get all events',
			},
			{
				name: 'Register',
				value: 'register',
				description: 'Register someone to an event',
				action: 'Register an event',
			},
		],
		default: 'get',
	},
];

export const eventFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                   event:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['event'],
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
				resource: ['event'],
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Automated',
						value: 'automated',
					},
					{
						name: 'Past',
						value: 'past',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
					},
				],
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                   event:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['get'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Whether to return only active dates in series',
			},
			{
				displayName: 'Session ID',
				name: 'date_id',
				type: 'string',
				default: '',
				description: 'Event Date ID',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                   event:register                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event Name or ID',
		name: 'eventId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getEvents',
		},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['register'],
			},
		},
		default: '',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		required: true,
		description: "The registrant's first name",
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['register'],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		description: "The registrant's email address",
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['register'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['event'],
				operation: ['register'],
			},
		},
		options: [
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'The value for the predefined Company field',
			},
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field ID',
								name: 'fieldId',
								type: 'string',
								default: '',
								description:
									"Each custom field's unique identifier can be found within the Event's Registration block in the Customize tab",
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The value to set on custom field',
							},
						],
					},
				],
			},
			{
				displayName: 'Event Registration URL',
				name: 'ref_url',
				type: 'string',
				default: '',
				description:
					'Event Registration page URL. It can be useful when you do not know Event ID, but have Event link.',
			},
			{
				displayName: 'GDPR',
				name: 'gdpr',
				type: 'string',
				default: '',
				description: 'The value for the predefined GDPR field',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The value for the predefined Last Name field',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
				description: 'The value for the predefined Phone Number field',
			},
			{
				displayName: 'Session Name or ID',
				name: 'date_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getEventSessions',
					loadOptionsDependsOn: ['eventId'],
				},
				default: '',
				description:
					'Event Session ID. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'The value for the predefined Website field',
			},
		],
	},
];
