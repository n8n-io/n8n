import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as attendance from './resources/attendance'
import * as person from './resources/person'
import * as petition from './resources/petition'
import * as event from './resources/event'
import * as signature from './resources/signature'
import * as submission from './resources/submission'
import * as form from './resources/form'
import * as wrapper from './resources/wrapper'
import * as embed from './resources/embed'

const resources = [
	{ name: 'Person', value: 'person', resolver: person.logic },
	{ name: 'Petition', value: 'petition', resolver: petition.logic },
	{ name: 'Signature', value: 'signature', resolver: signature.logic },
	// TODO: { name: 'Event Campaign', value: 'event_campaign' },
	{ name: 'Event', value: 'events', resolver: event.logic },
	{ name: 'Submission', value: 'submissionn', resolver: submission.logic },
	// TODO: { name: 'Fundraising Page', value: 'fundraising_page' },
	// TODO: { name: 'Donation', value: 'donation' },
	{ name: 'Attendance', value: 'attendance', resolver: attendance.logic },
	{ name: 'Form', value: 'form', resolver: form.logic },
	// TODO: { name: 'Campaign', value: 'campaign' },
	// TODO: { name: "Message", value: 'message' },
	// https://actionnetwork.org/docs/v2/messages
	// TODO: Advocacy Campaigns
	// TODO: { name: 'Outreach' , value: 'outreach' },
	// https://actionnetwork.org/docs/v2/schedule_helper
	// - Scenario: Schedule a message (POST)
	// - Scenario: Cancel a message's scheduling (DELETE)
	// https://actionnetwork.org/docs/v2/tags
	// - Scenario: Retrieving a collection of tags (GET)
	// - Scenario: Creating a new tag (POST)
	// https://actionnetwork.org/docs/v2/taggings
	// - Scenario: Retrieving a collection of tagged people (GET)
	// - Scenario: Tag a person (POST)
	// - Scenario: Untag a person (DELETE)
	// Webhook Payloads
	// - Action https://actionnetwork.org/docs/webhooks/action
	// - Attendance https://actionnetwork.org/docs/webhooks/attendance
	// - Donation https://actionnetwork.org/docs/webhooks/donation
	// - Outreach https://actionnetwork.org/docs/webhooks/outreach
	// - Signature https://actionnetwork.org/docs/webhooks/signature
	// - Submission https://actionnetwork.org/docs/webhooks/submission
	// - Upload https://actionnetwork.org/docs/webhooks/upload,
	{ name: 'HTML Embed', value: 'embed', resolver: embed.logic },
	{ name: 'HTML Wrapper', value: 'wrapper', resolver: wrapper.logic },
]

const description = {
	displayName: 'Action Network',
	name: 'actionNetwork',
	icon: 'file:actionnetwork.svg',
	group: ['output'],
	version: 1,
	subtitle: '={{$parameter["method"] + " " + $parameter["resource"]}}',
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
			default: resources[0].value,
			description: 'The resource to operate on.',
		},
		...person.fields,
		...event.fields,
		...attendance.fields,
		...petition.fields,
		...signature.fields,
		...form.fields,
		...submission.fields,
		...embed.fields,
		...wrapper.fields
	]
};

console.error(JSON.stringify(description, null, 2))

export class ActionNetwork implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Action Network',
		name: 'actionNetwork',
		icon: 'file:actionnetwork.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["method"] + " " + $parameter["resource"]}}',
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
				default: resources[0].value,
				description: 'The resource to operate on.',
			},
			...person.fields,
			...event.fields,
			...attendance.fields,
			...petition.fields,
			...signature.fields,
			...form.fields,
			...submission.fields,
			...embed.fields
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Loop through 'em
		const items = this.getInputData();
		const returnData: IDataObject | IDataObject[] = [];
		const resource = this.getNodeParameter('resource', 0)
		const resourceResolver = resources.find(r => r.value === resource)?.resolver!

		for (let i = 0; i < items.length; i++) {
			let next = await resourceResolver(this)

			// Add the responses onto the return chain
			// TODO: correctly extract response items from the metadata wrapper
			if (Array.isArray(next)) {
				returnData.push.apply(returnData, next);
			} else {
				returnData.push(next);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
