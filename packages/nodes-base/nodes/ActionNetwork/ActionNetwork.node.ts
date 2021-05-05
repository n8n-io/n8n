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
import * as tag from './resources/tag'
import * as tagging from './resources/tagging'

import { createIdentifierDictionary } from './helpers/osdi';

const resources = [
	{ name: 'Person', value: 'person', module: person },
	{ name: 'Message', value: 'message', module: message },
	{ name: 'Campaign', value: 'campaign', module: campaign },
	{ name: 'Petition', value: 'petition', module: petition },
	{ name: 'Signature', value: 'signature', module: signature },
	{ name: 'Event Campaign', value: 'event_campaign', module: event_campaign },
	{ name: 'Event', value: 'event', module: event },
	{ name: 'Attendance', value: 'attendance', module: attendance },
	{ name: 'Fundraising Page', value: 'fundraising_page', module: fundraising_page },
	{ name: 'Donation', value: 'donation', module: donation },
	{ name: 'Form', value: 'form', module: form },
	{ name: 'Submission', value: 'submission', module: submission },
	{ name: 'Advocacy Campaign', value: 'advocacy_campaign', module: advocacy_campaign },
	{ name: 'Outreach' , value: 'outreach', module: outreach },
	{ name: 'Query', value: 'query', module: query },
	{ name: 'HTML Embed', value: 'embed', module: embed },
	{ name: 'HTML Wrapper', value: 'wrapper', module: wrapper },
	{ name: 'Tags', value: 'tag', module: tag },
	{ name: 'Taggings', value: 'tagging', module: tagging },
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
			// Unpack all the fields from the 'resources' blob up top
			...resources.reduce((fields, resource) => fields.concat(resource.module.fields), [] as any[])
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Loop through 'em
		const items = this.getInputData();
		let returnData: IDataObject | IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i)
			const resolveResource = resources.find(r => r.value === resource)?.module.resolve!
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
				(responseData['_embedded'][firstDataKey] as any[]).forEach((item, i) => {
					responseData['_embedded'][firstDataKey][i] = {
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
