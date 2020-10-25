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
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
			},
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update contact properties',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [
	/* -------------------------------------------------------------------------- */
	/*                                  contact:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	/* -------------------------------------------------------------------------- */
	/*                                  contact:get all                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 20,
		displayOptions: {
			show: {
				resource: [
					'contact',
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
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:create                               */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: ' Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},

		description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api" target="_blank">here</a>.`,
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
					'contact',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'addressOptions',
				type: 'fixedCollection',
				description: 'Contacts address.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Address Properties',
						name: 'addressProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of address.',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Postal',
										value: 'postal',
									},
									{
										name: 'Office',
										value: 'office',
									},
								],
							},
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								required: true,
								default: '',
								description: 'Full address.',
							},
						],
					},
				],
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company Name.',
			},
			{
				displayName: 'Email',
				name: 'emailOptions',
				type: 'fixedCollection',
				description: 'Contact email.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Email Properties',
						name: 'emailProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of Email',
								options: [
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Personal',
										value: 'personal',
									},
								],
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								required: true,
								default: '',
								description: 'Email',
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
				description: 'Contact first name.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Contact last name.',
			},
			{
				displayName: 'Lead Score',
				name: 'leadScore',
				type: 'number',
				default: '',
				description: 'Lead score of contact',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Star Value',
				name: 'starValue',
				type: 'options',
				default: '',
				description: 'Rating of contact (Max value 5). This is not applicable for companies.',
				options: [
					{
						name: '0',
						value: 0,
					},
					{
						name: '1',
						value: 1,
					},
					{
						name: '2',
						value: 2,
					},
					{
						name: '3',
						value: 3,
					},
					{
						name: '4',
						value: 4,
					},
					{
						name: '5',
						value: 5,
					},
				],
			},
			{
				displayName: 'Phone',
				name: 'phoneOptions',
				type: 'fixedCollection',
				description: 'Contacts phone.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Phone properties',
						name: 'phoneProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of phone number.',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Home Fax',
										value: 'homeFax',
									},
									{
										name: 'Main',
										value: 'main',
									},
									{
										name: 'Mobile',
										value: 'mobile',
									},
									{
										name: 'Other',
										value: 'other',
									},
									{
										name: 'Work Fax',
										value: 'workFax',
									},
									{
										name: 'Work',
										value: 'work',
									},
								],
							},
							{
								displayName: 'Number',
								name: 'number',
								type: 'string',
								required: true,
								default: '',
								description: 'Phone number.',
							},
						],
					},
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Tag',
				},
				default: [],
				description: 'Unique identifiers added to contact, for easy management of contacts. This is not applicable for companies.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Professional title.',
			},
			{
				displayName: 'Website',
				name: 'websiteOptions',
				type: 'fixedCollection',
				description: 'Contacts websites.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Website properties.',
						name: 'websiteProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of website.',
								options: [
									{
										name: 'Facebook',
										value: 'facebook',
									},
									{
										name: 'Feed',
										value: 'feed',
									},
									{
										name: 'Flickr',
										value: 'flickr',
									},
									{
										name: 'Github',
										value: 'github',
									},
									{
										name: 'Google Plus',
										value: 'googlePlus',
									},
									{
										name: 'LinkedIn',
										value: 'linkedin',
									},
									{
										name: 'Skype',
										value: 'skype',
									},
									{
										name: 'Twitter',
										value: 'twitter',
									},
									{
										name: 'URL',
										value: 'url',
									},
									{
										name: 'Xing',
										value: 'xing',
									},
									{
										name: 'YouTube',
										value: 'youtube',
									},
								],
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								required: true,
								default: '',
								description: 'Website URL',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Properties',
				name: 'customProperties',
				type: 'fixedCollection',
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
								description: 'Property name.',
							},
							{
								displayName: 'Sub Type',
								name: 'subtype',
								type: 'string',
								default: '',
								description: 'Property sub type.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Property value.',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                  contact:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'Id of contact to delete.',
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular contact',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
		description: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: ' Additional Fields',
		name: 'additionalFieldsJson',
		type: 'json',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api" target="_blank">here</a>.`,
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
					'contact',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					false,
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'addressOptions',
				type: 'fixedCollection',
				description: 'Contacts address.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Address Properties',
						name: 'addressProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of address.',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Office',
										value: 'office',
									},
									{
										name: 'Postal',
										value: 'postal',
									},
								],
							},
							{
								displayName: 'Address',
								name: 'address',
								type: 'string',
								required: true,
								default: '',
								description: 'Full address.',
							},
						],
					},
				],
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Company Name.',
			},
			{
				displayName: 'Email',
				name: 'emailOptions',
				type: 'fixedCollection',
				description: 'Contact email.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Email Properties',
						name: 'emailProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of Email',
								options: [
									{
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Personal',
										value: 'personal',
									},
								],
							},
							{
								displayName: 'Email',
								name: 'email',
								type: 'string',
								required: true,
								default: '',
								description: 'Email',
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
				description: 'Contact first name.',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Contact last name.',
			},
			{
				displayName: 'Lead Score',
				name: 'leadScore',
				type: 'number',
				default: '',
				description: 'Lead score of contact',
				typeOptions: {
					minValue: 0,
				},
			},
			{
				displayName: 'Star Value',
				name: 'starValue',
				type: 'options',
				default: '',
				description: 'Rating of contact (Max value 5). This is not applicable for companies.',
				options: [
					{
						name: '0',
						value: 0,
					},
					{
						name: '1',
						value: 1,
					},
					{
						name: '2',
						value: 2,
					},
					{
						name: '3',
						value: 3,
					},
					{
						name: '4',
						value: 4,
					},
					{
						name: '5',
						value: 5,
					},
				],
			},
			{
				displayName: 'Phone',
				name: 'phoneOptions',
				type: 'fixedCollection',
				description: 'Contacts phone.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Phone properties',
						name: 'phoneProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of phone number.',
								options: [
									{
										name: 'Home',
										value: 'home',
									},
									{
										name: 'Home Fax',
										value: 'homeFax',
									},
									{
										name: 'Main',
										value: 'main',
									},
									{
										name: 'Mobile',
										value: 'mobile',
									},
									{
										name: 'Other',
										value: 'other',
									},
									{
										name: 'Work Fax',
										value: 'workFax',
									},
									{
										name: 'Work',
										value: 'work',
									},
								],
							},
							{
								displayName: 'Number',
								name: 'number',
								type: 'string',
								required: true,
								default: '',
								description: 'Phone number.',
							},
						],
					},
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Tag',
				},
				default: [],
				description: 'Unique identifiers added to contact, for easy management of contacts. This is not applicable for companies.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Professional title.',
			},
			{
				displayName: 'Website',
				name: 'websiteOptions',
				type: 'fixedCollection',
				description: 'Contacts websites.',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Website properties.',
						name: 'websiteProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of website.',
								options: [
									{
										name: 'Facebook',
										value: 'facebook',
									},
									{
										name: 'Feed',
										value: 'feed',
									},
									{
										name: 'Flickr',
										value: 'flickr',
									},
									{
										name: 'Github',
										value: 'github',
									},
									{
										name: 'Google Plus',
										value: 'googlePlus',
									},
									{
										name: 'LinkedIn',
										value: 'linkedin',
									},
									{
										name: 'Skype',
										value: 'skype',
									},
									{
										name: 'Twitter',
										value: 'twitter',
									},
									{
										name: 'URL',
										value: 'url',
									},
									{
										name: 'Xing',
										value: 'xing',
									},
									{
										name: 'YouTube',
										value: 'youtube',
									},
								],
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								required: true,
								default: '',
								description: 'Website URL',
							},
						],
					},
				],
			},
			{
				displayName: 'Custom Properties',
				name: 'customProperties',
				type: 'fixedCollection',
				description: 'Custom Properties',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Property',
						name: 'customProperty',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								required: true,
								default: '',
								description: 'Property name.',
							},
							{
								displayName: 'Sub Type',
								name: 'subtype',
								type: 'string',
								default: '',
								description: 'Property sub type.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Property value.',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
