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
				name: 'Create',
				value: 'create',
				description: 'Create a new contact',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update contact properties',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
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
		}
	},

/* -------------------------------------------------------------------------- */
/*                                ticket:create                               */
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
			displayName: 'Star Value',
			name: 'starValue',
			type: 'options',
			default: '',
			required: false,
			description: 'Rating of contact (Max value 5). This is not applicable for companies.',
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
			description: 'Score of contact. This is not applicable for companies.',
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
			description: 'Unique identifiers added to contact, for easy management of contacts. This is not applicable for companies.',
		},
		{
			displayName: 'First Name',
			name: 'firstName',
			type: 'string',
			required: false,
			default: "",
			placeholder: 'First Name',
			description: 'Contact first name.',
		},
		{
			displayName: 'Last Name',
			name: 'lastName',
			type: 'string',
			required: false,
			default: "",
			placeholder: 'Last Name',
			description: 'Contact last name.',
		},
		{
			displayName: 'Company',
			name: 'company',
			type: 'string',
			required: false,
			default: "",
			placeholder: 'Company',
			description: 'Company Name.',
		},	
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			required: false,
			default: "",
			placeholder: 'Title',
			description: 'Professional title.',
		},
		{
			displayName: 'Email',
			name: 'emailOptions',
			type: 'fixedCollection',
			required: false,
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
							default: "",
							placeholder: '',
							description: 'Type of Email',
							options: [
								{
									name: 'Work',
									value: 'work'
								},
								{
									name: 'Personal',
									value: 'personal'
								}
							]
						},
						{
							displayName: 'Email',
							name: 'email',
							type: 'string',
							required: true,
							default: "",
							placeholder: '',
							description: 'Email',
						}
					]
				},
					
			]
		},
		{
			displayName: 'Address',
			name: 'addressOptions',
			type: 'fixedCollection',
			required: false,
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
							default: "",
							placeholder: '',
							description: 'Type of address.',
							options: [
								{
									name: 'Home',
									value: 'home'
								},
								{
									name: 'Postal',
									value: 'postal'
								}
								,
								{
									name: 'Office',
									value: 'office'
								}
							]
						},
						{
							displayName: 'Address',
							name: 'address',
							type: 'string',
							required: true,
							default: "",
							placeholder: '',
							description: 'Full address.',
						}
					]
				},
					
			]
		},
		{
			displayName: 'Website',
			name: 'websiteOptions',
			type: 'fixedCollection',
			required: false,
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
			name: 'phoneOptions',
			type: 'fixedCollection',
			required: false,
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
							default: "",
							placeholder: '',
							description: 'Type of phone number.',
							options: [
								{
									name: 'Home',
									value: 'home'
								},
								{
									name: 'Work',
									value: 'work'
								}
								,
								{
									name: 'Mobile',
									value: 'mobile'
								},
								{
									name: 'Main',
									value: 'main'
								},
								{
									name: 'Home Fax',
									value: 'homeFax'
								},
								{
									name: 'Work Fax',
									value: 'workFax'
								},
								{
									name: 'Other',
									value: 'other'
								},
							]
						},
						{
							displayName: 'Number',
							name: 'number',
							type: 'string',
							required: true,
							default: "",
							placeholder: '',
							description: 'Phone number.',
						}
					]
				},
					
			]
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
	description: 'Unique identifier for a particular contact',
},

] as INodeProperties[];
