import type { INodeProperties } from 'n8n-workflow';

export const contactListOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'getAll',
		noDataExpression: true,
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add a contact list',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many contact lists',
			},
		],
		displayOptions: {
			show: {
				resource: ['contactList'],
			},
		},
	},
];

export const contactListFields: INodeProperties[] = [
	// ----------------------------------
	//      contactList: add
	// ----------------------------------
	{
		displayName: 'Contact list name or ID',
		name: 'contactListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getContactLists',
		},
		default: [],
		required: true,
		description:
			'The ID of the contact list to add the contact to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Contact email',
		name: 'contactEmail',
		type: 'string',
		required: true,
		default: '',
		description: 'The email of the contact to add to the contact list',
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['add'],
			},
		},
		options: [
			{
				displayName: 'Custom fields',
				name: 'customFieldsUi',
				placeholder: 'Add custom field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom field',
						values: [
							{
								displayName: 'Field name',
								name: 'fieldName',
								type: 'string',
								default: '',
								description: 'The name of the field to add custom field to',
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
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact to add',
			},
			{
				displayName: 'Last contacted',
				name: 'lastContacted',
				type: 'dateTime',
				default: '',
				description: 'Last contacted date of the contact to add',
			},
			{
				displayName: 'Last name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact to add',
			},
			{
				displayName: 'Last open',
				name: 'lastOpen',
				type: 'dateTime',
				default: '',
				description: 'Last opened date of the contact to add',
			},
			{
				displayName: 'Last replied',
				name: 'lastReplied',
				type: 'dateTime',
				default: '',
				description: 'Last replied date of the contact to add',
			},
			{
				displayName: 'Mails sent',
				name: 'mailsSent',
				type: 'number',
				default: 0,
				description: 'Number of emails sent to the contact to add',
			},
			{
				displayName: 'Phone number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: 'Phone number of the contact to add',
			},
		],
	},

	// ----------------------------------
	//       contactList: getAll
	// ----------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 100,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['contactList'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},
];
