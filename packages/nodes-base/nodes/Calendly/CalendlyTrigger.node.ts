import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	calendlyApiRequest,
} from './GenericFunctions';

export class CalendlyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calendly Trigger',
		name: 'calendlyTrigger',
		icon: 'file:calendly.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Calendly events occur',
		defaults: {
			name: 'Calendly Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'calendlyApi',
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
						name: 'invitee.created',
						value: 'invitee.created',
						description: 'Receive notifications when a new Calendly event is created',
					},
					{
						name: 'invitee.canceled',
						value: 'invitee.canceled',
						description: 'Receive notifications when a Calendly event is canceled',
					},
				],
				default: [],
				required: true,
			},
		],

	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/hooks';
				const { data } = await calendlyApiRequest.call(this, 'GET', endpoint, {});

				for (const webhook of data) {
					if (webhook.attributes.url === webhookUrl) {
						for (const event of events) {
							if (!webhook.attributes.events.includes(event)) {
								return false;
							}
						}
					}
					// Set webhook-id to be sure that it can be deleted
					webhookData.webhookId = webhook.id as string;
					return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string;

				const endpoint = '/hooks';

				const body = {
					url: webhookUrl,
					events,
				};

				const responseData = await calendlyApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/hooks/${webhookData.webhookId}`;

					try {
						await calendlyApiRequest.call(this, 'DELETE', endpoint);
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
		const bodyData = this.getBodyData();
		return {
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
