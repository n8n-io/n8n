import {
	INodeProperties,
} from 'n8n-workflow';

export const contactListOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contactList',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a contact to a list',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts on a list',
			},
		],
		default: 'add',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactListFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 contactList:add                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: '',
		description: 'The email address of the contactList',
	},
	{
		displayName: 'List ID',
		name: 'listId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		displayOptions: {
			show: {
				operation: [
					'add',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: {},
		placeholder: 'Add Field',
		options: [
			{
				displayName: 'Custom Fields',
				name: 'customFieldsUi',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Custom Field',
				typeOptions: {
					multipleValues: true,
					loadOptionsMethod: 'getCustomFields',
				},
				options: [
					{
						name: 'customFieldsValues',
						displayName: 'Custom Field',
						values: [
							{
								displayName: 'Key',
								name: 'key',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getCustomFields',
								},
								description: 'The end user specified key of the user defined data.',
								default: '',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The end user specified value of the user defined data.',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Active',
						value: 'ACTIVE',
					},
					{
						name: 'Inactive',
						value: 'INACTIVE',
					},
					{
						name: 'Bounced',
						value: 'BOUNCED',
					},
					{
						name: 'Unsubscribed',
						value: 'UNSUBSCRIBED',
					},
					{
						name: 'Banned',
						value: 'BANNED',
					},
				],
				default: '',
				description: 'The status of the contact. You can only send email to contacts with ACTIVE status.',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				default: [],
				description: 'The tags you want to set to the contact.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contactList:getAll                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'List ID',
		name: 'listId',
		required: true,
		type: 'string',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactList',
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
				],
				resource: [
					'contactList',
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
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'contactList',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				options: [
					{
						name: 'ASC',
						value: 'asc',
					},
					{
						name: 'DESC',
						value: 'desc',
					},
				],
				default: 'desc',
				description: 'Defines the direction in which search results are ordered. Default value is DESC. Note: It has to be using with the Sort By parameter',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of attributes to include in the response.',
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'string',
				default: 'Defines the field in which search results are sort by. Note: It has to be using with the Direcction parameter',
			},
		],
	},
] as INodeProperties[];
