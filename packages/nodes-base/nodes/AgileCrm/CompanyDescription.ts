import {
	INodeProperties,
} from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new company',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a company',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all companies',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update company properties',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
];

export const companyFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                  company:get                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'get',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular company',
	},

	/* -------------------------------------------------------------------------- */
	/*                                  company:get all                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
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
				resource: [
					'company',
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
		description: 'Number of results to fetch.',
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
					'company',
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
				name: 'Any filter',
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
					'company',
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
		displayName: 'Simplify Response',
		name: 'simple',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Return a simplified version of the response instead of the raw data.',
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
					'company',
				],
				operation: [
					'getAll',
				],
				filterType: [
					'manual',
				],
			},
		},
		default: '',
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
						description: 'Any searchable field.',
					},
					{
						displayName: 'Condition Type',
						name: 'condition_type',
						type: 'options',
						options: [
							{
								name: 'Equals',
								value: 'EQUALS',
							},
							{
								name: 'Not Equal',
								value: 'NOTEQUALS',
							},
							{
								name: 'Last',
								value: 'LAST',
							},
							{
								name: 'Between',
								value: 'BETWEEN',
							},
							{
								name: 'On',
								value: 'ON',
							},
							{
								name: 'Before',
								value: 'BEFORE',
							},
							{
								name: 'After',
								value: 'AFTER',
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
					'company',
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
					'company',
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
		description: '',
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
					'company',
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
								description: `The sorting field`,
							},
						],
					},
				],
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                company:create                               */
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
					'company',
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
					'company',
				],
				operation: [
					'create',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: 'Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-companys---companies-api">here</a>.',
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
					'company',
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
				name: 'email',
				type: 'string',
				default: '',
				description: 'Company address.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Company email.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Company name.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Company phone.',
			},
			{
				displayName: 'Star Value',
				name: 'starValue',
				type: 'options',
				default: '',
				description: 'Rating of company (Max value 5). This is not applicable for companies.',
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
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Tag',
				},
				default: [],
				description: 'Unique identifiers added to company, for easy management of companys. This is not applicable for companies.',
			},
			{
				displayName: 'Website',
				name: 'websiteOptions',
				type: 'fixedCollection',
				description: 'Companies websites.',
				default: {},
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
				default: {},
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
	/*                                  company:delete                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'delete',
				],
			},
		},
		default: '',
		description: 'ID of company to delete',
	},

	/* -------------------------------------------------------------------------- */
	/*                                company:update                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'update',
				],
			},
		},
		default: '',
		description: 'Unique identifier for a particular company',
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
					'company',
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
					'company',
				],
				operation: [
					'update',
				],
				jsonParameters: [
					true,
				],
			},
		},
		description: 'Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-companys---companies-api">here</a>.',
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
					'company',
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
				name: 'email',
				type: 'string',
				default: '',
				description: 'Company address.',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				description: 'Company email.',
			},
			{
				displayName: 'Star Value',
				name: 'starValue',
				type: 'options',
				default: '',
				description: 'Rating of company (Max value 5). This is not applicable for companies.',
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
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Tag',
				},
				default: [],
				description: 'Unique identifiers added to company, for easy management of companys. This is not applicable for companies.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Company name.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Company phone.',
			},
			{
				displayName: 'Website',
				name: 'websiteOptions',
				type: 'fixedCollection',
				default: {},
				description: 'Companys websites.',
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
				default: {},
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

];
