import { randomBytes } from 'crypto';

import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { verifySignature } from './CalendlyTriggerHelpers';
import { calendlyApiRequest } from './GenericFunctions';

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringField(data: IDataObject | undefined, key: string): string | undefined {
	const value = data?.[key];
	return typeof value === 'string' ? value : undefined;
}

function getStringArrayField(data: IDataObject, key: string): string[] | undefined {
	const value = data[key];
	if (!Array.isArray(value)) return undefined;

	const strings: string[] = [];
	for (const item of value) {
		if (typeof item !== 'string') return undefined;
		strings.push(item);
	}

	return strings;
}

function isValidCalendlyWebhookUrl(webhookUrl: string | undefined): webhookUrl is string {
	return webhookUrl?.startsWith('https://') === true;
}

export class CalendlyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calendly Trigger',
		name: 'calendlyTrigger',
		icon: 'file:calendly.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Calendly events occur',
		defaults: {
			name: 'Calendly Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'calendlyApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				name: 'calendlyOAuth2Api',
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
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Personal Access Token',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				default: 'user',
				required: true,
				options: [
					{
						name: 'Organization',
						value: 'organization',
						description: 'Triggers the webhook for all subscribed events within the organization',
					},
					{
						name: 'User',
						value: 'user',
						description:
							'Triggers the webhook for subscribed events that belong to the current user',
					},
				],
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Event Created',
						value: 'invitee.created',
						description: 'Receive notifications when a new Calendly event is created',
					},
					{
						name: 'Event Canceled',
						value: 'invitee.canceled',
						description: 'Receive notifications when a Calendly event is canceled',
					},
				],
				default: [],
				required: true,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];

				const scope = this.getNodeParameter('scope', 0) as string;
				const userResponse = await calendlyApiRequest.call(this, 'GET', '/users/me');
				const user = isDataObject(userResponse.resource) ? userResponse.resource : undefined;
				const organization = getStringField(user, 'current_organization');
				const userUri = getStringField(user, 'uri');

				if (organization === undefined || (scope === 'user' && userUri === undefined)) return false;

				const qs: IDataObject = {};

				if (scope === 'user') {
					qs.scope = 'user';
					qs.organization = organization;
					qs.user = userUri;
				}

				if (scope === 'organization') {
					qs.scope = 'organization';
					qs.organization = organization;
				}

				const endpoint = '/webhook_subscriptions';
				const subscriptionsResponse = await calendlyApiRequest.call(this, 'GET', endpoint, {}, qs);
				const collection = Array.isArray(subscriptionsResponse.collection)
					? subscriptionsResponse.collection
					: [];

				for (const webhook of collection) {
					if (!isDataObject(webhook)) continue;

					const callbackUrl = getStringField(webhook, 'callback_url');
					const webhookEvents = getStringArrayField(webhook, 'events');
					const webhookUri = getStringField(webhook, 'uri');

					if (
						callbackUrl === webhookUrl &&
						webhookUri !== undefined &&
						webhookEvents !== undefined &&
						events.length === webhookEvents.length &&
						events.every((event) => webhookEvents.includes(event))
					) {
						webhookData.webhookURI = webhookUri;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];

				if (!isValidCalendlyWebhookUrl(webhookUrl)) {
					throw new NodeOperationError(
						this.getNode(),
						'Calendly requires a public HTTPS webhook URL',
						{
							description:
								'Set the n8n webhook URL to a public HTTPS address, or use a tunnel while testing locally.',
						},
					);
				}

				const scope = this.getNodeParameter('scope', 0) as string;
				const userResponse = await calendlyApiRequest.call(this, 'GET', '/users/me');
				const user = isDataObject(userResponse.resource) ? userResponse.resource : undefined;
				const organization = getStringField(user, 'current_organization');
				const userUri = getStringField(user, 'uri');

				if (organization === undefined || (scope === 'user' && userUri === undefined)) return false;

				const webhookSecret = randomBytes(32).toString('hex');
				const body: IDataObject = {
					url: webhookUrl,
					events,
					organization,
					scope,
					signing_key: webhookSecret,
				};

				if (scope === 'user') {
					body.user = userUri;
				}

				const endpoint = '/webhook_subscriptions';
				const responseData = await calendlyApiRequest.call(this, 'POST', endpoint, body);
				const subscription = isDataObject(responseData.resource)
					? responseData.resource
					: undefined;
				const subscriptionUri = getStringField(subscription, 'uri');

				if (subscriptionUri === undefined) return false;

				webhookData.webhookURI = subscriptionUri;
				webhookData.webhookSecret = webhookSecret;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const { webhookURI } = webhookData;

				if (typeof webhookURI === 'string') {
					try {
						await calendlyApiRequest.call(this, 'DELETE', '', {}, {}, webhookURI);
					} catch (error) {
						return false;
					}

					delete webhookData.webhookURI;
					delete webhookData.webhookSecret;
				}
				delete webhookData.webhookId;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		if (!verifySignature.call(this)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return {
				noWebhookResponse: true,
			};
		}

		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
