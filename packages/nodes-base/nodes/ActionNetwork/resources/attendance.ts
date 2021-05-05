import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createResourceLink, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// DOCS: https://actionnetwork.org/docs/v2/attendances
// Scenario: Retrieving a collection of attendance resources (GET)
// Scenario: Retrieving an individual attendance resource (GET)
// Scenario: Creating a new attendance (POST)
// Scenario: Modifying an attendance (PUT)

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
				resource: [ 'attendance' ],
			},
		},
	},
	{
		displayName: 'Event ID',
		name: 'event_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [ 'attendance' ],
				operation: [ 'POST' ]
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
				resource: [ 'attendance' ],
				operation: [ 'GET', 'GET_ALL' ]
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
				resource: [ 'attendance' ],
				operation: [ 'GET', 'GET_ALL' ]
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
				resource: [ 'attendance' ],
				operation: [ 'GET', 'GET_ALL', 'PUT' ]
			},
		},
	},
	{
		displayName: 'Attendance ID',
		name: 'attendance_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'attendance' ],
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
				resource: [ 'attendance' ],
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
		name: 'is_autoresponse_enabled',
		displayName: 'Enable Autoresponse Email',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [ 'attendance' ],
				operation: [ 'POST' ]
			}
		}
	},
	{
		name: "osdi:person",
		displayName: "Person URL",
		description: "Link to a person by their URL",
		type: 'string',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'attendance' ],
				operation: [ 'POST' ]
			}
		}
	},
	...createPersonSignupHelperFields({
		displayOptions: {
			show: {
				resource: ['attendance'],
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
				resource: [ 'attendance' ],
				operation: [ 'GET_ALL' ],
			}
		}
	}),
	...createFilterFields({
		// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
		properties: [ 'identifier', 'created_date', 'modified_date' ],
		displayOptions: {
			show: {
				resource: [ 'attendance' ],
				operation: [ 'GET_ALL' ]
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const event_campaign_id = node.getNodeParameter('event_campaign_id', i) as string;
	const event_id = node.getNodeParameter('event_id', i) as string;
	const person_id = node.getNodeParameter('person_id', i) as string;

	let url = `/api/v2`
	if (event_campaign_id) {
		if (!event_id) {
			throw new Error("You must also specify an Event ID")
		}
		url += `/event_campaigns/${event_campaign_id}/events/${event_id}/attendances`
	} else if (event_id) {
		url += `/events/${event_id}/attendances`
	} else if (person_id) {
		url += `/people/${person_id}/attendances`
	} else {
		throw new Error("You must provide an Event ID or Person ID")
	}

	const attendance_id = node.getNodeParameter('attendance_id', i) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST' | 'GET_ALL';

	if (attendance_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${attendance_id}`) as Promise<IDataObject>
	}

	if (attendance_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers
		}
		return actionNetworkApiRequest.call(node, operation, `${url}/${attendance_id}`, body) as Promise<IDataObject>
	}

	if (event_id && operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, { identifiers: [] }) as any)?.identifiers,
			'triggers': {
				'autoresponse': {
					'enabled': node.getNodeParameter('is_autoresponse_enabled', i) as boolean
				}
			}
		}

		const personRefURL = node.getNodeParameter('osdi:person', i) as string;
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
