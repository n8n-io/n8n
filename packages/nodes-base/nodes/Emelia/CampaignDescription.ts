import type { INodeProperties } from 'n8n-workflow';

export const campaignOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		noDataExpression: true,
		options: [
			{
				name: 'Add contact',
				value: 'addContact',
				action: 'Add a contact to a campaign',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a campaign',
			},
			{
				name: 'Duplicate',
				value: 'duplicate',
				action: 'Duplicate a campaign',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a campaign',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many campaigns',
			},
			{
				name: 'Pause',
				value: 'pause',
				action: 'Pause a campaign',
			},
			{
				name: 'Start',
				value: 'start',
				action: 'Start a campaign',
			},
		],
		displayOptions: {
			show: {
				resource: ['campaign'],
			},
		},
	},
];

export const campaignFields: INodeProperties[] = [
	// ----------------------------------
	//       campaign: addContact
	// ----------------------------------
	{
		displayName: 'Campaign name or ID',
		name: 'campaignId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		default: [],
		required: true,
		description:
			'The ID of the campaign to add the contact to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['addContact'],
			},
		},
	},
	{
		displayName: 'Contact email',
		name: 'contactEmail',
		type: 'string',
		required: true,
		default: '',
		description: 'The email of the contact to add to the campaign',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['addContact'],
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
				resource: ['campaign'],
				operation: ['addContact'],
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
	//         campaign: create
	// ----------------------------------
	{
		displayName: 'Campaign name',
		name: 'campaignName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the campaign to create',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['create'],
			},
		},
	},

	// ----------------------------------
	//       campaign: get
	// ----------------------------------
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the campaign to retrieve',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------
	//       campaign: getAll
	// ----------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['campaign'],
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
				resource: ['campaign'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------
	//       campaign: pause
	// ----------------------------------
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the campaign to pause. The campaign must be in RUNNING mode.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['pause'],
			},
		},
	},

	// ----------------------------------
	//       campaign: start
	// ----------------------------------
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the campaign to start. Email provider and contacts must be set.',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['start'],
			},
		},
	},

	// ----------------------------------
	//       campaign: duplicate
	// ----------------------------------
	{
		displayName: 'Campaign name or ID',
		name: 'campaignId',
		type: 'options',
		default: '',
		required: true,
		description:
			'The ID of the campaign to duplicate. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		typeOptions: {
			loadOptionsMethod: 'getCampaigns',
		},
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['duplicate'],
			},
		},
	},
	{
		displayName: 'New campaign name',
		name: 'campaignName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the new campaign to create',
		displayOptions: {
			show: {
				resource: ['campaign'],
				operation: ['duplicate'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add field',
		displayOptions: {
			show: {
				operation: ['duplicate'],
				resource: ['campaign'],
			},
		},
		options: [
			{
				displayName: 'Copy contacts',
				name: 'copyContacts',
				type: 'boolean',
				default: false,
				description: 'Whether to copy all the contacts from the original campaign',
			},
			{
				displayName: 'Copy email provider',
				name: 'copyProvider',
				type: 'boolean',
				default: true,
				description: 'Whether to set the same email provider than the original campaign',
			},
			{
				displayName: 'Copy email sequence',
				name: 'copyMails',
				type: 'boolean',
				default: true,
				description:
					'Whether to copy all the steps of the email sequence from the original campaign',
			},
			{
				displayName: 'Copy global settings',
				name: 'copySettings',
				type: 'boolean',
				default: true,
				description: 'Whether to copy all the general settings from the original campaign',
			},
		],
	},
];
