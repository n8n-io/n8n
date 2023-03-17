import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { acuitySchedulingApiRequest } from './GenericFunctions';

export class AcuitySchedulingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Acuity Scheduling Trigger',
		name: 'acuitySchedulingTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:acuityScheduling.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Acuity Scheduling events via webhooks',
		defaults: {
			name: 'Acuity Scheduling Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'acuitySchedulingApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'acuitySchedulingOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
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
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'API Key',
						value: 'apiKey',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'apiKey',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'appointment.canceled',
						value: 'appointment.canceled',
						description: 'Is called whenever an appointment is canceled',
					},
					{
						name: 'appointment.changed',
						value: 'appointment.changed',
						description: 'Is called when the appointment is changed in any way',
					},
					{
						name: 'appointment.rescheduled',
						value: 'appointment.rescheduled',
						description: 'Is called when the appointment is rescheduled to a new time',
					},
					{
						name: 'appointment.scheduled',
						value: 'appointment.scheduled',
						description: 'Is called once when an appointment is initially booked',
					},
					{
						name: 'order.completed',
						value: 'order.completed',
						description: 'Is called when an order is completed',
					},
				],
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default does the webhook-data only contain the ID of the object. If this option gets activated, it will resolve the data automatically.',
			},
		],
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = '/webhooks';
				const webhooks = await acuitySchedulingApiRequest.call(this, 'GET', endpoint);
				if (Array.isArray(webhooks)) {
					for (const webhook of webhooks) {
						if (webhook.id === webhookData.webhookId) {
							return true;
						}
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const endpoint = '/webhooks';
				const body: IDataObject = {
					target: webhookUrl,
					event,
				};
				const { id } = await acuitySchedulingApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhooks/${webhookData.webhookId}`;
				try {
					await acuitySchedulingApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();

		const resolveData = this.getNodeParameter('resolveData', false) as boolean;

		if (!resolveData) {
			// Return the data as it got received
			return {
				workflowData: [this.helpers.returnJsonArray(req.body as IDataObject[])],
			};
		}

		// Resolve the data by requesting the information via API
		const event = this.getNodeParameter('event', false) as string;
		const eventType = event.split('.').shift();
		const endpoint = `/${eventType}s/${req.body.id}`;
		const responseData = await acuitySchedulingApiRequest.call(this, 'GET', endpoint, {});

		return {
			workflowData: [this.helpers.returnJsonArray(responseData as IDataObject)],
		};
	}
}
