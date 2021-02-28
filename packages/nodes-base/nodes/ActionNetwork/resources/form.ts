import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/forms
// Scenario: Retrieving a collection of form resources (GET)
// Scenario: Retrieving an individual form resource (GET)
// Scenario: Creating a new form (POST)
// Scenario: Modifying an form (PUT)

export const fields: INodeProperties[] = [
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
				resource: [ 'form' ],
			},
		},
	},
	{
		displayName: 'Form ID',
		name: 'form_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'form' ],
				method: [ 'PUT', 'GET' ]
			},
		},
	},
	/**
	 * Adding or updating a resource
	 */
	{
		displayName: "Origin System",
		description: "A human readable string identifying where this form originated. May be used in the user interface for this purpose.",
		name: "origin_system",
		type: "string",
		required: true,
		default: null,
		displayOptions: {
			show: {
				resource: [ 'form' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Title",
		description: "The form's public title. ",
		name: "title",
		type: "string",
		required: true,
		default: null,
		displayOptions: {
			show: {
				resource: [ 'form' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Description",
		default: null,
		name: "description",
		type: "string",
		description: "The form's description. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'form' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Call to Action",
		default: null,
		name: "call_to_action",
		type: "string",
		description: "A call to action signifying what an activist does by submitting the form. (ex: Tell your story) ",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'form' ],
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
				resource: [ 'form' ],
				method: [ 'POST', 'PUT' ]
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
				resource: [ 'form' ],
				method: [ 'GET' ],
				form_id: [null, '', undefined]
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'form' ],
				method: [ 'GET' ],
				form_id: [null, '', undefined]
			}
		}
	}),
];

export const logic = async (node: IExecuteFunctions) => {
	const form_id = node.getNodeParameter('form_id', 0) as string;
	const method = node.getNodeParameter('method', 0) as 'GET' | 'PUT' | 'POST';
	let url = `/api/v2/forms`

	if (form_id && method === 'GET') {
		return actionNetworkApiRequest.call(node, method, `${url}/${form_id}`) as Promise<IDataObject>
	}

	if (form_id && method === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			description: node.getNodeParameter('description', 0) || undefined,
			call_to_action: node.getNodeParameter('call_to_action', 0) || undefined,
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
			title: node.getNodeParameter('title', 0) || undefined,
		}

		return actionNetworkApiRequest.call(node, method, `${url}/${form_id}`, body) as Promise<IDataObject>
	}

	if (method === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			description: node.getNodeParameter('description', 0) || undefined,
			call_to_action: node.getNodeParameter('call_to_action', 0) || undefined,
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
			title: node.getNodeParameter('title', 0) || undefined,
		}

		return actionNetworkApiRequest.call(node, method, url, body) as Promise<IDataObject>
	}

	// Otherwise list forms
	const qs = {
		...createPaginationProperties(node),
		...createFilterProperties(node)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, qs) as Promise<IDataObject[]>
}
