import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// https://actionnetwork.org/docs/v2/events
// Scenario: Retrieving a collection of event resources (GET)
// Scenario: Retrieving an individual event resource (GET)
// Scenario: Creating a new event (POST)
// Scenario: Modifying an event (PUT)

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
				resource: [ 'event' ],
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
				resource: [ 'event' ],
				method: [ 'GET' ]
			},
		},
	},
	{
		displayName: 'Event ID',
		name: 'event_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'PUT', 'GET' ]
			},
		},
	},
	/**
	 * Adding or updating a resource
	 */
	{
		displayName: "Origin System",
		description: "A human readable string identifying where this event originated. May be used in the user interface for this purpose.",
		name: "origin_system",
		type: "string",
		required: true,
		default: null,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Title",
		description: "The event's public title. ",
		name: "title",
		type: "string",
		required: true,
		default: null,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Description",
		default: null,
		name: "description",
		type: "string",
		description: "The event's description. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Instructions",
		default: null,
		name: "instructions",
		type: "string",
		description: "The event's instructions for activists, visible after they RSVP. May contain HTML.",
		required: false,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Start Date",
		name: "start_date",
		type: "dateTime",
		default: null,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'POST', 'PUT' ]
			}
		},
	},
	{
		displayName: "Location",
		default: {},
		name: "location",
		type: "collection",
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'POST', 'PUT' ]
			}
		},
		options: [
			{
				name: "venue",
				displayName: "Venue Name",
				type: "string",
				description: 'The venue of the event. (ex: Jane White Hall)',
				default: null,
			},
			{
				name: "address_line",
				displayName: "Street Address",
				type: "string",
				description: 'An array of strings representing the event\'s street address. We will ignore any beyond the first.',
				default: null,
			},
			{
				name: "locality",
				displayName: "City or Local Area",
				type: "string",
				description: ' city or other local administrative area. This will be overwritten based on our geocoding.',
				default: null,
			},
			{
				name: "region",
				displayName: "Region Code",
				type: "string",
				description: 'State / subdivision codes according to ISO 3166-2 (Final 2 alpha digits). This will be overwritten based on our geocoding.',
				default: null,
			},
			{
				name: "postal_code",
				displayName: "Post Code",
				type: "string",
				description: 'Region specific postal code such as ZIP code.',
				default: null,
			},
			{
				name: "country",
				displayName: "2-digit country code (e.g. US)",
				type: "string",
				description: 'Country code according to ISO 3166-1 Alpha-2. Defaults to "US".',
				default: null,
			},
		]
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
				resource: [ 'event' ],
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
		]
	},
	/**
	 * Listing and getting resources
	 */
	...createListOperations({
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'GET' ],
				event_id: [null, '', undefined]
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'event' ],
				method: [ 'GET' ],
				event_id: [null, '', undefined]
			}
		}
	}),
];

export const logic = async (node: IExecuteFunctions) => {
	const event_id = node.getNodeParameter('event_id', 0) as string;
	const method = node.getNodeParameter('method', 0) as 'GET' | 'PUT' | 'POST';
	let url = `/api/v2/events`

	if (event_id && method === 'GET') {
		return actionNetworkApiRequest.call(node, method, `${url}/${event_id}`) as Promise<IDataObject>
	}

	if (event_id && method === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', 0, { targets: [] }) as any)?.targets?.map(name => ({ name })),
			description: node.getNodeParameter('description', 0) || undefined,
			instructions: node.getNodeParameter('instructions', 0) || undefined,
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
			title: node.getNodeParameter('title', 0) || undefined,
			location: node.getNodeParameter('location', 0) || undefined,
			start_date: node.getNodeParameter('start_date', 0) || undefined
		}

		return actionNetworkApiRequest.call(node, method, `${url}/${event_id}`, body) as Promise<IDataObject>
	}

	if (method === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', 0, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', 0, { targets: [] }) as any)?.targets?.map(name => ({ name })),
			description: node.getNodeParameter('description', 0) || undefined,
			instructions: node.getNodeParameter('instructions', 0) || undefined,
			origin_system: node.getNodeParameter('origin_system', 0) || undefined,
			title: node.getNodeParameter('title', 0) || undefined,
			location: node.getNodeParameter('location', 0) || undefined,
			start_date: node.getNodeParameter('start_date', 0) || undefined
		}

		return actionNetworkApiRequest.call(node, method, url, body) as Promise<IDataObject>
	}

	// Otherwise list events

	// If the event campaign is specified, filter on that
	const event_campaign_id = node.getNodeParameter('event_campaign_id', 0)
	if (event_campaign_id) {
		url = `/api/v2/event_campaigns/${event_campaign_id}/events`
	}

	const qs = {
		...createPaginationProperties(node),
		...createFilterProperties(node)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, qs) as Promise<IDataObject[]>
}
