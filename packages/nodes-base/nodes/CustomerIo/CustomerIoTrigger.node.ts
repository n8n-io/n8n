import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { customerIoApiRequest, eventExists, toApiEventName } from './GenericFunctions';

export class CustomerIoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customer.io Trigger',
		name: 'customerIoTrigger',
		group: ['trigger'],
		icon: { light: 'file:customerio.svg', dark: 'file:customerio.dark.svg' },
		version: 1,
		description: 'Starts the workflow on a Customer.io update (Beta)',
		defaults: {
			name: 'Customer.io Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'customerIoApi',
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
				required: true,
				default: [],
				description: 'The events that can trigger the webhook and whether they are enabled',
				options: [
					{
						name: 'Customer Subscribed',
						value: 'customer.subscribed',
						description: 'Whether the webhook is triggered when a list subscriber is added',
					},
					{
						name: 'Customer Unsubscribe',
						value: 'customer.unsubscribed',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Attempted',
						value: 'email.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Bounced',
						value: 'email.bounced',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Clicked',
						value: 'email.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Converted',
						value: 'email.converted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Delivered',
						value: 'email.delivered',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Drafted',
						value: 'email.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Failed',
						value: 'email.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Opened',
						value: 'email.opened',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Sent',
						value: 'email.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Email Spammed',
						value: 'email.spammed',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Attempted',
						value: 'push.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Bounced',
						value: 'push.bounced',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Clicked',
						value: 'push.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Delivered',
						value: 'push.delivered',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Drafted',
						value: 'push.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Failed',
						value: 'push.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Opened',
						value: 'push.opened',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Push Sent',
						value: 'push.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Slack Attempted',
						value: 'slack.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Slack Clicked',
						value: 'slack.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Slack Drafted',
						value: 'slack.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Slack Failed',
						value: 'slack.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'Slack Sent',
						value: 'slack.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Attempted',
						value: 'sms.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Bounced',
						value: 'sms.bounced',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Clicked',
						value: 'sms.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Delivered',
						value: 'sms.delivered',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Drafted',
						value: 'sms.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Failed',
						value: 'sms.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
					{
						name: 'SMS Sent',
						value: 'sms.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const webhookData = this.getWorkflowStaticData('node');

				const currentEvents = this.getNodeParameter('events', []) as string[];

				const endpoint = '/reporting_webhooks';

				let { reporting_webhooks: webhooks } = await customerIoApiRequest.call(
					this,
					'GET',
					endpoint,
					{},
					'app',
				);

				if (webhooks === null) {
					webhooks = [];
				}

				for (const webhook of webhooks) {
					if (
						webhook.endpoint === webhookUrl &&
						eventExists(currentEvents, webhook.events as string[])
					) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];

				const endpoint = '/reporting_webhooks';

				const body = {
					name: `n8n webhook - ${webhookUrl}`,
					endpoint: webhookUrl,
					events: events.map(toApiEventName),
				};

				const webhook = await customerIoApiRequest.call(this, 'POST', endpoint, body, 'app');

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/reporting_webhooks/${webhookData.webhookId}`;
					try {
						await customerIoApiRequest.call(this, 'DELETE', endpoint, {}, 'app');
					} catch (error) {
						return false;
					}
					delete webhookData.webhookId;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
