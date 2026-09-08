import type { INodeProperties } from 'n8n-workflow';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['contact'],
			},
		},
		options: [
			{
				name: 'Create or update',
				value: 'upsert',
				description:
					'Create a new contact, or update the current one if it already exists (upsert)',
				action: 'Create or update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many contacts',
				action: 'Get many contacts',
			},
		],
		default: 'upsert',
	},
];

export const contactFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 contact:upsert                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		required: true,
		type: 'string',
		placeholder: 'name@email.com',
		displayOptions: {
			show: {
				operation: ['upsert'],
				resource: ['contact'],
			},
		},
		default: '',
		description: 'Email address of the contact',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['upsert'],
				resource: ['contact'],
			},
		},
		default: {},
		placeholder: 'Add field',
		options: [
			{
				displayName: 'Company',
				name: 'Company',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add custom field',
				typeOptions: {
					multipleValues: true,
					loadOptionsMethod: 'getCustomFields',
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom field',
						values: [
							{
								displayName: 'Key name or ID',
								name: 'key',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								description:
									'User-specified key of user-defined data. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'User-specified value of user-defined data',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Fax',
				name: 'Fax',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First name',
				name: 'FirstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Industry',
				name: 'Industry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last name',
				name: 'LastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Lead source',
				name: 'LeadSource',
				type: 'string',
				default: '',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'LinkedIn',
				type: 'string',
				default: '',
			},
			{
				displayName: 'List name or ID',
				name: 'autopilotList',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getLists',
				},
				default: '',
				description:
					'List to which this contact will be added on creation. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Mailing country',
				name: 'MailingCountry',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing postal code',
				name: 'MailingPostalCode',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing state',
				name: 'MailingState',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing street',
				name: 'MailingStreet',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mailing city',
				name: 'MailingCity',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mobile phone',
				name: 'MobilePhone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'New email',
				name: 'newEmail',
				type: 'string',
				default: '',
				description:
					'If provided, will change the email address of the contact identified by the Email field',
			},
			{
				displayName: 'Notify',
				name: 'notify',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default Autopilot notifies registered REST hook endpoints for contact_added/contact_updated events when a new contact is added or an existing contact is updated via API. Disable to skip notifications.',
			},
			{
				displayName: 'Number of employees',
				name: 'NumberOfEmployees',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Owner name',
				name: 'owner_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'Phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Salutation',
				name: 'Salutation',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Session ID',
				name: 'autopilotSessionId',
				type: 'string',
				default: '',
				description: 'Used to associate a contact with a session',
			},
			{
				displayName: 'Status',
				name: 'Status',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'Title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Subscribe',
				name: 'unsubscribed',
				type: 'boolean',
				default: false,
				description: 'Whether to subscribe or un-subscribe a contact',
			},
			{
				displayName: 'Website URL',
				name: 'Website',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['contact'],
			},
		},
		default: '',
		description: 'Can be ID or email',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: ['get'],
				resource: ['contact'],
			},
		},
		default: '',
		description: 'Can be ID or email',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['contact'],
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
				resource: ['contact'],
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
];
