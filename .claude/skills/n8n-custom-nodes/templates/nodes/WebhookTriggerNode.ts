/**
 * TEMPLATE: Webhook Trigger Node
 *
 * Receives real-time events via HTTP webhooks. Registers a webhook on the
 * remote service when the workflow activates, and removes it when deactivated.
 * The webhook() method processes incoming HTTP requests.
 *
 * Three lifecycle methods in webhookMethods:
 *   - checkExists(): Check if subscription already exists
 *   - create(): Register webhook on the remote service
 *   - delete(): Unregister webhook when workflow deactivates
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 *   - __servicename__     → Icon filename (lowercase)
 */
import type {
	IHookFunctions,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { __serviceName__ApiRequest } from './GenericFunctions';

export class __ServiceName__Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '__ServiceName__ Trigger',
		name: '__serviceName__Trigger',
		icon: 'file:__servicename__.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when __ServiceName__ events occur',
		subtitle: '={{"__ServiceName__ Trigger"}}',
		defaults: {
			name: '__ServiceName__ Trigger',
		},
		credentials: [
			{
				name: '__serviceNameApi__',
				required: true,
			},
		],
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				default: 'itemCreated',
				options: [
					{
						name: 'Item Created',
						value: 'itemCreated',
						description: 'Triggered when a new item is created',
					},
					{
						name: 'Item Updated',
						value: 'itemUpdated',
						description: 'Triggered when an item is updated',
					},
					{
						name: 'Item Deleted',
						value: 'itemDeleted',
						description: 'Triggered when an item is deleted',
					},
				],
				description: 'The event to listen for',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Raw Body',
						name: 'includeRawBody',
						type: 'boolean',
						default: false,
						description: 'Whether to include the raw webhook body in the output',
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

				try {
					const existingWebhooks = (await __serviceName__ApiRequest.call(
						this,
						'GET',
						'/webhooks',
					)) as IDataObject[];

					const existing = existingWebhooks.find(
						(wh) => wh.url === webhookUrl,
					);

					if (existing) {
						webhookData.webhookId = existing.id;
						return true;
					}
				} catch {
					// If the check fails, assume it doesn't exist
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event', 0) as string;

				const body: IDataObject = {
					url: webhookUrl,
					events: [event],
				};

				const response = (await __serviceName__ApiRequest.call(
					this,
					'POST',
					'/webhooks',
					body,
				)) as IDataObject;

				webhookData.webhookId = response.id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookId = webhookData.webhookId as string;

				if (!webhookId) {
					return false;
				}

				try {
					await __serviceName__ApiRequest.call(
						this,
						'DELETE',
						`/webhooks/${webhookId}`,
					);
				} catch (error) {
					// If webhook was already deleted, that's fine
					if ((error as JsonObject).httpStatusCode !== 404) {
						throw error;
					}
				}

				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData();

		// Handle challenge/verification requests from the service
		// Many services send a challenge on initial registration
		if (req.query.challenge) {
			const res = this.getResponseObject();
			res.status(200).json({ challenge: req.query.challenge });
			return { noWebhookResponse: true };
		}

		// Process the webhook payload
		const events = Array.isArray(body.events) ? body.events : [body];

		return {
			workflowData: [
				events.map(
					(event: IDataObject) =>
						({
							json: event,
						}) as INodeExecutionData,
				),
			],
		};
	}
}
