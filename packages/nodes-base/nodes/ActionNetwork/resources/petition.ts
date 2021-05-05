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
				operation: [ 'PUT', 'GET' ]
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
		required: false,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Description",
		name: "description",
		type: "string",
		description: "The petition's description. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Petition text",
		name: "petition_text",
		type: "string",
		description: "The letter to the petition's target.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: 'Additional properties',
		name: 'additional_properties',
		type: 'collection',
		default: '',
		placeholder: 'Add data',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [ 'petition' ],
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
				operation: [ 'GET_ALL' ]
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'petition' ],
				operation: [ 'GET_ALL' ]
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const petition_id = node.getNodeParameter('petition_id', i) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';
	let url = `/api/v2/petitions`

	if (petition_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${petition_id}`) as Promise<IDataObject>
	}

	if (petition_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', i, { targets: [] }) as any)?.target?.map(name => ({ name })),
			description: node.getNodeParameter('description', i) || undefined,
			petition_text: node.getNodeParameter('petition_text', i) || undefined,
			origin_system: node.getNodeParameter('origin_system', i) || undefined,
			title: node.getNodeParameter('title', i) || undefined
		}

		return actionNetworkApiRequest.call(node, operation, `${url}/${petition_id}`, body) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', i, { targets: [] }) as any)?.target?.map(name => ({ name })),
			description: node.getNodeParameter('description', i) || undefined,
			petition_text: node.getNodeParameter('petition_text', i) || undefined,
			origin_system: node.getNodeParameter('origin_system', i) || undefined,
			title: node.getNodeParameter('title', i) || undefined
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
