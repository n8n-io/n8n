/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import {
	NodeConnectionTypes,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

import { BrevoWebhookApi } from './GenericFunctions';

export class BrevoTrigger implements INodeType {
	description: INodeTypeDescription = {
		credentials: [
			{
				name: 'sendInBlueApi',
				required: true,
				displayOptions: {
					show: {},
				},
			},
		],
		displayName: 'Brevo Trigger',
		defaults: {
			name: 'Brevo Trigger',
		},
		description: 'Starts the workflow when Brevo events occur',
		group: ['trigger'],
		icon: 'file:brevo.svg',
		inputs: [],
		// keep sendinblue name for backward compatibility
		name: 'sendInBlueTrigger',
		outputs: [NodeConnectionTypes.Main],
		version: 1,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhooks',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				default: 'transactional',
				name: 'type',
				options: [
					{ name: 'Inbound', value: 'inbound' },
					{ name: 'Marketing', value: 'marketing' },
					{ name: 'Transactional', value: 'transactional' },
				],
				required: true,
				type: 'options',
			},
			{
				displayName: 'Trigger on',
				displayOptions: {
					show: {
						type: ['transactional'],
					},
				},
				name: 'events',
				placeholder: 'Add event',
				options: [
					{
						name: 'Email blocked',
						value: 'blocked',
						description: 'Triggers when transactional email is blocked',
					},
					{
						name: 'Email clicked',
						value: 'click',
						description: 'Triggers when transactional email is clicked',
					},
					{
						name: 'Email deferred',
						value: 'deferred',
						description: 'Triggers when transactional email is deferred',
					},
					{
						name: 'Email delivered',
						value: 'delivered',
						description: 'Triggers when transactional email is delivered',
					},
					{
						name: 'Email hard bounce',
						value: 'hardBounce',
						description: 'Triggers when transactional email is hard bounced',
					},
					{
						name: 'Email invalid',
						value: 'invalid',
						description: 'Triggers when transactional email is invalid',
					},
					{
						name: 'Email marked spam',
						value: 'spam',
						description: 'Triggers when transactional email is set to spam',
					},
					{
						name: 'Email opened',
						value: 'opened',
						description: 'Triggers when transactional email is opened',
					},
					{
						name: 'Email sent',
						value: 'request',
						description: 'Triggers when transactional email is sent',
					},
					{
						name: 'Email soft-bounce',
						value: 'softBounce',
						description: 'Triggers when transactional email is soft bounced',
					},
					{
						name: 'Email unique open',
						value: 'uniqueOpened',
						description: 'Triggers when transactional email is unique opened',
					},
					{
						name: 'Email unsubscribed',
						value: 'unsubscribed',
						description: 'Triggers when transactional email is unsubscribed',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
			{
				displayName: 'Trigger on',
				displayOptions: {
					show: {
						type: ['marketing'],
					},
				},
				name: 'events',
				placeholder: 'Add event',
				options: [
					{
						name: 'Marketing email clicked',
						value: 'click',
						description: 'Triggers when marketing email is clicked',
					},
					{
						name: 'Marketing email delivered',
						value: 'delivered',
						description: 'Triggers when marketing email is delivered',
					},
					{
						name: 'Marketing email hard bounce',
						value: 'hardBounce',
						description: 'Triggers when marketing email is hard bounced',
					},
					{
						name: 'Marketing email list addition',
						value: 'listAddition',
						description: 'Triggers when marketing email is clicked',
					},
					{
						name: 'Marketing email opened',
						value: 'opened',
						description: 'Triggers when marketing email is opened',
					},
					{
						name: 'Marketing email soft bounce',
						value: 'softBounce',
						description: 'Triggers when marketing email is soft bounced',
					},
					{
						name: 'Marketing email spam',
						value: 'spam',
						description: 'Triggers when marketing email is spam',
					},
					{
						name: 'Marketing email unsubscribed',
						value: 'unsubscribed',
						description: 'Triggers when marketing email is unsubscribed',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
			{
				displayName: 'Trigger on',
				displayOptions: {
					show: {
						type: ['inbound'],
					},
				},
				name: 'events',
				placeholder: 'Add event',
				options: [
					{
						name: 'Inbound email processed',
						value: 'inboundEmailProcessed',
						description: 'Triggers when inbound email is processed',
					},
				],
				default: [],
				required: true,
				type: 'multiOptions',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				try {
					const { webhooks } = await BrevoWebhookApi.fetchWebhooks(this, type);

					for (const webhook of webhooks) {
						if (
							webhook.type === type &&
							webhook.events.every((event) => events.includes(event)) &&
							webhookUrl === webhook.url
						) {
							webhookData.webhookId = webhook.id;
							return true;
						}
					}
					// If it did not error then the webhook exists
					return false;
				} catch (err) {
					return false;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const type = this.getNodeParameter('type') as string;

				const events = this.getNodeParameter('events') as string[];

				const responseData = await BrevoWebhookApi.createWebHook(this, type, events, webhookUrl);

				if (responseData?.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					try {
						await BrevoWebhookApi.deleteWebhook(this, webhookData.webhookId as string);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
					delete webhookData.hookSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// The data to return and so start the workflow with
		const bodyData = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
