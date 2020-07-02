import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	convertKitApiRequest,
} from './GenericFunctions';


export class ConvertKitTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ConvertKit Trigger',
		name: 'convertKitTrigger',
		icon: 'file:convertKit.png',
		subtitle: '={{$parameter["event"]}}',
		group: ['trigger'],
		version: 1,
		description: 'Handle ConvertKit events via webhooks',
		defaults: {
			name: 'ConvertKit Trigger',
			color: '#fb6970',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'convertKitApi',
				required: true,
			}
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'subscriberActivated',
				description: 'The events that can trigger the webhook and whether they are enabled.',
				options: [
					{
						name: 'Subscriber Activated',
						value: 'subscriberActivated',
						description: 'Whether the webhook is triggered when a subscriber is activated.',
					},
					{
						name: 'Link Clicked',
						value: 'linkClicked',
						description: 'Whether the webhook is triggered when a link is clicked.',
					},
				],
			},
			{
				displayName: 'Initiating Link',
				name: 'link',
				type: 'string',
				required: true,
				default: '',
				description: 'The URL of the initiating link',
				displayOptions: {
					show: {
						event: [
							'linkClicked',
						],
					},
				},
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if(webhookData.webhookId) {
					return true;
				}
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				let webhook;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event', 0);
				const endpoint = '/automations/hooks';

				const qs: IDataObject = {};

				try {
					qs.target_url = webhookUrl;

					if(event === 'subscriberActivated') {
						qs.event = {
							name: 'subscriber.subscriber_activate',
						};
					} else if(event === 'linkClicked') {
						const link = this.getNodeParameter('link', 0) as string;
						qs.event = {
							name: 'subscriber.link_click',
							initiator_value: link,
						};
					}
					webhook = await convertKitApiRequest.call(this, 'POST', endpoint, {}, qs);
				} catch (error) {
					throw error;
				}

				if (webhook.rule.id === undefined) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.rule.id as string;
				webhookData.events = event;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/automations/hooks/${webhookData.webhookId}`;
					try {
						await convertKitApiRequest.call(this, 'DELETE', endpoint, {}, {});
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
					delete webhookData.events;
				}
				return true;
			},
		},
	};


	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const returnData: IDataObject[] = [];
		returnData.push(this.getBodyData());

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData),
			],
		};
	}
}
