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
	{ name: 'Person', value: 'person', resolver: person.resolve },
	{ name: "Message", value: 'message', resolver: message.resolve },
	{ name: 'Campaign', value: 'campaign', resolver: campaign.resolve },
	{ name: 'Petition', value: 'petition', resolver: petition.resolve },
	{ name: 'Signature', value: 'signature', resolver: signature.resolve },
	{ name: 'Event Campaign', value: 'event_campaign', resolver: event_campaign.resolve },
	{ name: 'Event', value: 'event', resolver: event.resolve },
	{ name: 'Attendance', value: 'attendance', resolver: attendance.resolve },
	{ name: 'Fundraising Page', value: 'fundraising_page', resolver: fundraising_page.resolve },
	{ name: 'Donation', value: 'donation', resolver: donation.resolve },
	{ name: 'Form', value: 'form', resolver: form.resolve },
	{ name: 'Submission', value: 'submission', resolver: submission.resolve },
	{ name: "Advocacy Campaign", value: "advocacy_campaign", resolver: advocacy_campaign.resolve },
	{ name: 'Outreach' , value: 'outreach', resolver: outreach.resolve },
	{ name: 'Query', value: 'query', resolver: query.resolve },
	{ name: 'HTML Embed', value: 'embed', resolver: embed.resolve },
	{ name: 'HTML Wrapper', value: 'wrapper', resolver: wrapper.resolve },
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
		let returnData: IDataObject | IDataObject[] = [];
		const resource = this.getNodeParameter('resource', i)
		const resolveResource = resources.find(r => r.value === resource)?.resolver!

		for (let i = 0; i < items.length; i++) {
			let responseData = await resolveResource(this, i) as any

			// Some general transformations on the resolved data
			try {
				// Identify where the list of data is
				const firstDataKey = Object.keys(responseData['_embedded'])[0]
				if (!firstDataKey) {
					throw new Error("No data found")
				}
				// Try to give each item an ID dictionary for upstream work.
				// Particularly useful for pulling out the Action Network ID of an item for a further operation on it
				// e.g. find an event, get its ID and then sign someone up to it via its ID
				responseData['_embedded'].forEach((item, i) => {
					responseData['_embedded'][i] = {
						...item,
						identifierDictionary: createIdentifierDictionary(item?.identifiers as string[])
					}
				})
				// Optionally return a big list of items
				if (!this.getNodeParameter('include_metadata', i) as boolean) {
					// @ts-ignore
					responseData = responseData['_embedded'][firstDataKey]
				}
			} catch (e) {}

			// Add the responses onto the return chain
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData);
			} else {
				returnData.push(responseData);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
