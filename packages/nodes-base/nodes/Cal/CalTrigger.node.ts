import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { calApiRequest, sortOptionParameters } from './GenericFunctions';

export class CalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cal Trigger',
		name: 'calTrigger',
		icon: 'file:cal.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Handle Cal events via webhooks',
		defaults: {
			name: 'Cal Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'calApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Booking Cancelled',
						value: 'BOOKING_CANCELLED',
						description: 'Receive notifications when a Cal event is canceled',
					},
					{
						name: 'Booking Created',
						value: 'BOOKING_CREATED',
						description: 'Receive notifications when a new Cal event is created',
					},
					{
						name: 'Booking Rescheduled',
						value: 'BOOKING_RESCHEDULED',
						description: 'Receive notifications when a Cal event is rescheduled',
					},
				],
				default: [],
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'App ID',
						name: 'appId',
						type: 'string',
						description: 'The ID of the App to monitor',
						default: '',
					},
					{
						displayName: 'EventType Name or ID',
						name: 'eventTypeId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getEventTypes',
						},
						description:
							'The EventType to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
						default: '',
					},
					{
						displayName: 'Payload Template',
						name: 'payloadTemplate',
						type: 'string',
						description: 'Template to customize the webhook payload',
						default: '',
						typeOptions: {
							rows: 4,
						},
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getEventTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const data = await calApiRequest.call(this, 'GET', '/event-types', {});

				for (const item of data.event_types) {
					returnData.push({
						name: item.title,
						value: item.id,
					});
				}

				return sortOptionParameters(returnData);
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const data = await calApiRequest.call(this, 'GET', '/hooks', {});

				for (const webhook of data.webhooks) {
					if (webhook.subscriberUrl === webhookUrl) {
						for (const event of events) {
							if (!webhook.eventTriggers.includes(event)) {
								return false;
							}
						}
						// Set webhook-id to be sure that it can be deleted
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriberUrl = this.getNodeWebhookUrl('default');
				const eventTriggers = this.getNodeParameter('events') as string;
				const options = this.getNodeParameter('options');
				const active = true;

				const body = {
					subscriberUrl,
					eventTriggers,
					active,
					...(options as object),
				};

				const responseData = await calApiRequest.call(this, 'POST', '/hooks', body);

				if (responseData.webhook.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.webhook.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/hooks/${webhookData.webhookId}`;

					try {
						await calApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					triggerEvent: req.body.triggerEvent as string,
					createdAt: req.body.createdAt as string,
					...(req.body.payload as IDataObject),
				}),
			],
		};
	}
}
