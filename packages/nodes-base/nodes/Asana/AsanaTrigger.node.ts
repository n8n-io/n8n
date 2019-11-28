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
	asanaApiRequest,
} from './GenericFunctions';

import { createHmac } from 'crypto';

export class AsanaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Asana Trigger',
		name: 'asanaTrigger',
		icon: 'file:asana.png',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Asana events occure.',
		defaults: {
			name: 'Asana Trigger',
			color: '#559922',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'asanaApi',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'string',
				default: '',
				required: true,
				description: 'The resource ID to subscribe to. The resource can be a task or project.',
			},
			{
				displayName: 'Workspace',
				name: 'workspace',
				type: 'string',
				default: '',
				required: false,
				description: 'The workspace ID the resource is registered under. This is only required if you want to allow overriding existing webhooks.',
			},
		],

	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId === undefined) {
					// No webhook id is set so no webhook can exist
					return false;
				}

				// Webhook got created before so check if it still exists
				const endpoint = `webhooks/${webhookData.webhookId}`;

				try {
					await asanaApiRequest.call(this, 'GET', endpoint, {});
				} catch (e) {
					if (e.statusCode === 404) {
						// Webhook does not exist
						delete webhookData.webhookId;

						return false;
					}

					// Some error occured
					throw e;
				}

				// If it did not error then the webhook exists
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const resource = this.getNodeParameter('resource') as string;

				const workspace = this.getNodeParameter('workspace') as string;

				const endpoint = `webhooks`;

				const body = {
					resource,
					target: webhookUrl,
				};

				let responseData
				try {
					 responseData = await asanaApiRequest.call(this, 'POST', endpoint, body);
				} catch(error) {
					// delete webhook if it already exists
					if (error.statusCode === 403) {
						const webhookData = await asanaApiRequest.call(this, 'GET', endpoint, {}, { workspace });
						const webhook = webhookData.data.find((webhook: any) => {
							return webhook.target === webhookUrl && webhook.resource.gid === resource
						});
						await asanaApiRequest.call(this, 'DELETE', `${endpoint}/${webhook.gid}`, {});
						responseData = await asanaApiRequest.call(this, 'POST', endpoint, body);
					} else {
						throw error
					}
				}

				if (responseData.data === undefined || responseData.data.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.data.id as string;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `webhooks/${webhookData.webhookId}`;
					const body = {};

					try {
						await asanaApiRequest.call(this, 'DELETE', endpoint, body);
					} catch (e) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registred anymore
					delete webhookData.webhookId;
					delete webhookData.webhookEvents;
				}

				return true;
			},
		},
	};



	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const headerData = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();

		const webhookData = this.getWorkflowStaticData('node') as IDataObject;


		if (headerData['x-hook-secret'] !== undefined) {
			// Is a create webhook confirmation request
			webhookData.hookSecret = headerData['x-hook-secret'];

			const res = this.getResponseObject();
			res.set('X-Hook-Secret', webhookData.hookSecret as string);
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		// Is regular webhook call
		// Check if it contains any events
		if (bodyData.events === undefined || !Array.isArray(bodyData.events) ||
			bodyData.events.length === 0) {
			// Does not contain any event data so nothing to process so no reason to
			// start the workflow
			return {};
		}

		// Check if the request is valid
		// (if the signature matches to data and hookSecret)
		const computedSignature = createHmac("sha256", webhookData.hookSecret as string).update(JSON.stringify(req.body)).digest("hex");
		if (headerData['x-hook-signature'] !== computedSignature) {
			// Signature is not valid so ignore call
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body)
			],
		};
	}
}
