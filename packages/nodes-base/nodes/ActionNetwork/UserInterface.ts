import { IDisplayOptions, INodeProperties } from '../../../workflow/dist/src/Interfaces';

export function createFilterFields({ properties, displayOptions }: { properties: string[], displayOptions: IDisplayOptions }): INodeProperties[] {
	return [
		{
			displayName: 'Filter Logic',
			name: 'filter_logic',
			type: 'options',
			required: false,
			options: [
				{ value: 'and', name: "All" },
				{ value: 'or', name: "Any" }
			],
			displayOptions,
			default: 'and',
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'fixedCollection',
			default: '',
			placeholder: 'Add Filter',
			displayOptions,
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					name: 'filters',
					displayName: 'Filters',
					values: [
						{
							displayName: 'Filter Property',
							name: 'property',
							type: 'options',
							default: '',
							options: properties.map(p => ({ name: p, value: p }))
						},
						{
							displayName: 'Operation',
							name: 'operation',
							type: 'options',
							options: [
								{
									name: 'eq',
									value: 'eq',
								},
								{
									name: 'lt',
									value: 'lt',
								},
								{
									name: 'gt',
									value: 'gt',
								},
							],
							default: 'eq',
						},
						{
							displayName: 'Matching Term',
							name: 'search_term',
							type: 'string',
							default: '',
						},
					]
				}
			]
		}
	]
}

export function createPersonSignupHelperFields({ displayOptions }: { displayOptions: IDisplayOptions }): INodeProperties[] {
	return [
		{
			displayName: 'First / Given Name',
			name: 'given_name',
			type: 'string',
			required: false,
			displayOptions,
			default: '',
		},
		{
			displayName: 'Last / Family Name',
			name: 'family_name',
			type: 'string',
			required: false,
			displayOptions,
			default: '',
		},
		{
			displayName: 'Additional Fields',
			name: 'additional_fields',
			type: 'fixedCollection',
			default: '',
			placeholder: 'Add Field',
			displayOptions,
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					name: 'email_addresses',
					displayName: 'Email Addresses',
					values: [
						{
							displayName: 'Address',
							name: 'address',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Primary',
							name: 'primary',
							type: 'boolean',
							default: true,
						},
						{
							displayName: 'Status',
							name: 'status',
							type: 'options',
							options: [
								{
									name: 'unsubscribed',
									value: 'unsubscribed',
								},
								{
									name: 'subscribed',
									value: 'subscribed',
								},
							],
							default: 'subscribed',
						},
					],
				},
				{
					name: 'postal_addresses',
					displayName: 'Postal Addresses',
					values: [
						{
							displayName: 'street_address',
							name: 'street_address',
							type: 'string',
							default: '',
						},
						{
							displayName: 'locality',
							name: 'locality',
							type: 'string',
							default: '',
						},
						{
							displayName: 'region',
							name: 'region',
							type: 'string',
							default: '',
						},
						{
							displayName: 'postal_code',
							name: 'postal_code',
							type: 'string',
							default: '',
						},
						{
							displayName: 'country',
							name: 'country',
							type: 'string',
							default: '',
						},
						{
							displayName: 'language',
							name: 'language',
							type: 'string',
							default: '',
						},
						{
							displayName: 'latitude',
							name: 'latitude',
							type: 'number',
							default: '',
						},
						{
							displayName: 'longitude',
							name: 'longitude',
							type: 'number',
							default: '',
						},
						{
							displayName: 'accuracy',
							name: 'address',
							type: 'options',
							options: [
								{
									value: 'Approximate',
									name: 'Approximate'
								}
							],
							default: 'Approximate',
						},
						{
							displayName: 'Primary',
							name: 'primary',
							type: 'boolean',
							default: true,
						},
					],
				},
				{
					name: 'phone_numbers',
					displayName: 'Phone Numbers',
					values: [
						{
							displayName: 'Number',
							name: 'number',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Type',
							name: 'number_type',
							type: 'options',
							options: [
								{
									name: 'Mobile',
									value: 'Mobile',
								},
							],
							default: 'Mobile',
						},
						{
							displayName: 'Primary',
							name: 'primary',
							type: 'boolean',
							default: true,
						},
						{
							displayName: 'Status',
							name: 'status',
							type: 'options',
							options: [
								{
									name: 'unsubscribed',
									value: 'unsubscribed',
								},
								{
									name: 'subscribed',
									value: 'subscribed',
								},
							],
							default: 'subscribed',
						},
					],
				},
				{
					name: 'add_tags',
					displayName: 'Tags',
					type: 'string',
					default: '',
				},
				{
					name: 'custom_fields',
					displayName: 'Custom Fields',
					values: [
						{
							displayName: 'Key',
							name: 'key',
							type: 'string',
							description: 'Custom field name as defined in Action Network',
							default: '',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							description: 'Custom field value',
							default: '',
						},
					],
				},
			],
		},
	]
}
