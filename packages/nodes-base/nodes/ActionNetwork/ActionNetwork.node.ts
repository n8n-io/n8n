import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as person from './resources/person'
import * as campaign from './resources/campaign'
import * as petition from './resources/petition'
import * as signature from './resources/signature'
import * as event_campaign from './resources/event_campaign'
import * as event from './resources/event'
import * as attendance from './resources/attendance'
import * as form from './resources/form'
import * as submission from './resources/submission'
import * as fundraising_page from './resources/fundraising_page'
import * as donation from './resources/donation'
import * as advocacy_campaign from './resources/advocacy_campaign'
import * as outreach from './resources/outreach'
import * as wrapper from './resources/wrapper'
import * as embed from './resources/embed'
import * as message from './resources/message'
import * as query from './resources/query'
import { createIdentifierDictionary } from './helpers/osdi';

const resources = [
	{ name: 'Person', value: 'person', resolver: person.logic },
	{ name: "Message", value: 'message', resolver: message.logic },
	{ name: 'Campaign', value: 'campaign', resolver: campaign.logic },
	{ name: 'Petition', value: 'petition', resolver: petition.logic },
	{ name: 'Signature', value: 'signature', resolver: signature.logic },
	{ name: 'Event Campaign', value: 'event_campaign', resolver: event_campaign.logic },
	{ name: 'Event', value: 'event', resolver: event.logic },
	{ name: 'Attendance', value: 'attendance', resolver: attendance.logic },
	{ name: 'Fundraising Page', value: 'fundraising_page', resolver: fundraising_page.logic },
	{ name: 'Donation', value: 'donation', resolver: donation.logic },
	{ name: 'Form', value: 'form', resolver: form.logic },
	{ name: 'Submission', value: 'submission', resolver: submission.logic },
	{ name: "Advocacy Campaign", value: "advocacy_campaign", resolver: advocacy_campaign.logic },
	{ name: 'Outreach' , value: 'outreach', resolver: outreach.logic },
	{ name: 'Query', value: 'query', resolver: query.logic },
	{ name: 'HTML Embed', value: 'embed', resolver: embed.logic },
	{ name: 'HTML Wrapper', value: 'wrapper', resolver: wrapper.logic },
	// TODO: https://actionnetwork.org/docs/v2/tags
	// - Scenario: Retrieving a collection of tags (GET)
	// - Scenario: Creating a new tag (POST)
	// TODO: https://actionnetwork.org/docs/v2/taggings
	// - Scenario: Retrieving a collection of tagged people (GET)
	// - Scenario: Tag a person (POST)
	// - Scenario: Untag a person (DELETE)
]

export class ActionNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Action Network',
		name: 'actionNetwork',
		icon: 'file:actionnetwork.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + " " + $parameter["resource"]}}',
		description: 'Interact with an Action Network group\'s data',
		defaults: {
			name: 'Action Network',
			color: '#9dd3ed',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'ActionNetworkGroupApiToken',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: resources.map(({ name, value }) => ({ name, value })),
				default: 'person',
				description: 'The resource to operate on.',
			},
			...person.fields,
			...campaign.fields,
			...event_campaign.fields,
			...event.fields,
			...attendance.fields,
			...petition.fields,
			...signature.fields,
			...form.fields,
			...submission.fields,
			...fundraising_page.fields,
			...donation.fields,
			...advocacy_campaign.fields,
			...outreach.fields,
			...message.fields,
			...query.fields,
			...embed.fields,
			...wrapper.fields
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Loop through 'em
		const items = this.getInputData();
		const returnData: IDataObject | IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0)
		const resourceResolver = resources.find(r => r.value === resource)?.resolver!

		for (let i = 0; i < items.length; i++) {
			let responseData = await resourceResolver(this) as any

			try {
				// Identify where the list of data is
				const firstDataKey = Object.keys(responseData['_embedded'])[0]

				// Try to identify a dictionary of IDs
				// Particularly useful for pulling out the Action Network ID of an item for a further operation on it
				// e.g. find an event, get its ID and then sign someone up to it via its ID
				for (const i in responseData['_embedded'][firstDataKey] as any[]) {
					responseData['_embedded'][firstDataKey][i].identifierDictionary = createIdentifierDictionary(responseData['_embedded'][firstDataKey][i].identifiers)
				}

				// And optionally generate data items from the request, if possible
				const include_metadata = this.getNodeParameter('include_metadata', 0) as boolean
				if (!include_metadata) {
					// @ts-ignore
					responseData = responseData['_embedded'][firstDataKey]
				}
			} catch (e) {
				// Try and identify IDs from a single object
				responseData.identifierDictionary = createIdentifierDictionary(responseData.identifiers)
			}

			// Add the responses onto the return chain
			// TODO: correctly extract response items from the metadata wrapper
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData);
			} else {
				returnData.push(responseData);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
