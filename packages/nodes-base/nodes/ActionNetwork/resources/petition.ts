import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/petitions
// Scenario: Retrieving a collection of petition resources (GET)
// Scenario: Retrieving an individual petition resource (GET)
// Scenario: Creating a new petition (POST)
// Scenario: Modifying a petition (PUT)

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
				name: 'Create (POST)',
				value: 'POST',
			},
			{
				name: 'Update (PUT)',
				value: 'PUT',
			},
		],
		displayOptions: {
			show: {
				resource: [ 'petition' ],
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
				resource: [ 'petition' ],
				method: [ 'PUT', 'GET' ]
			},
		},
	},
	/**
	 * Adding or updating a resource
	 */
	{
		displayName: "Origin System",
		description: "A human readable string identifying where this petition originated. May be used in the user interface for this purpose.",
		name: "origin_system",
		type: "string",
		required: true,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Title",
		description: "The petition's public title. ",
		name: "title",
		type: "string",
		required: true,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		name: "description",
		type: "string",
		description: "The petition's description. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		name: "petition_text",
		type: "string",
		description: "The letter to the petition's target.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				method: [ 'POST', 'PUT' ]
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
				resource: [ 'petition' ],
				method: [ 'POST', 'PUT' ]
			}
		},
		options: [
			{
				name: 'identifier',
				displayName: 'Custom ID',
				type: 'string',
				default: '',
			},
			{
				name: 'target',
				displayName: 'Target',
				type: 'string',
				default: '',
			},
		]
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				method: [ 'GET' ],
				petition_id: [null, '', undefined]
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				method: [ 'GET' ],
				petition_id: [null, '', undefined]
			}
		}
	}),
] as INodeProperties[];

export const logic = async (node: IExecuteFunctions) => {
	const petition_id = node.getNodeParameter('petition_id', 0) as string;
	const method = node.getNodeParameter('method', 0) as 'GET' | 'PUT' | 'POST';
	let url = `/api/v2/petitions`

	if (petition_id && method === 'GET') {
		return actionNetworkApiRequest.call(node, method, `${url}/${petition_id}`) as Promise<IDataObject>
	}

	if (petition_id && method === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', 0, { targets: [] }) as any)?.targets?.map(name => ({ name })),
			description: node.getNodeParameter('description', 0) || undefined,
			petition_text: node.getNodeParameter('petition_text', 0) || undefined,
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
			title: node.getNodeParameter('title', 0) || undefined
		}

		return actionNetworkApiRequest.call(node, method, `${url}/${petition_id}`, body) as Promise<IDataObject>
	}

	if (method === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', 0, { targets: [] }) as any)?.targets?.map(name => ({ name })),
			description: node.getNodeParameter('description', 0) || undefined,
			petition_text: node.getNodeParameter('petition_text', 0) || undefined,
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
			title: node.getNodeParameter('title', 0) || undefined
		}

		return actionNetworkApiRequest.call(node, method, url, body) as Promise<IDataObject>
	}

	// Otherwise list all
	const qs = {
		...createPaginationProperties(node),
		...createFilterProperties(node)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, qs) as Promise<IDataObject[]>
}
