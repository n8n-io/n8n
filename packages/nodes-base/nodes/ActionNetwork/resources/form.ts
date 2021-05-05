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
				operation: [ 'PUT', 'GET' ]
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
		required: false,
		default: null,
		displayOptions: {
			show: {
				resource: [ 'form' ],
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				resource: [ 'form' ],
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
				resource: [ 'form' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'form' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const form_id = node.getNodeParameter('form_id', i, null) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';
	let url = `/api/v2/forms`

	if (form_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${form_id}`) as Promise<IDataObject>
	}

	if (form_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			description: node.getNodeParameter('description', i, undefined),
			call_to_action: node.getNodeParameter('call_to_action', i, undefined),
			origin_system: node.getNodeParameter('origin_system', i, undefined),
			title: node.getNodeParameter('title', i, undefined),
		}

		return actionNetworkApiRequest.call(node, operation, `${url}/${form_id}`, body) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			description: node.getNodeParameter('description', i, undefined),
			call_to_action: node.getNodeParameter('call_to_action', i, undefined),
			origin_system: node.getNodeParameter('origin_system', i, undefined),
			title: node.getNodeParameter('title', i, undefined),
		}

		return actionNetworkApiRequest.call(node, operation, url, body) as Promise<IDataObject>
	}

	// Otherwise list forms

	if (operation === 'GET_ALL') {
		const qs = {
			...createPaginationProperties(node, i),
			...createFilterProperties(node, i)
		}
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []

}
