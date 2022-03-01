import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	copperApiRequest,
	getAutomaticSecret,
} from './GenericFunctions';

export class CopperTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Copper Trigger',
		name: 'copperTrigger',
		icon: 'file:copper.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle Copper events via webhooks',
		defaults: {
			name: 'Copper Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'copperApi',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Lead',
						value: 'lead',
					},
					{
						name: 'Opportunity',
						value: 'opportunity',
					},
					{
						name: 'Person',
						value: 'person',
					},
					{
						name: 'Project',
						value: 'project',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				description: 'The resource which will fire the event.',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				options: [
					{
						name: 'Delete',
						value: 'delete',
						description: 'An existing record is removed',
					},
					{
						name: 'New',
						value: 'new',
						description: 'A new record is created',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Any field in the existing entity record is changed',
					},
				],
				description: 'The event to listen to.',
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
				const endpoint = `/webhooks/${webhookData.webhookId}`;
				try {
					await copperApiRequest.call(this, 'GET', endpoint);
				} catch (error) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const resource = this.getNodeParameter('resource') as string;
				const event = this.getNodeParameter('event') as string;
				const endpoint = '/webhooks';
				const body: IDataObject = {
					target: webhookUrl,
					type: resource,
					event,
				};

				const credentials = await this.getCredentials('copperApi');
				body.secret = {
					secret: getAutomaticSecret(credentials!),
				};

				const { id } = await copperApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhooks/${webhookData.webhookId}`;
				try {
					await copperApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const credentials = await this.getCredentials('copperApi');
		const req = this.getRequestObject();

		// Check if the supplied secret matches. If not ignore request.
		if (req.body.secret !== getAutomaticSecret(credentials!)) {
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body),
			],
		};
	}
}
