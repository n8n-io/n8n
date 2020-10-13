import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [

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
				operation: [
					'delete',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Can be id or email'
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
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
		description: 'Can be id or email'
	},
	/* -------------------------------------------------------------------------- */
	/*                                 contact:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		required: true,
		type: 'string',
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
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
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
] as INodeProperties[];
