import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';
import {
	INodeTypeDescription,
	INodeType,
	IDataObject,
	IWebhookResponseData,
} from 'n8n-workflow';
import {
	apiRequest,
} from './GenericFunctions';

export class CustomerIoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Customer.io Trigger',
		name: 'customerIo',
		group: ['trigger'],
		icon: 'file:customer.Io.png',
		version: 1,
		subtitle: '=Updates: {{$parameter["updates"].join(", ")}}',
		description: 'Starts the workflow on a Customer.io update.',
		defaults: {
			name: 'CustomerDotIO Trigger',
			color: '#00FF00',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'customerIoApi',
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
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: [],
				description: 'The events that can trigger the webhook and whether they are enabled.',
				options: [
					{
						name: 'Customer Subscribed',
						value: 'customer.subscribed',
						description: 'Whether the webhook is triggered when a list subscriber is added.',
					},
					{
						name: 'Customer Unsubscribe',
						value: 'customer.unsubscribed',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email Attempted',
						value: 'email.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email Bounced',
						value: 'email.bounced',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email clicked',
						value: 'email.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email converted',
						value: 'email.converted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email delivered',
						value: 'email.delivered',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email drafted',
						value: 'email.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email failed',
						value: 'email.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email opened',
						value: 'email.opened',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email sent',
						value: 'email.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Email spammed',
						value: 'email.spammed',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push attempted',
						value: 'push.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push bounced',
						value: 'push.bounced',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push clicked',
						value: 'push.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push delivered',
						value: 'push.delivered',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push drafted',
						value: 'push.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push failed',
						value: 'push.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push opened',
						value: 'push.opened',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Push sent',
						value: 'push.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Slack attempted',
						value: 'slack.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Slack clicked',
						value: 'slack.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Slack drafted',
						value: 'slack.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Slack failed',
						value: 'slack.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'Slack sent',
						value: 'slack.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS attempted',
						value: 'slack.attempted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS bounced',
						value: 'slack.bounced',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS clicked',
						value: 'slack.clicked',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS delivered',
						value: 'slack.delivered',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS drafted',
						value: 'slack.drafted',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS failed',
						value: 'slack.failed',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},
					{
						name: 'SMS sent',
						value: 'slack.sent',
						description: 'Whether the webhook is triggered when a list member unsubscribes.',
					},

				],
			},
		],
	};
	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				console.log("in checkexists function")
				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}
				const endpoint = `/reporting_webhooks/${webhookData.webhookId}`;
				try {
					await apiRequest.call(this, 'GET', endpoint, {});
				} catch (err) {
					if (err.statusCode === 404) {
						return false;
					}
					throw new Error(`Customer.io Error: ${err}`);
				}

				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				let webhook;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events', []) as string[];

				const endpoint1 = '/reporting_webhooks';
				for (const event of events) {
					var obj = event.split('.');

					// var obj2 = JSON.stringify(obj);
					// var key = obj[0]; //push
					// var val = JSON.stringify(obj[1]); //attempted

					// var obj1: { obj2: boolean; } = { obj2: true }; //{'attempted':true}


				}
				const body = {
					endpoint: webhookUrl,
					// events: events.reduce((object, currentValue) => {
					// 	// @ts-ignore
					// 	var obj = currentValue.split('.');

					// 	//object[currentValue] = true;

					// 	return object;
					// }, {}),
					"events": {
						"customer": {
							"subscribed": false,
							"unsubscribed": true
						},
					},
				};
				console.log(body);
				try {
					webhook = await apiRequest.call(this, 'POST', endpoint1, body);
				} catch (e) {
					throw e;
				}
				if (webhook.id === undefined) {
					return false;
				}
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = webhook.id as string;
				webhookData.events = events;
				return true;

			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/reporting_webhooks/${webhookData.webhookId}`;
					try {
						await apiRequest.call(this, endpoint, 'DELETE', {});
					} catch (e) {
						return false;
					}
					delete webhookData.webhookId;
					delete webhookData.events;

				}
				return true;
			},
		}
	};



	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const webhookData = this.getWorkflowStaticData('node') as IDataObject;
		const req = this.getRequestObject();
		if (req.body.id !== webhookData.id) {
			return {};
		}
		// @ts-ignore
		if (!webhookData.events.includes(req.body.type)
			// @ts-ignore
			&& !webhookData.sources.includes(req.body.type)) {
			return {};
		}
		return {
			workflowData: [
				this.helpers.returnJsonArray([bodyData])
			],
		};
	}


}
