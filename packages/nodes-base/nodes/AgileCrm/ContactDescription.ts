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
			displayName: 'Properties',
			name: 'properties',
			type: 'fixedCollection',
			default: {},
			description: 'Contact properties are represented by list of JSON objects, each JSON object should follow the prototype shown. Custom fields will have type as CUSTOM and others will have type as SYSTEM.',
			required: true,
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					displayName: 'Property',
					name: 'property',
					values: [
						{
							displayName: 'Type',
							name: 'type',
							type: 'options',
							default: 'SYSTEM',
							required: true,
							description: 'Type of the field.',
							options: [
								{
									name: 'SYSTEM',
									value: 'SYSTEM',
								},
								{
									name: 'CUSTOM',
									value: 'CUSTOM'
								}
							]
						},
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							required: true,
							description: 'Name of the field.'
						},
						{
							displayName: 'Sub Type',
							name: 'subType',
							default: '',
							required: false,
							type: 'options',
							description: 'Name of the field.',
							displayOptions: {
								show: {
									type: [
										'SYSTEM'
									],
									name: [
										'email'
									] 
								}
							},
							options: [
								{
									name: 'Work',
									value: 'work',

								},
								{
									name: 'Personal',
									value: 'personal',

								}
							]
						},
						{
							displayName: 'Sub Type',
							name: 'subType',
							default: '',
							required: false,
							type: 'options',
							description: 'Name of the field.',
							displayOptions: {
								show: {
									type: [
										'SYSTEM'
									],
									name: [
										'phone'
									] 
								}
							},
							options: [
								{
									name: 'Work',
									value: 'work',

								},
								{
									name: 'Home',
									value: 'home',
								},
								{
									name: 'Mobile',
									value: 'mobile',
								},
								{
									name: 'Main',
									value: 'main',
								},
								{
									name: 'Home Fax',
									value: 'homeFax',
								},
								{
									name: 'Work Fax',
									value: 'workFax',
								},
								{
									name: 'Other',
									value: 'other',
								},
							]
						},
						{
							displayName: 'Sub Type',
							name: 'subType',
							default: '',
							required: false,
							type: 'options',
							description: 'Name of the field.',
							displayOptions: {
								show: {
									type: [
										'SYSTEM'
									],
									name: [
										'address'
									] 
								}
							},
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
							]
						},
						{
							displayName: 'Sub Type',
							name: 'subType',
							default: '',
							required: false,
							type: 'options',
							description: 'Name of the field.',
							displayOptions: {
								show: {
									type: [
										'SYSTEM'
									],
									name: [
										'website'
									] 
								}
							},
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
							displayName: 'Sub Type',
							name: 'subType',
							default: '',
							required: false,
							type: 'string',
							description: 'Name of the field.',
							displayOptions: {
								show: {
									type: [
										'CUSTOM'
									],
								}
							}
						},
						{
							displayName: 'Value',
							name: 'value',
							default: '',
							required: false,
							type: 'string',
							description: 'Value of the property.'
						},
					]
				}

			]

		},
	],
},

] as INodeProperties[];
