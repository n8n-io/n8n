import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { verifyWebhook } from './CurrentsTriggerHelpers';

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
				displayName:
					'Configure this webhook URL in your Currents Dashboard under Project Settings > Integrations > HTTP Webhooks',
				name: 'notice',
				type: 'notice',
				default: '',
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Webhook Secret',
						name: 'webhookSecret',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						description:
							'Optional secret to validate webhook requests. Configure the same secret in Currents Dashboard as a custom header.',
					},
					{
						displayName: 'Header Name for Validation',
						name: 'validationHeaderName',
						type: 'string',
						default: 'x-webhook-secret',
						description: 'The HTTP header name where the webhook secret is sent',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Verify the webhook request
		if (!verifyWebhook.call(this)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData() as IDataObject;
		const events = this.getNodeParameter('events', []) as string[];

		// Filter by selected events
		const eventType = bodyData.event as string;
		if (events.length > 0 && !events.includes(eventType)) {
			// Event not in selected list, acknowledge but don't trigger workflow
			return {
				webhookResponse: 'OK',
			};
		}

		// Return the full webhook payload
		return {
			workflowData: [this.helpers.returnJsonArray([bodyData])],
		};
	}
}
