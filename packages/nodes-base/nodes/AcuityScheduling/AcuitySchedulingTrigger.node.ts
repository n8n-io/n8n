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
	acuitySchedulingApiRequest,
} from './GenericFunctions';

export class AcuitySchedulingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Acuity Scheduling Trigger',
		name: 'acuityScheduling',
		icon: 'file:acuityScheduling.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Acuity Scheduling events via webhooks',
		defaults: {
			name: 'Acuity Scheduling Trigger',
			color: '#000000',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'acuitySchedulingApi',
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
				default: '',
				options: [
					{
						name: 'appointment.scheduled',
						value: 'appointment.scheduled',
						description: 'is called once when an appointment is initially booked',
					},
					{
						name: 'appointment.rescheduled',
						value: 'appointment.rescheduled',
						description: 'is called when the appointment is rescheduled to a new time',
					},
					{
						name: 'appointment.canceled',
						value: 'appointment.canceled',
						description: 'is called whenever an appointment is canceled',
					},
					{
						name: 'appointment.changed',
						value: 'appointment.changed',
						description: 'is called when the appointment is changed in any way',
					},
					{
						name: 'order.completed',
						value: 'order.completed',
						description: 'is called when an order is completed',
					},
				],
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
				} catch(error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
