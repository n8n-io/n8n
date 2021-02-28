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
		displayName: 'First / Given Name',
		name: 'given_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Last / Family Name',
		name: 'family_name',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Person Properties',
		name: 'new_person_additional_fields',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Field',
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
				name: 'identifiers',
				displayName: 'Custom IDs',
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
export function createPersonSignupHelperObject(node: IExecuteFunctions) {
	// @ts-ignore
	const {
		email_addresses,
		add_tags,
		identifiers,
		phone_numbers,
		custom_fields,
		postal_addresses
	} = node.getNodeParameter('new_person_fields', 0, {}) as any

	if (!email_addresses.length) {
		throw new Error("Please add at least one email address")
	}

	const body: any = {
		identifiers,
		person: {
			family_name: node.getNodeParameter('family_name', 0),
			given_name: node.getNodeParameter('given_name', 0),
			email_addresses
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
				return {
					...a,
					address_lines: street_address ? [street_address] : undefined,
					location: { latitude, longitude, accuracy }
				}
			}
		)
	}

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
				name: 'Create/Update by Email (POST)',
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
		default: '',
		displayOptions: {
			show: {
				resource: [ 'person' ],
				method: ['GET']
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
				method: [ 'POST' ]
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
				method: [ 'GET' ],
				person_id: [null, '', undefined]
			}
		}
	}),
	...createFilterFields({
		// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
		properties: [ 'identifier', 'created_date', 'modified_date', 'family_name', 'given_name', 'email_address', 'region', 'postal_code', ],
		displayOptions: {
			show: {
				resource: [ 'person' ],
				method: [ 'GET' ],
				person_id: [null, '', undefined]
			}
		}
	}),
] as INodeProperties[];

export const logic = async (node: IExecuteFunctions) => {
	const person_id = node.getNodeParameter('person_id', 0) as string;
	const method = node.getNodeParameter('method', 0) as 'GET' | 'POST';
	let url = `/api/v2/people`

	if (person_id && method === 'GET') {
		return actionNetworkApiRequest.call(node, method, `${url}/${person_id}`) as Promise<IDataObject>
	}

	if (method === 'POST') {
		let body = createPersonSignupHelperObject(node)
		return actionNetworkApiRequest.call(node, method, url, body) as Promise<IDataObject>
	}

	// Otherwise list all
	const qs = {
		...createPaginationProperties(node),
		...createFilterProperties(node)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, qs) as Promise<IDataObject[]>
}
