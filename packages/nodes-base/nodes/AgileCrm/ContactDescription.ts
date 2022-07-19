import {
	INodeProperties,
} from 'n8n-workflow';

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
				description: 'Create a new contact',
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
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contacts',
				action: 'Get all contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update contact properties',
				action: 'Update a contact',
			},
		],
		default: 'get',
	},
];

export const contactFields: INodeProperties[] = [
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
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
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
		default: 20,
		description: 'Max number of results to return',
	},

	{
		displayName: 'Filter',
		name: 'filterType',
		type: 'options',
		options: [
			{
				name: 'None',
				value: 'none',
			},
			{
				name: 'Build Manually',
				value: 'manual',
			},
			{
				name: 'JSON',
				value: 'json',
			},
		],
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
		default: 'none',
	},
	{
		displayName: 'Must Match',
		name: 'matchType',
		type: 'options',
		options: [
			{
				name: 'Any Filter',
				value: 'anyFilter',
			},
			{
				name: 'All Filters',
				value: 'allFilters',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'manual',
				],
			},
		},
		default: 'anyFilter',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
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
		// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-simplify
		default: false,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'manual',
				],
			},
		},
		default: {},
		placeholder: 'Add Condition',
		options: [
			{
				displayName: 'Conditions',
				name: 'conditions',
				values: [
					{
						displayName: 'Field',
						name: 'field',
						type: 'string',
						default: '',
						description: 'Any searchable field',
					},
					{
						displayName: 'Condition Type',
						name: 'condition_type',
						type: 'options',
						options: [
							{
								name: 'After',
								value: 'AFTER',
							},
							{
								name: 'Before',
								value: 'BEFORE',
							},
							{
								name: 'Between',
								value: 'BETWEEN',
							},
							{
								name: 'Equals',
								value: 'EQUALS',
							},
							{
								name: 'Last',
								value: 'LAST',
							},
							{
								name: 'Not Equal',
								value: 'NOTEQUALS',
							},
							{
								name: 'On',
								value: 'ON',
							},
						],
						default: 'EQUALS',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value 2',
						name: 'value2',
						type: 'string',
						displayOptions: {
							show: {
								condition_type: [
									'BETWEEN',
								],
							},
						},
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'See <a href="https://github.com/agilecrm/rest-api#121-get-contacts-by-dynamic-filter" target="_blank">Agile CRM guide</a> to creating filters',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'json',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Filters (JSON)',
		name: 'filterJson',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'json',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
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
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'fixedCollection',
				placeholder: 'Add Sort',
				default: [],
				options: [
					{
						displayName: 'Sort',
						name: 'sort',
						values: [
							{
								displayName: 'Direction',
								name: 'direction',
								type: 'options',
								options: [
									{
										name: 'Ascending',
										value: 'ASC',
									},
									{
										name: 'Descending',
										value: 'DESC',
									},
								],
								default: 'ASC',
								description: 'The sorting direction',
							},
							{
								displayName: 'Field',
								name: 'field',
								type: 'string',
								default: '',
								description: 'The sorting field',
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                contact:create                               */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: false,
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
		displayName: 'Additional Fields',
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

		description: 'Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api">here</a>',
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
				default: {},
				description: 'Contacts address',
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
								description: 'Type of address',
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
								description: 'Full address',
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
				description: 'Company Name',
			},
			{
				displayName: 'Email',
				name: 'emailOptions',
				type: 'fixedCollection',
				default: {},
				description: 'Contact email',
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
								placeholder: 'name@email.com',
								required: true,
								default: '',
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
				description: 'Contact first name',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Contact last name',
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
				default: {},
				description: 'Contacts phone',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Phone Properties',
						name: 'phoneProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of phone number',
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
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Work Fax',
										value: 'workFax',
									},
								],
							},
							{
								displayName: 'Number',
								name: 'number',
								type: 'string',
								required: true,
								default: '',
								description: 'Phone number',
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
				description: 'Professional title',
			},
			{
				displayName: 'Website',
				name: 'websiteOptions',
				type: 'fixedCollection',
				default: {},
				description: 'Contacts websites',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Website Properties.',
						name: 'websiteProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of website',
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
				default: {},
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
								description: 'Property name',
							},
							{
								displayName: 'Sub Type',
								name: 'subtype',
								type: 'string',
								default: '',
								description: 'Property sub type',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Property value',
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
		description: 'ID of contact to delete',
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
		displayName: 'Additional Fields',
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
		description: 'Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-contacts---companies-api">here</a>',
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
				default: {},
				description: 'Contacts address',
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
								description: 'Type of address',
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
								description: 'Full address',
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
				description: 'Company Name',
			},
			{
				displayName: 'Email',
				name: 'emailOptions',
				type: 'fixedCollection',
				default: {},
				description: 'Contact email',
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
								placeholder: 'name@email.com',
								required: true,
								default: '',
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
				description: 'Contact first name',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Contact last name',
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
				default: {},
				description: 'Contacts phone',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Phone Properties',
						name: 'phoneProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of phone number',
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
										name: 'Work',
										value: 'work',
									},
									{
										name: 'Work Fax',
										value: 'workFax',
									},
								],
							},
							{
								displayName: 'Number',
								name: 'number',
								type: 'string',
								required: true,
								default: '',
								description: 'Phone number',
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
				description: 'Professional title',
			},
			{
				displayName: 'Website',
				name: 'websiteOptions',
				type: 'fixedCollection',
				default: {},
				description: 'Contacts websites',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						displayName: 'Website Properties.',
						name: 'websiteProperties',
						values: [
							{
								displayName: 'Type',
								name: 'subtype',
								type: 'options',
								required: true,
								default: '',
								description: 'Type of website',
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
				default: {},
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
								description: 'Property name',
							},
							{
								displayName: 'Sub Type',
								name: 'subtype',
								type: 'string',
								default: '',
								description: 'Property sub type',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Property value',
							},
						],
					},
				],
			},
		],
	},

];
