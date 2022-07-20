import {
	INodeProperties,
} from 'n8n-workflow';

import {
	activeCampaignDefaultGetAllProperties,
} from './GenericFunctions';

export const contactOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
				action: 'Create a contact',
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
				description: 'Get data of a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all contact',
				action: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

export const contactFields: INodeProperties[] = [
	// ----------------------------------
	//         contact:create
	// ----------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		description: 'The email of the contact to create',
	},
	{
		displayName: 'Update if Exists',
		name: 'updateIfExists',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		default: false,
		description: 'Whether to update user if it exists already. If not set and user exists it will error instead.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'fieldValues',
				placeholder: 'Add Custom Fields',
				description: 'Adds a custom fields to set also values which have not been predefined',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getContactCustomFields',
								},
								default: '',
								description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set',
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
				description: 'The first name of the contact to create',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'The last name of the contact to create',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact',
			},
		],
	},

	// ----------------------------------
	//         contact:update
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		description: 'The fields to update',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'fieldValues',
				placeholder: 'Add Custom Fields',
				description: 'Adds a custom fields to set also values which have not been predefined',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'property',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getContactCustomFields',
								},
								default: '',
								description: 'ID of the field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
							},
							{
								displayName: 'Field Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value of the field to set',
							},
						],
					},
				],
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email of the contact',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the contact',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the contact',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the contact',
			},
		],
	},

	// ----------------------------------
	//         contact:delete
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact to delete',
	},

	// ----------------------------------
	//         contact:get
	// ----------------------------------
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: 0,
		required: true,
		description: 'ID of the contact to get',
	},

	// ----------------------------------
	//         contact:getAll
	// ----------------------------------
	...activeCampaignDefaultGetAllProperties('contact', 'getAll'),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contact',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Datetime',
				name: 'datetime',
				type: 'dateTime',
				default: '',
				description: 'Contacts created on the specified date',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email address of the contact you want to get',
			},
			{
				displayName: 'Email Like',
				name: 'email_like',
				type: 'string',
				default: '',
				description: 'Filter contacts that contain the given value in the email address',
			},
			{
				displayName: 'Exclude',
				name: 'exclude',
				type: 'string',
				default: '',
				description: 'Exclude from the response the contact with the given ID',
			},
			{
				displayName: 'Form ID',
				name: 'formid',
				type: 'string',
				default: '',
				description: 'Filter contacts associated with the given form',
			},
			{
				displayName: 'List ID',
				name: 'listid',
				type: 'string',
				default: '',
				description: 'Filter contacts associated with the given list',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Filter contacts that match the given value in the contact names, organization, phone or email',
			},
			{
				displayName: 'Segment ID',
				name: 'segmentid',
				type: 'string',
				default: '',
				description: 'Return only contacts that match a list segment',
			},
			{
				displayName: 'Series ID',
				name: 'seriesid',
				type: 'string',
				default: '',
				description: 'Filter contacts associated with the given automation',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 1,
					},
					{
						name: 'Any',
						value: -1,
					},
					{
						name: 'Bounced',
						value: 3,
					},
					{
						name: 'Unconfirmed',
						value: 0,
					},
					{
						name: 'Unsubscribed',
						value: 2,
					},
				],
				default: '',
			},
			{
				displayName: 'Tag ID',
				name: 'tagid',
				type: 'string',
				default: '',
				description: 'Filter contacts associated with the given tag',
			},
			{
				displayName: 'Created Before',
				name: 'filters[created_before]',
				type: 'dateTime',
				default: '',
				description: 'Filter contacts that were created prior to this date',
			},
			{
				displayName: 'Created After',
				name: 'filters[created_after]',
				type: 'dateTime',
				default: '',
				description: 'Filter contacts that were created after this date',
			},
			{
				displayName: 'Updated Before',
				name: 'filters[updated_before]',
				type: 'dateTime',
				default: '',
				description: 'Filter contacts that were updated before this date',
			},
			{
				displayName: 'Updated After',
				name: 'filters[updated_after]',
				type: 'dateTime',
				default: '',
				description: 'Filter contacts that were updated after this date',
			},
			{
				displayName: 'Wait ID',
				name: 'waitid',
				type: 'string',
				default: '',
				description: 'Filter by contacts in the wait queue of an automation block',
			},
			{
				displayName: 'Order By',
				name: 'orderBy',
				type: 'options',
				options: [
					{
						name: 'Creation Date',
						value: 'orders[cdate]',
						description: 'Order contacts by creation date',
					},
					{
						name: 'Email',
						value: 'orders[email]',
						description: 'Order contacts by email',
					},
					{
						name: 'First Name',
						value: 'orders[first_name]',
						description: 'Order contacts by first name',
					},
					{
						name: 'Last Name',
						value: 'orders[last_name]',
						description: 'Order contacts by last name',
					},
					{
						name: 'Name',
						value: 'orders[name]',
						description: 'Order contacts by full name',
					},
					{
						name: 'Score',
						value: 'orders[score]',
						description: 'Order contacts by score',
					},
				],
				default: '',
			},
		],
	},
];
