import { createFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';

/**
 * Adds person parameters.
 * Use this whenever you're able to add a person.
 */
export const createPersonSignupHelperFields = createFields([
	{
		displayName: 'First Name',
		name: 'given_name',
		type: 'string',
		required: false,
		default: null,
	},
	{
		displayName: 'Last Name',
		name: 'family_name',
		type: 'string',
		required: false,
		default: null,
	},
	{
		name: "primary_email_address",
		displayName: 'Primary Email Address',
		type: 'string',
		default: null,
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
	{
		displayName: 'Contact Details',
		name: 'contactDetails',
		type: 'fixedCollection',
		placeholder: 'Add Contact Detail',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'email_addresses',
				displayName: 'Email Addresses',
				placeholder: "Add Email Address",
				default: null,
				values: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: null
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
				placeholder: "Add Postal Address",
				default: null,
				values: [
					{
						displayName: 'street_address',
						name: 'street_address',
						type: 'string',
						default: null
					},
					{
						displayName: 'locality',
						name: 'locality',
						type: 'string',
						default: null
					},
					{
						displayName: 'region',
						name: 'region',
						type: 'string',
						default: null
					},
					{
						displayName: 'postal_code',
						name: 'postal_code',
						type: 'string',
						default: null
					},
					{
						displayName: 'country',
						name: 'country',
						type: 'string',
						default: null
					},
					{
						displayName: 'language',
						name: 'language',
						type: 'string',
						default: null
					},
					{
						displayName: 'latitude',
						name: 'latitude',
						type: 'number',
						default: null
					},
					{
						displayName: 'longitude',
						name: 'longitude',
						type: 'number',
						default: null
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
				placeholder: "Add Phone Number",
				default: undefined,
				values: [
					{
						displayName: 'Number',
						name: 'number',
						type: 'string',
						default: null
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
		],
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		default: [],
		placeholder: 'Add Custom Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			multipleValueButtonText: 'Add Custom Field MVBT',
		},
		options: [
			{
				name: 'custom_fields',
				displayName: 'Custom Fields',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						description: 'Custom field name as defined in Action Network',
						default: null
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						description: 'Custom field value',
						default: null
					},
				],
			},
		],
	},
	{
		displayName: 'Tags and Identifiers',
		name: 'tags_and_ids',
		type: 'collection',
		placeholder: 'Add Tag / ID',
		default: {},
		displayOptions: {
			show: {
				resource: [ 'advocacy_campaign' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
		options: [
			{
				name: 'add_tags',
				displayName: 'Tags',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add tag',
				},
			},
			{
				name: 'identifiers',
				displayName: 'Custom IDs',
				type: 'string',
				default: [],
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add custom ID',
				},
			},
		]
	},
])

// ...constructPersonSignupHelperPayload({
// 	family_name: this.getNodeParameter('family_name', i),
// 	given_name: this.getNodeParameter('given_name', i),
// 	postal_addresses: person_fields.postal_addresses,
// 	email_addresses: person_fields.email_addresses,
// 	phone_numbers: person_fields.phone_numbers,
// 	add_tags: person_fields.add_tags,
// 	custom_fields: person_fields.custom_fields
// })
/**
 * {
	family_name,
	given_name,
	email_addresses,
	add_tags,
	phone_numbers,
	custom_fields,
	postal_addresses
}: any
 */
export function createPersonSignupHelperObject(node: IExecuteFunctions, i: number) {
	// @ts-ignore
	const primary_email_address = node.getNodeParameter('primary_email_address', i, null)

	const { custom_fields } = node.getNodeParameter('customFields', i, {}) as any

	const { add_tags, identifiers } = node.getNodeParameter('tags_and_ids', i, {}) as any

	let {
		email_addresses,
		phone_numbers,
		postal_addresses
	} = node.getNodeParameter('contactDetails', i, {}) as any

	email_addresses = [
		...(email_addresses || []),
		{
			address: primary_email_address,
			primary: true,
			status: node.getNodeParameter('status', i, 'subscribed')
		}
	]

	const body: any = {
		identifiers,
		person: {
			email_addresses,
			family_name: node.getNodeParameter('family_name', i, undefined),
			given_name: node.getNodeParameter('given_name', i, undefined),
		},
		add_tags
	}

	// @ts-ignore
	if (phone_numbers?.length > 0) {
		body.person.phone_numbers = phone_numbers
	}
	if (Object.keys(custom_fields || {}).length > 0) {
		body.person.custom_fields = (custom_fields as any)?.reduce(
			// @ts-ignore
			(obj, { key, value }) => ({ ...obj, [key]: value }),
			{} as any
		)
	}
	if (postal_addresses !== undefined && postal_addresses?.length > 0) {
		body.postal_addresses = postal_addresses.map(
			// @ts-ignore
			({ street_address, latitude, longitude, accuracy, ...a }) => {
				let location = undefined
				if (latitude && longitude) {
					location = { latitude, longitude, accuracy }
				}
				return {
					address_lines: street_address ? [street_address] : undefined,
					...a,
					location
				}
			}
		)
	}

	console.log(JSON.stringify(body))

	return body
}

// [DOCS](https://actionnetwork.org/docs/v2/person)
// Scenario: Retrieving a collection of attendance resources (GET)
// Scenario: Retrieving an individual attendance resource (GET)
// Scenario: Creating a new attendance (POST)
// Scenario: Modifying an attendance (PUT)

export const fields = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'GET',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'GET',
			},
			{
				name: 'Get All',
				value: 'GET_ALL',
			},
			{
				name: 'Create/Update',
				value: 'POST',
			},
		],
		displayOptions: {
			show: {
				resource: [ 'person' ],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'person_id',
		type: 'string',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'person' ],
				operation: ['GET']
			}
		}
	},
	/**
	 * Adding or updating a resource
	 */
	...createPersonSignupHelperFields({
		displayOptions: {
			show: {
				resource: ['person'],
				operation: [ 'POST' ]
			}
		}
	}),
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'person' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
	...createFilterFields({
		// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
		properties: [ 'identifier', 'created_date', 'modified_date', 'family_name', 'given_name', 'email_address', 'region', 'postal_code', ],
		displayOptions: {
			show: {
				resource: [ 'person' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const person_id = node.getNodeParameter('person_id', i, null) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'POST' | 'GET_ALL';
	let url = `/api/v2/people`

	if (person_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${person_id}`) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		let body = createPersonSignupHelperObject(node, i)
		return actionNetworkApiRequest.call(node, operation, url, body) as Promise<IDataObject>
	}

	// Otherwise list all

	if (operation === 'GET_ALL') {
		const qs = {
			...createPaginationProperties(node, i),
			...createFilterProperties(node, i)
		}
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []
}
