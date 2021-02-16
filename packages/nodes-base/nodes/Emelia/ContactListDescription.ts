import {
	INodeProperties,
} from 'n8n-workflow';

export const contactListOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Add Contact',
				value: 'addContact',
			},
			{
				name: 'Get All',
				value: 'getAll',
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
] as INodeProperties[];

export const contactListFields = [
	// ----------------------------------
	//      contactList: addContact
	// ----------------------------------
	{
		displayName: 'Contact List ID',
		name: 'contactListId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getContactLists',
		},
		default: [],
		required: true,
		description: 'The ID of the contact list to add the contact to.',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
				operation: [
					'addContact',
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
		description: 'The email of the contact to add to the contact list.',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
				operation: [
					'addContact',
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
					'addContact',
				],
			},
		},
		options: [
			{
				displayName: 'Custom',
				name: 'custom',
				type: 'string',
				default: '',
				description: 'JSON with custom keys and values for the contact to add.',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact to add.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact to add.',
			},
			{
				displayName: 'Last Contacted',
				name: 'lastContacted',
				type: 'string',
				default: '',
				description: 'Last contacted date of the contact to add.',
			},
			{
				displayName: 'Last Open',
				name: 'lastOpen',
				type: 'string',
				default: '',
				description: 'Last opened date of the contact to add.',
			},
			{
				displayName: 'Last Replied',
				name: 'lastReplied',
				type: 'string',
				default: '',
				description: 'Last replied date of the contact to add.',
			},
			{
				displayName: 'Mails Sent',
				name: 'mailsSent',
				type: 'number',
				default: 0,
				description: 'Number of emails sent to the contact to add.',
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				description: 'Phone number of the contact to add.',
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
		description: 'Return all results.',
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
		description: 'The number of results to return.',
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
] as INodeProperties[];
