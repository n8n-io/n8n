import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';
import { createResourceLink } from '../helpers/osdi';

// DOCS: https://actionnetwork.org/docs/v2/signatures
// Scenario: Retrieving a collection of signature resources (GET)
// Scenario: Retrieving an individual signature resource (GET)
// Scenario: Creating a new signature (POST)
// Scenario: Modifying an signature (PUT)

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
				resource: [ 'signature' ],
			},
		},
	},
	{
		displayName: 'Petition ID',
		name: 'petition_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'signature' ]
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'person_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'signature' ],
				operation: [ 'GET', 'GET_ALL' ]
			},
		},
	},
	{
		displayName: 'Signature ID',
		name: 'signature_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'signature' ],
				operation: ['GET', 'PUT']
			}
		}
	},
	/**
	 * Adding or updating a resource
	 */
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
				resource: [ 'signature' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
		options: [
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
		displayName: 'Comment',
		type: 'string',
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'signature' ],
				operation: [ 'POST', 'PUT' ]
			}
		}
	},
	{
		name: 'is_autoresponse_enabled',
		displayName: 'Enable Autoresponse Email',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [ 'signature' ],
				operation: [ 'POST' ]
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
				resource: [ 'signature' ],
				operation: [ 'POST' ]
			}
		}
	},
	...createPersonSignupHelperFields({
		displayOptions: {
			show: {
				resource: ['signature'],
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
				resource: [ 'signature' ],
				operation: [ 'GET_ALL' ]
			}
		}
	}),
	...createFilterFields({
		// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
		properties: [ 'identifier', 'created_date', 'modified_date' ],
		displayOptions: {
			show: {
				resource: [ 'signature' ],
				operation: [ 'GET_ALL' ]
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const petition_id = node.getNodeParameter('petition_id', i, null) as string;
	const person_id = node.getNodeParameter('person_id', i, null) as string;
	const signature_id = node.getNodeParameter('signature_id', i, null) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';

	let url = `/api/v2`
	if (petition_id) {
		url += `/petitions/${petition_id}/signatures`
	} else if (person_id) {
		url += `/people/${person_id}/signatures`
	} else {
		throw new Error("You must provide a Petition ID or Person ID")
	}

	if (signature_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${signature_id}`) as Promise<IDataObject>
	}

	if (signature_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, undefined) as any)?.identifiers,
			'comments': node.getNodeParameter('comments', i, null)
		}
		return actionNetworkApiRequest.call(node, operation, `${url}/${signature_id}`, body) as Promise<IDataObject>
	}

	if (petition_id && operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, undefined) as any)?.identifiers,
			'comments': node.getNodeParameter('comments', i, null),
			'triggers': {
				'autoresponse': {
					'enabled': node.getNodeParameter('is_autoresponse_enabled', i, true) as boolean
				}
			}
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
