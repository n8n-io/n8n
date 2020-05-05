import {
	INodeProperties,
 } from 'n8n-workflow';

export const companyOperations = [
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
				name: 'Create',
				value: 'create',
				description: 'Create a new company',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update company properties',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a company',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const companyFields = [
/* -------------------------------------------------------------------------- */
/*                                  company:get                               */
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
		default: 20,
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
		}
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
	
	description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-companys---companies-api" target="_blank">here</a>.`,
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
			displayName: 'Star Value',
			name: 'starValue',
			type: 'options',
			default: '',
			required: false,
			description: 'Rating of company (Max value 5). This is not applicable for companies.',
			options: [
				{
					name: '0',
					value: 0
				},
				{
					name: '1',
					value: 1
				},
				{
					name: '2',
					value: 2
				},
				{
					name: '3',
					value: 3
				},
				{
					name: '4',
					value: 4
				},
				{
					name: '5',
					value: 5
				},
			]
		},
		{
			displayName: 'Lead Score',
			name: 'leadScore',
			type: 'number',
			default: '',
			description: 'Score of company. This is not applicable for companies.',
			required: false,
			typeOptions: {
				minValue: 0
			}
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
			placeholder: 'Tag',
			description: 'Unique identifiers added to company, for easy management of companys. This is not applicable for companies.',
        },
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: false,
			default: "",
			placeholder: 'Company name',
			description: 'Company name.',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			required: false,
			default: '',
			placeholder: 'Company email',
			description: 'Company email.',
		},
		{
			displayName: 'Address',
			name: 'email',
			type: 'string',
			required: false,
			default: '',
			placeholder: 'Company address',
			description: 'Company address.',
		},
		{
			displayName: 'Website',
			name: 'websiteOptions',
			type: 'fixedCollection',
			required: false,
			description: 'companys websites.',
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
							default: "",
							placeholder: '',
							description: 'Type of website.',
							options: [
								{
									name: 'URL',
									value: 'url',
								},
								{
									name: 'SKYPE',
									value: 'skype',
								},
								{
									name: 'TWITTER',
									value: 'twitter',
								},
								{
									name: 'LINKEDIN',
									value: 'linkedin',
								},
								{
									name: 'FACEBOOK',
									value: 'facebook',
								},
								{
									name: 'XING',
									value: 'xing',
								},
								{
									name: 'FEED',
									value: 'feed',
								},
								{
									name: 'GOOGLE_PLUS',
									value: 'googlePlus',
								},
								{
									name: 'FLICKR',
									value: 'flickr',
								},
								{
									name: 'GITHUB',
									value: 'github',
								},
								{
									name: 'YOUTUBE',
									value: 'youtube',
								},
							]
						},
						{
							displayName: 'URL',
							name: 'url',
							type: 'string',
							required: true,
							default: "",
							placeholder: '',
							description: 'Website URL',
						}
					]
				},
					
			]
		},
		{
			displayName: 'Phone',
			name: 'phone',
			type: 'string',
			required: false,
			default: '',
			placeholder: 'Company phone',
			description: 'Company phone.',
		},
		{
			displayName: 'Custom Properties',
			name: 'customProperties',
			type: 'fixedCollection',
			required: false,
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
							default: "",
							placeholder: '',
							description: 'Property name.'
						},
						{
							displayName: 'Sub Type',
							name: 'subtype',
							type: 'string',
							required: false,
							default: "",
							placeholder: '',
							description: 'Property sub type.',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							required: false,
							default: "",
							placeholder: '',
							description: 'Property value.',
						}
					]
				},
					
			]
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
	description: 'Unique identifier for a particular company',
},
/* -------------------------------------------------------------------------- */
/*                                company:update                               */
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
	
	description: `Object of values to set as described <a href="https://github.com/agilecrm/rest-api#1-companys---companies-api" target="_blank">here</a>.`,
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
			displayName: 'Star Value',
			name: 'starValue',
			type: 'options',
			default: '',
			required: false,
			description: 'Rating of company (Max value 5). This is not applicable for companies.',
			options: [
				{
					name: '0',
					value: 0
				},
				{
					name: '1',
					value: 1
				},
				{
					name: '2',
					value: 2
				},
				{
					name: '3',
					value: 3
				},
				{
					name: '4',
					value: 4
				},
				{
					name: '5',
					value: 5
				},
			]
		},
		{
			displayName: 'Lead Score',
			name: 'leadScore',
			type: 'number',
			default: '',
			description: 'Score of company. This is not applicable for companies.',
			required: false,
			typeOptions: {
				minValue: 0
			}
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
			placeholder: 'Tag',
			description: 'Unique identifiers added to company, for easy management of companys. This is not applicable for companies.',
        },
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			required: false,
			default: "",
			placeholder: 'Company name',
			description: 'Company name.',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			required: false,
			default: '',
			placeholder: 'Company email',
			description: 'Company email.',
		},
		{
			displayName: 'Address',
			name: 'email',
			type: 'string',
			required: false,
			default: '',
			placeholder: 'Company address',
			description: 'Company address.',
		},
		{
			displayName: 'Website',
			name: 'websiteOptions',
			type: 'fixedCollection',
			required: false,
			description: 'companys websites.',
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
							default: "",
							placeholder: '',
							description: 'Type of website.',
							options: [
								{
									name: 'URL',
									value: 'url',
								},
								{
									name: 'SKYPE',
									value: 'skype',
								},
								{
									name: 'TWITTER',
									value: 'twitter',
								},
								{
									name: 'LINKEDIN',
									value: 'linkedin',
								},
								{
									name: 'FACEBOOK',
									value: 'facebook',
								},
								{
									name: 'XING',
									value: 'xing',
								},
								{
									name: 'FEED',
									value: 'feed',
								},
								{
									name: 'GOOGLE_PLUS',
									value: 'googlePlus',
								},
								{
									name: 'FLICKR',
									value: 'flickr',
								},
								{
									name: 'GITHUB',
									value: 'github',
								},
								{
									name: 'YOUTUBE',
									value: 'youtube',
								},
							]
						},
						{
							displayName: 'URL',
							name: 'url',
							type: 'string',
							required: true,
							default: "",
							placeholder: '',
							description: 'Website URL',
						}
					]
				},
					
			]
		},
		{
			displayName: 'Phone',
			name: 'phone',
			type: 'string',
			required: false,
			default: '',
			placeholder: 'Company phone',
			description: 'Company phone.',
		},
		{
			displayName: 'Custom Properties',
			name: 'customProperties',
			type: 'fixedCollection',
			required: false,
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
							default: "",
							placeholder: '',
							description: 'Property name.'
						},
						{
							displayName: 'Sub Type',
							name: 'subtype',
							type: 'string',
							required: false,
							default: "",
							placeholder: '',
							description: 'Property sub type.',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							required: false,
							default: "",
							placeholder: '',
							description: 'Property value.',
						}
					]
				},
					
			]
		},
	],
},

] as INodeProperties[];
