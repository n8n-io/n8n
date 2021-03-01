import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/event_campaigns
// Scenario: Retrieving a collection of event campaign resources (GET)
// Scenario: Retrieving an individual event campaign resource (GET)
// Scenario: Creating a new event campaign (POST)
// Scenario: Modifying an event campaign (PUT)

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
				resource: [ 'event_campaign' ],
			},
		},
	},
	{
		displayName: 'Event Campaign ID',
		name: 'event_campaign_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
				operation: [ 'PUT', 'GET' ]
			},
		},
	},
	/**
	 * Adding or updating a resource
	 */
	{
		displayName: "Origin System",
		description: "A human readable string identifying where this event_campaign originated. May be used in the user interface for this purpose.",
		name: "origin_system",
		type: "string",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Title",
		description: "The event_campaign's public title. ",
		name: "title",
		type: "string",
		required: true,
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		name: "description",
		type: "string",
		description: "The event_campaign's description. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		name: "host_pitch",
		type: "string",
		description: "The text shown to hosts when they are signing up to host an event as part of this event campaign.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		name: "host_instructions",
		type: "string",
		description: "The text shown to hosts after they create an event as part of this event campaign. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
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
				resource: [ 'event_campaign' ],
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
				resource: [ 'event_campaign' ],
				operation: [ 'GET' ],
				event_campaign_id: [null, '', undefined]
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'event_campaign' ],
				operation: [ 'GET' ],
				event_campaign_id: [null, '', undefined]
			}
		}
	}),
] as INodeProperties[];

export const logic = async (node: IExecuteFunctions) => {
	const event_campaign_id = node.getNodeParameter('event_campaign_id', 0) as string;
	const operation = node.getNodeParameter('operation', 0) as 'GET' | 'PUT' | 'POST';
	let url = `/api/v2/event_campaigns`

	if (event_campaign_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${event_campaign_id}`) as Promise<IDataObject>
	}

	if (event_campaign_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			title: node.getNodeParameter('title', 0) || undefined,
			description: node.getNodeParameter('description', 0) || undefined,
			host_pitch: node.getNodeParameter('host_pitch', 0, undefined),
			host_instructions: node.getNodeParameter('host_instructions', 0, undefined),
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
		}

		return actionNetworkApiRequest.call(node, operation, `${url}/${event_campaign_id}`, body) as Promise<IDataObject>
	}

	if (operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			title: node.getNodeParameter('title', 0) || undefined,
			description: node.getNodeParameter('description', 0) || undefined,
			host_pitch: node.getNodeParameter('host_pitch', 0, undefined),
			host_instructions: node.getNodeParameter('host_instructions', 0, undefined),
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
		}

		return actionNetworkApiRequest.call(node, operation, url, body) as Promise<IDataObject>
	}

	// Otherwise list all
	const qs = {
		...createPaginationProperties(node),
		...createFilterProperties(node)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
}
