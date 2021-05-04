import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/fundraising_pages
// Scenario: Retrieving a collection of fundraising page resources (GET)
// Scenario: Retrieving an individual fundraising page resource (GET)
// Scenario: Creating a new fundraising page (POST)
// Scenario: Modifying an fundraising page (PUT)

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
				resource: [ 'fundraising_page' ],
			},
		},
	},
	{
		displayName: 'Fundraising page ID',
		name: 'fundraising_page_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'fundraising_page' ],
				operation: [ 'PUT', 'GET' ]
			},
		},
	},
	/**
	 * Adding or updating a resource
	 */
	{
		displayName: "Origin System",
		description: "A human readable string identifying where this fundraising_page originated. May be used in the user interface for this purpose.",
		name: "origin_system",
		type: "string",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'fundraising_page' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Title",
		description: "The fundraising_page's public title. ",
		name: "title",
		type: "string",
		required: true,
		displayOptions: {
			show: {
				resource: [ 'fundraising_page' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		name: "description",
		type: "string",
		description: "The fundraising_page's description. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'fundraising_page' ],
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
				resource: [ 'fundraising_page' ],
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
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'fundraising_page' ],
				operation: [ 'GET' ],
				fundraising_page_id: [null, '', undefined]
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'fundraising_page' ],
				operation: [ 'GET' ],
				fundraising_page_id: [null, '', undefined]
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const fundraising_page_id = node.getNodeParameter('fundraising_page_id', i) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST';
	let url = `/api/v2/fundraising_pages`

	if (fundraising_page_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${fundraising_page_id}`) as Promise<IDataObject>
	}

	if (fundraising_page_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			title: node.getNodeParameter('title', i) || undefined,
			description: node.getNodeParameter('description', i) || undefined,
			origin_system: node.getNodeParameter('origin_system', i) || undefined,
		}

		return actionNetworkApiRequest.call(node, operation, `${url}/${fundraising_page_id}`, body) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			title: node.getNodeParameter('title', i) || undefined,
			description: node.getNodeParameter('description', i) || undefined,
			origin_system: node.getNodeParameter('origin_system', i) || undefined,
		}

		return actionNetworkApiRequest.call(node, operation, url, body) as Promise<IDataObject>
	}

	// Otherwise list all
	const qs = {
		...createPaginationProperties(node, i),
		...createFilterProperties(node, i)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
}
