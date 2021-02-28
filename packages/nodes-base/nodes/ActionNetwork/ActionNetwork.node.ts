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

const resources = [
	{ name: 'Person', value: 'person', resolver: person.logic },
	{ name: 'Petition', value: 'petitions', resolver: petition.logic },
	{ name: 'Event', value: 'events', resolver: event.logic },
	// TODO: { name: 'Form', value: 'forms' },
	// TODO: { name: 'Fundraising Page', value: 'fundraising_pages' },
	// TODO: { name: 'Event Campaign', value: 'event_campaigns' },
	// TODO: { name: 'Campaign', value: 'campaigns' },
	// TODO: { name: "Message", value: 'messages' },
	{ name: 'Attendance', value: 'attendance', resolver: attendance.logic },
	// TODO: { name: 'Signature', value: 'signatures' },
	// TODO: { name: 'Submission', value: 'submissions' },
	// TODO: { name: 'Donation', value: 'donations' },
	// TODO: { name: 'Outreach' , value: 'outreaches' },
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
		...attendance.fields,
		...person.fields,
		...petition.fields,
		...event.fields
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
			...attendance.fields,
			...person.fields,
			...petition.fields
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
