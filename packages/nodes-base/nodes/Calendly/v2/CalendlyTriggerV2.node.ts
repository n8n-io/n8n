import * as crypto from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { calendlyApiRequest, hasResponseStatus, resolveIdentity } from './GenericFunctions';

type CalendlyWebhookSubscription = {
	callback_url: string;
	events: string[];
	uri: string;
};

type CalendlyWebhookSubscriptionsResponse = {
	collection: CalendlyWebhookSubscription[];
};

type CalendlyCreateWebhookResponse = {
	resource?: {
		uri?: string;
		signing_key?: string;
	};
};

function isCalendlyWebhookSubscription(value: unknown): value is CalendlyWebhookSubscription {
	return (
		typeof value === 'object' &&
		value !== null &&
		'callback_url' in value &&
		typeof value.callback_url === 'string' &&
		'events' in value &&
		Array.isArray(value.events) &&
		value.events.every((event) => typeof event === 'string') &&
		'uri' in value &&
		typeof value.uri === 'string'
	);
}

function isCalendlyWebhookSubscriptionsResponse(
	value: unknown,
): value is CalendlyWebhookSubscriptionsResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		'collection' in value &&
		Array.isArray(value.collection) &&
		value.collection.every(isCalendlyWebhookSubscription)
	);
}

function isCalendlyCreateWebhookResponse(value: unknown): value is CalendlyCreateWebhookResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		(!('resource' in value) ||
			value.resource === undefined ||
			(typeof value.resource === 'object' &&
				value.resource !== null &&
				(!('uri' in value.resource) || typeof value.resource.uri === 'string')))
	);
}

function validateWebhookScope(this: IHookFunctions, scope: string) {
	if (scope !== 'user' && scope !== 'organization') {
		throw new NodeApiError(this.getNode(), {} as JsonObject, {
			message: `Unsupported scope: ${scope}. Calendly v2 only supports 'user' and 'organization' scopes.`,
		});
	}
}

function buildWebhookSubscriptionQuery(
	this: IHookFunctions,
	scope: string,
	organizationUri: string,
	userUri: string,
): IDataObject {
	if (scope === 'user') {
		return {
			scope: 'user',
			organization: organizationUri,
			user: userUri,
		};
	}

	if (scope === 'organization') {
		return {
			scope: 'organization',
			organization: organizationUri,
		};
	}

	throw new NodeApiError(this.getNode(), {} as JsonObject, {
		message: `Unsupported Calendly webhook scope '${scope}'.`,
	});
}

export class CalendlyTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
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
					displayName:
						'Organization-level webhooks require an Admin or Owner role in your Calendly organization. If registration fails with a 403 error, please check your permissions.',
					name: 'organizationAdminNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							scope: ['organization'],
						},
					},
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
	}

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const scope = this.getNodeParameter('scope', 0) as string;

				const { userUri, organizationUri } = await resolveIdentity.call(this);
				const qs = buildWebhookSubscriptionQuery.call(this, scope, organizationUri, userUri);

				const response = await calendlyApiRequest.call(
					this,
					'GET',
					'/webhook_subscriptions',
					{},
					qs,
				);
				if (!isCalendlyWebhookSubscriptionsResponse(response)) {
					throw new NodeApiError(this.getNode(), {} as JsonObject, {
						message: 'Malformed Calendly webhook subscriptions response.',
					});
				}
				const { collection } = response;

				for (const webhook of collection) {
					if (
						webhook.callback_url === webhookUrl &&
						events.length === webhook.events.length &&
						events.every((event: string) => webhook.events.includes(event))
					) {
						webhookData.webhookId = webhook.uri;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				try {
					const webhookUrl = this.getNodeWebhookUrl('default');
					const webhookData = this.getWorkflowStaticData('node');
					const events = this.getNodeParameter('events', []) as string[];
					const scope = this.getNodeParameter('scope', 'user') as string;

					const { userUri, organizationUri } = await resolveIdentity.call(this);
					validateWebhookScope.call(this, scope);

					// Signing key is optional during creation since Calendly generates one per subscription.
					// The generated key will be stored and used for verification.

					if (scope === 'organization') {
						try {
							await calendlyApiRequest.call(
								this,
								'GET',
								'/organization_memberships',
								{},
								{
									organization: organizationUri,
									count: 1,
								},
							);
						} catch (error) {
							if (hasResponseStatus(error, 403)) {
								throw new NodeApiError(this.getNode(), error as JsonObject, {
									message:
										'Cannot create organization-scoped webhook. Your token lacks Admin privileges. Please change the scope to "User" instead.',
								});
							}
							throw error;
						}
					}

					const body: IDataObject = {
						url: webhookUrl,
						events,
						organization: organizationUri,
						scope,
					};

					if (scope === 'user') {
						body.user = userUri;
					}

					const responseData = await calendlyApiRequest.call(
						this,
						'POST',
						'/webhook_subscriptions',
						body,
					);
					if (!isCalendlyCreateWebhookResponse(responseData)) {
						throw new NodeApiError(this.getNode(), {} as JsonObject, {
							message: 'Malformed Calendly webhook creation response.',
						});
					}

					if (responseData.resource?.uri) {
						webhookData.webhookId = responseData.resource.uri;
						if (responseData.resource.signing_key) {
							webhookData.webhookSigningKey = responseData.resource.signing_key;
						}
						return true;
					}

					return false;
				} catch (error) {
					const isForbidden = hasResponseStatus(error, 403);

					if (isForbidden) {
						throw new NodeApiError(this.getNode(), error as JsonObject, {
							message: 'Calendly credentials need the "user:read" scope to register webhooks.',
						});
					}
					throw error;
				}
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (!webhookData.webhookId) {
					return false;
				}

				const webhookUri = webhookData.webhookId as string;
				let endpoint: string;
				try {
					endpoint = new URL(webhookUri).pathname;
				} catch (error) {
					// Fallback for legacy IDs if they somehow persist in V2 static data
					endpoint = webhookUri.startsWith('/')
						? webhookUri
						: `/webhook_subscriptions/${webhookUri}`;
				}

				try {
					await calendlyApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					if (!hasResponseStatus(error, 404)) {
						throw error;
					}
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSigningKey;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const headerData = this.getHeaderData() as IDataObject;

		const calendlySignature = headerData['calendly-webhook-signature'] as string | undefined;

		const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
		const credentialName = authenticationMethod === 'oAuth2' ? 'calendlyOAuth2Api' : 'calendlyApi';
		const credentials = await this.getCredentials(credentialName);
		const webhookData = this.getWorkflowStaticData('node');
		const webhookSigningKey =
			(webhookData.webhookSigningKey as string | undefined) ??
			(credentials?.webhookSigningKey as string | undefined);

		if (webhookSigningKey) {
			if (!calendlySignature) {
				throw new NodeApiError(this.getNode(), {} as JsonObject, {
					message: 'Missing Calendly-Webhook-Signature header',
					httpCode: '401',
				});
			}

			const signatureParts = calendlySignature.split(',');
			const tPart = signatureParts.find((part) => part.startsWith('t='));
			const v1Part = signatureParts.find((part) => part.startsWith('v1='));

			const t = tPart?.slice(2);
			const v1 = v1Part?.slice(3);

			if (!t || !v1) {
				throw new NodeApiError(this.getNode(), {} as JsonObject, {
					message: 'Malformed Calendly-Webhook-Signature header',
					httpCode: '401',
				});
			}

			const eventTimestampMs = Number(t) * 1000;
			const fiveMinutesMs = 5 * 60 * 1000;
			const timeSkewMs = Math.abs(Date.now() - eventTimestampMs);

			if (Number.isNaN(eventTimestampMs) || timeSkewMs > fiveMinutesMs) {
				throw new NodeApiError(this.getNode(), {} as JsonObject, {
					message:
						'Webhook timestamp is outside of the 5-minute window \u2014 possible replay attack',
					httpCode: '400',
				});
			}

			const req = this.getRequestObject() as { rawBody?: Buffer | string };
			if (!req.rawBody) {
				throw new NodeApiError(this.getNode(), {} as JsonObject, {
					message: 'Missing raw request body for Calendly webhook signature verification.',
					httpCode: '401',
				});
			}

			const rawBody = typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString('utf8');
			const payload = `${t}.${rawBody}`;

			const expectedSignatureBuffer = crypto
				.createHmac('sha256', webhookSigningKey)
				.update(payload)
				.digest();
			const v1Buffer = Buffer.from(v1, 'hex');

			if (
				expectedSignatureBuffer.length !== v1Buffer.length ||
				!crypto.timingSafeEqual(expectedSignatureBuffer, v1Buffer)
			) {
				throw new NodeApiError(this.getNode(), {} as JsonObject, {
					message: 'Calendly Webhook Signature Mismatch - Please check your Signing Key.',
					httpCode: '401',
				});
			}
		}

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
