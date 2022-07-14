import {
	INodeProperties,
} from 'n8n-workflow';

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
				name: 'Get All',
				value: 'getAll',
				action: 'Get all contact lists',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
			},
		},
	},
];

export const contactListFields: INodeProperties[] = [
	// ----------------------------------
	//      contactList: add
	// ----------------------------------
	{
		displayName: 'Contact List Name or ID',
		name: 'contactListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getContactLists',
		},
		default: [],
		required: true,
		description: 'The ID of the contact list to add the contact to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
				operation: [
					'add',
				],
			},
		},
	},
	{
		displayName: 'Contact Email',
		name: 'contactEmail',
		type: 'string',
		required: true,
		default: '',
		description: 'The email of the contact to add to the contact list',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
				operation: [
					'add',
				],
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
				resource: [
					'contactList',
				],
				operation: [
					'add',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				placeholder: 'Add Custom Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				description: 'Filter by custom fields',
				default: {},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name',
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
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact to add',
			},
			{
				displayName: 'Last Contacted',
				name: 'lastContacted',
				type: 'dateTime',
				default: '',
				description: 'Last contacted date of the contact to add',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact to add',
			},
			{
				displayName: 'Last Open',
				name: 'lastOpen',
				type: 'dateTime',
				default: '',
				description: 'Last opened date of the contact to add',
			},
			{
				displayName: 'Last Replied',
				name: 'lastReplied',
				type: 'dateTime',
				default: '',
				description: 'Last replied date of the contact to add',
			},
			{
				displayName: 'Mails Sent',
				name: 'mailsSent',
				type: 'number',
				default: 0,
				description: 'Number of emails sent to the contact to add',
			},
			{
				displayName: 'Phone Number',
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
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
				operation: [
					'getAll',
				],
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
				resource: [
					'contactList',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
