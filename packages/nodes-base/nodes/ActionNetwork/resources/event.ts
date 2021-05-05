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
				operation: [ 'GET' ]
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
				operation: [ 'PUT', 'GET' ]
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
		required: false,
		default: null,
		displayOptions: {
			show: {
				resource: [ 'event' ],
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				operation: [ 'POST', 'PUT' ]
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
				resource: [ 'event' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
	// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
	...createFilterFields({
		properties: [ 'identifier', 'created_date', 'modified_date', 'origin_system', 'title' ],
		displayOptions: {
			show: {
				resource: [ 'event' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const event_id = node.getNodeParameter('event_id', i, null) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';
	let url = `/api/v2/events`

	if (event_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${event_id}`) as Promise<IDataObject>
	}

	if (event_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', i, { targets: [] }) as any)?.targets?.map(name => ({ name })),
			description: node.getNodeParameter('description', i, undefined),
			instructions: node.getNodeParameter('instructions', i, undefined),
			origin_system: node.getNodeParameter('origin_system', i, undefined),
			title: node.getNodeParameter('title', i, undefined),
			location: node.getNodeParameter('location', i, undefined),
			start_date: node.getNodeParameter('start_date', i, undefined)
		}

		return actionNetworkApiRequest.call(node, operation, `${url}/${event_id}`, body) as Promise<IDataObject>
	}

	// If the event campaign is specified
	// then create and filter events inside it
	const event_campaign_id = node.getNodeParameter('event_campaign_id', i, null)
	if (event_campaign_id) {
		url = `/api/v2/event_campaigns/${event_campaign_id}/events`
	}

	if (operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			// @ts-ignore
			'target': (node.getNodeParameter('additional_properties', i, { targets: [] }) as any)?.targets?.map(name => ({ name })),
			description: node.getNodeParameter('description', i, undefined),
			instructions: node.getNodeParameter('instructions', i, undefined),
			origin_system: node.getNodeParameter('origin_system', i, undefined),
			title: node.getNodeParameter('title', i, undefined),
			location: node.getNodeParameter('location', i, undefined),
			start_date: node.getNodeParameter('start_date', i, undefined)
		}

		return actionNetworkApiRequest.call(node, operation, url, body) as Promise<IDataObject>
	}

	// Otherwise list events
	if (operation === 'GET_ALL') {
		const qs = {
			...createPaginationProperties(node, i),
			...createFilterProperties(node, i)
		}
		return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
	}

	return []
}
