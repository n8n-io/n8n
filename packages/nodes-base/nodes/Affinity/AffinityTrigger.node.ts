import type { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { affinityApiRequest, eventsExist, mapResource } from './GenericFunctions';

export class AffinityTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Affinity Trigger',
		name: 'affinityTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:affinity.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Affinity events via webhooks',
		defaults: {
			name: 'Affinity Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'affinityApi',
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
						name: 'field_value.created',
						value: 'field_value.created',
					},
					{
						name: 'field_value.deleted',
						value: 'field_value.deleted',
					},
					{
						name: 'field_value.updated',
						value: 'field_value.updated',
					},
					{
						name: 'field.created',
						value: 'field.created',
					},
					{
						name: 'field.deleted',
						value: 'field.deleted',
					},
					{
						name: 'field.updated',
						value: 'field.updated',
					},
					{
						name: 'file.created',
						value: 'file.created',
					},
					{
						name: 'file.deleted',
						value: 'file.deleted',
					},
					{
						name: 'list_entry.created',
						value: 'list_entry.created',
					},
					{
						name: 'list_entry.deleted',
						value: 'list_entry.deleted',
					},
					{
						name: 'list.created',
						value: 'list.created',
					},
					{
						name: 'list.deleted',
						value: 'list.deleted',
					},
					{
						name: 'list.updated',
						value: 'list.updated',
					},
					{
						name: 'note.created',
						value: 'note.created',
					},
					{
						name: 'note.deleted',
						value: 'note.deleted',
					},
					{
						name: 'note.updated',
						value: 'note.updated',
					},
					{
						name: 'opportunity.created',
						value: 'opportunity.created',
					},
					{
						name: 'opportunity.deleted',
						value: 'opportunity.deleted',
					},
					{
						name: 'opportunity.updated',
						value: 'opportunity.updated',
					},
					{
						name: 'organization.created',
						value: 'organization.created',
					},
					{
						name: 'organization.deleted',
						value: 'organization.deleted',
					},
					{
						name: 'organization.updated',
						value: 'organization.updated',
					},
					{
						name: 'person.created',
						value: 'person.created',
					},
					{
						name: 'person.deleted',
						value: 'person.deleted',
					},
					{
						name: 'person.updated',
						value: 'person.updated',
					},
				],
				default: [],
				required: true,
				description: 'Webhook events that will be enabled for that endpoint',
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/webhook';

				const responseData = await affinityApiRequest.call(this, 'GET', endpoint, {});

				const webhookUrl = this.getNodeWebhookUrl('default');

				const events = this.getNodeParameter('events') as string[];

				for (const webhook of responseData) {
					if (eventsExist(webhook.subscriptions, events) && webhook.webhook_url === webhookUrl) {
						// Set webhook-id to be sure that it can be deleted
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				if (webhookUrl.includes('%20')) {
					throw new NodeOperationError(
						this.getNode(),
						'The name of the Affinity Trigger Node is not allowed to contain any spaces!',
					);
				}

				const events = this.getNodeParameter('events') as string[];

				const endpoint = '/webhook/subscribe';

				const body = {
					webhook_url: webhookUrl,
					subscriptions: events,
				};

				const responseData = await affinityApiRequest.call(this, 'POST', endpoint, body);

				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.id as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhook/${webhookData.webhookId}`;

					const responseData = await affinityApiRequest.call(this, 'DELETE', endpoint);

					if (!responseData.success) {
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

		if (bodyData.type === 'sample.webhook') {
			return {};
		}

		let responseData: IDataObject = {};

		if (bodyData.type && bodyData.body) {
			const resource = (bodyData.type as string).split('.')[0];
			//@ts-ignore
			const id = bodyData.body.id;
			responseData = await affinityApiRequest.call(this, 'GET', `/${mapResource(resource)}/${id}`);
			responseData.type = bodyData.type;
		}

		return {
			workflowData: [this.helpers.returnJsonArray(responseData)],
		};
	}
}
