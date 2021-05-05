import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';
import { createResourceLink } from '../helpers/osdi';

// DOCS: https://actionnetwork.org/docs/v2/donations
// Scenario: Retrieving a collection of donation resources (GET)
// Scenario: Retrieving an individual donation resource (GET)
// Scenario: Creating a new donation (POST)
// Scenario: Modifying an donation (PUT)

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
				name: 'Create',
				value: 'POST',
			},
			{
				name: 'Update',
				value: 'PUT',
			},
		],
		displayOptions: {
			show: {
				resource: [ 'donation' ],
			},
		},
	},
	{
		displayName: 'Fundraising Page ID',
		name: 'fundraising_page_id',
		description: "Donation data relating to this page",
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'POST' ]
			},
		},
	},
	{
		displayName: 'Fundraising Page ID',
		name: 'fundraising_page_id',
		description: "Donation data relating to this page",
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'PUT', 'GET', 'GET_ALL' ]
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'person_id',
		description: "Donation data relating to this person",
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'donation' ],
			},
		},
	},
	{
		displayName: 'Donation ID',
		name: 'donation_id',
		type: 'string',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: ['GET', 'PUT']
			}
		}
	},
	/**
	 * Adding or updating a resource
	 */
	{
		name: 'created_date',
		type: 'dateTime',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: 'Additional properties',
		name: 'additional_properties',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add data',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
		options: [
			{
				name: 'recipients',
				displayName: 'Recipients',
				values: [
					{
						name: 'display_name',
						type: 'string',
						description: 'The name of the recipient of this part of the donation. ',
					},
					{
						name: 'amount',
						type: 'string',
						description: 'The amount donated to this recipient. Will be added together with other recipient amounts to come up with the amount field in the response body. ',
					},
				],
			},
			{
				name: 'identifiers',
				displayName: 'Custom ID',
				type: 'string',
				default: '',
			},
		]
	},
	{
		name: 'comments',
		displayName: 'Comment for this donation',
		type: 'string',
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'POST', 'PUT' ]
			}
		}
	},
	{
		name: "osdi:person",
		displayName: "Person ID or URL",
		description: "Link to a person by their ID or URL",
		type: 'string',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'POST' ]
			}
		}
	},
	...createPersonSignupHelperFields({
		displayOptions: {
			show: {
				resource: ['donation'],
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
				resource: [ 'donation' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
	...createFilterFields({
		// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
		properties: [ 'identifier', 'created_date', 'modified_date' ],
		displayOptions: {
			show: {
				resource: [ 'donation' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const fundraising_page_id = node.getNodeParameter('fundraising_page_id', i, null) as string;
	const person_id = node.getNodeParameter('person_id', i, null) as string;
	const donation_id = node.getNodeParameter('donation_id', i, null) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';

	let url = `/api/v2`

	if (fundraising_page_id) {
		url += `/fundraising_pages/${fundraising_page_id}/donations`
	} else if (person_id) {
		url += `/people/${person_id}/donations`
	} else {
		url += `/donations`
	}

	if (donation_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${donation_id}`) as Promise<IDataObject>
	}

	if (donation_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, undefined) as any)?.identifiers,
			'recipients': (node.getNodeParameter('additional_properties', i, undefined) as any)?.recipients,
			'comments': node.getNodeParameter('comments', i, undefined),
			'created_date': node.getNodeParameter('created_date', i, undefined)
		}
		return actionNetworkApiRequest.call(node, operation, `${url}/${donation_id}`, body) as Promise<IDataObject>
	}

	if (fundraising_page_id && operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, undefined) as any)?.identifiers,
			'recipients': (node.getNodeParameter('additional_properties', i, undefined) as any)?.recipients,
			'comments': node.getNodeParameter('comments', i, undefined),
			'created_date': node.getNodeParameter('created_date', i, undefined),
		}

		const personRefURL = node.getNodeParameter('osdi:person', i, null) as string;
		if (personRefURL) {
			body = { ...body, ...createResourceLink('osdi:person', personRefURL) }
		} else {
			body = { ...body, ...createPersonSignupHelperObject(node, i) }
		}

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
