import { createPersonSignupHelperFields, createPersonSignupHelperObject } from './person';
import { INodeProperties } from 'n8n-workflow';
import { createListOperations, createFilterFields, createResourceLink, createPaginationProperties, createFilterProperties } from '../helpers/fields';
import { IExecuteFunctions } from 'n8n-core/dist/src/Interfaces';
import { actionNetworkApiRequest } from '../helpers/request';
import { IDataObject } from '../../../../workflow/dist/src/Interfaces';

// DOCS: https://actionnetwork.org/docs/v2/outreaches
// Scenario: Retrieving a collection of outreach resources (GET)
// Scenario: Retrieving an individual outreach resource (GET)
// Scenario: Creating a new outreach (POST)
// Scenario: Modifying an outreach (PUT)

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
				resource: [ 'outreach' ],
			},
		},
	},
	{
		displayName: 'Advocacy Campaign ID',
		name: 'advocacy_campaign_id',
		type: 'string',
		default: '',
		required: false,
		displayOptions: {
			show: {
				resource: [ 'outreach' ],
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
				resource: [ 'outreach' ],
			},
		},
	},
	{
		displayName: 'Outreach ID',
		name: 'outreach_id',
		type: 'string',
		required: false,
		default: '',
		displayOptions: {
			show: {
				resource: [ 'outreach' ],
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
				resource: [ 'outreach' ],
				operation: [ 'POST', 'PUT' ]
			}
		},
		options: [
			{
				name: 'targets',
				displayName: 'Targets',
				values: [
					{
						name: 'title',
						type: 'string',
						description: 'The title of the target of this outreach. (ex: "Senator") ',
					},
					{
						name: 'given_name',
						type: 'string',
						description: 'The first or given name of the target. (ex: "John")  ',
					},
					{
						name: 'family_name',
						type: 'string',
						description: 'The last or family name of the target. (ex: "Smith")  ',
					},
					{
						name: 'ocdid',
						type: 'string',
						description: 'The Open Civic Data Division ID for this target\'s political geography, if applicable. (ex: "ocd-division/country:us/state:ny/cd:18", which corresponds to New York\'s 18th Congressional District). http://docs.opencivicdata.org/en/latest/proposals/0002.html',
					},
				],
			},
			{
				name: 'identifiers',
				displayName: 'Custom ID',
				type: 'string',
				default: '',
			},
		]
	},
	{
		name: 'subject',
		displayName: 'The subject of the letter that the activist wrote to the targets. ',
		type: 'string',
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'outreach' ],
				operation: [ 'POST', 'PUT' ]
			}
		}
	},
	{
		name: 'message',
		displayName: 'The message that the activist wrote to the targets. ',
		type: 'string',
		default: undefined,
		displayOptions: {
			show: {
				resource: [ 'outreach' ],
				operation: [ 'POST', 'PUT' ]
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
				resource: [ 'outreach' ],
				operation: [ 'POST' ]
			}
		}
	},
	...createPersonSignupHelperFields({
		displayOptions: {
			show: {
				resource: ['outreach'],
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
				resource: [ 'outreach' ],
				operation: [ 'GET' ],
				outreach_id: [null, '', undefined]
			}
		}
	}),
	...createFilterFields({
		// Valid filter properties documented at https://actionnetwork.org/docs/v2#odata
		properties: [ 'identifier', 'created_date', 'modified_date' ],
		displayOptions: {
			show: {
				resource: [ 'outreach' ],
				operation: [ 'GET' ],
				outreach_id: [null, '', undefined]
			}
		}
	}),
] as INodeProperties[];

export const resolve = async (node: IExecuteFunctions, i: number) => {
	const advocacy_campaign_id = node.getNodeParameter('advocacy_campaign_id', i) as string;
	const person_id = node.getNodeParameter('person_id', i) as string;

	let url = `/api/v2`
	if (advocacy_campaign_id) {
		url += `/advocacy_campaigns/${advocacy_campaign_id}/outreaches`
	} else if (person_id) {
		url += `/people/${person_id}/outreaches`
	} else {
		throw new Error("You must provide a Form ID or Person ID")
	}

	const outreach_id = node.getNodeParameter('outreach_id', i) as string;
	const operation = node.getNodeParameter('operation', i) as 'GET' | 'PUT' | 'POST';

	if (outreach_id && operation === 'GET') {
		return actionNetworkApiRequest.call(node, operation, `${url}/${outreach_id}`) as Promise<IDataObject>
	}

	if (outreach_id && operation === 'PUT') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, undefined) as any)?.identifiers,
			'targets': (node.getNodeParameter('additional_properties', i, undefined) as any)?.targets,
			'subject': node.getNodeParameter('subject', i, undefined),
			'message': node.getNodeParameter('message', i, undefined)
		}
		return actionNetworkApiRequest.call(node, operation, `${url}/${outreach_id}`, body) as Promise<IDataObject>
	}

	if (advocacy_campaign_id && operation === 'POST') {
		let body: any = {
			'identifiers': (node.getNodeParameter('additional_properties', i, undefined) as any)?.identifiers,
			'targets': (node.getNodeParameter('additional_properties', i, undefined) as any)?.targets,
			'subject': node.getNodeParameter('subject', i, undefined),
			'message': node.getNodeParameter('message', i, undefined),
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
	const qs = {
		...createPaginationProperties(node, i),
		...createFilterProperties(node, i)
	}
	return actionNetworkApiRequest.call(node, 'GET', url, undefined, undefined, qs) as Promise<IDataObject[]>
}
