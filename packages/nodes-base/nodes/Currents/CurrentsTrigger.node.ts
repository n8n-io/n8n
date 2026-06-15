import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	createWebhook,
	deleteWebhook,
	findWebhookByUrl,
	generateWebhookSecret,
	updateWebhook,
	verifyWebhook,
} from './CurrentsTriggerHelpers';
import { projectRLC } from './descriptions/common.descriptions';
import { listSearch } from './methods';

export class CurrentsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Currents Trigger',
		name: 'currentsTrigger',
		icon: 'file:currents.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Currents events occur',
		defaults: {
			name: 'Currents Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'currentsApi',
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
				...projectRLC,
			},
			{
				displayName:
					'Currents sends separate webhook events for each group in a run. If your run has multiple groups, you will receive separate events for each group.',
				name: 'noticeGroups',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Run Canceled',
						value: 'RUN_CANCELED',
						description: 'Triggered when a run is manually canceled',
					},
					{
						name: 'Run Finished',
						value: 'RUN_FINISH',
						description: 'Triggered when a run completes',
					},
					{
						name: 'Run Started',
						value: 'RUN_START',
						description: 'Triggered when a new run begins',
					},
					{
						name: 'Run Timeout',
						value: 'RUN_TIMEOUT',
						description: 'Triggered when a run exceeds the time limit',
					},
				],
				required: true,
				default: [],
				description: 'The events to listen to',
			},
		],
	};

	methods = {
		listSearch,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				const projectId = this.getNodeParameter('projectId', '', { extractValue: true }) as string;
				const events = this.getNodeParameter('events', []) as string[];

				const existingWebhook = await findWebhookByUrl.call(this, projectId, webhookUrl);

				if (existingWebhook) {
					webhookData.hookId = existingWebhook.hookId;

					// If secret is missing from static data, we need to recreate
					if (!webhookData.webhookSecret) {
						try {
							await deleteWebhook.call(this, existingWebhook.hookId);
						} catch (error) {
							this.logger.debug('Failed to delete orphaned webhook during checkExists', {
								hookId: existingWebhook.hookId,
								error,
							});
						}
						return false;
					}

					const currentEvents = existingWebhook.hookEvents ?? [];
					const eventsMatch =
						events.length === currentEvents.length &&
						events.every((e) => currentEvents.includes(e));

					if (!eventsMatch) {
						const headers = JSON.stringify({
							'x-webhook-secret': webhookData.webhookSecret,
						});
						await updateWebhook.call(this, existingWebhook.hookId, {
							hookEvents: events,
							headers,
						});
					}

					return true;
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');
				const projectId = this.getNodeParameter('projectId', '', { extractValue: true }) as string;
				const events = this.getNodeParameter('events', []) as string[];
				const workflow = this.getWorkflow();

				const webhookSecret = generateWebhookSecret();
				const label = `n8n workflow ${workflow.id ?? 'unknown'}`;
				const headers = JSON.stringify({
					'x-webhook-secret': webhookSecret,
				});

				const webhook = await createWebhook.call(this, projectId, {
					url: webhookUrl,
					hookEvents: events,
					headers,
					label,
				});

				webhookData.hookId = webhook.hookId;
				webhookData.webhookSecret = webhookSecret;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				let hookId = webhookData.hookId as string | undefined;

				// Fallback: lookup webhook by URL if hookId missing from static data
				if (!hookId) {
					const webhookUrl = this.getNodeWebhookUrl('default');
					if (webhookUrl) {
						try {
							const projectId = this.getNodeParameter('projectId', '', {
								extractValue: true,
							}) as string;
							if (projectId) {
								const existingWebhook = await findWebhookByUrl.call(this, projectId, webhookUrl);
								if (existingWebhook) {
									hookId = existingWebhook.hookId;
								}
							}
						} catch (error) {
							this.logger.debug('Failed to lookup webhook by URL during delete', {
								webhookUrl,
								error,
							});
						}
					}
				}

				if (hookId) {
					try {
						await deleteWebhook.call(this, hookId);
					} catch (error) {
						// Ignore 404 errors (webhook already deleted)
						const statusCode = (error as { httpStatusCode?: number }).httpStatusCode;
						if (statusCode !== 404) {
							throw error;
						}
					}
					delete webhookData.hookId;
					delete webhookData.webhookSecret;
				}

				return true;
			},
		},
	};

	// eslint-disable-next-line @typescript-eslint/require-await
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		if (!verifyWebhook.call(this)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData();
		const events = this.getNodeParameter('events', []) as string[];
		const eventType = typeof bodyData.event === 'string' ? bodyData.event : '';

		if (events.length > 0 && !events.includes(eventType)) {
			return {
				webhookResponse: 'OK',
			};
		}

		return {
			workflowData: [this.helpers.returnJsonArray([bodyData])],
		};
	}
}
