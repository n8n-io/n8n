import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { calendlyApiRequest, getAuthenticationType } from './GenericFunctions';

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
						name: 'API Key or Personal Access Token',
						value: 'apiKey',
					},
				],
				default: 'apiKey',
			},
			{
				displayName:
					'Action required: Calendly will discontinue API Key authentication on May 31, 2025. Update node to use OAuth2 authentication now to ensure your workflows continue to work.',
				name: 'deprecationNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						authentication: ['apiKey'],
					},
				},
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				default: 'user',
				required: true,
				hint: 'Ignored if you are using an API Key',
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

				const authenticationType = await getAuthenticationType.call(this);

				// remove condition once API Keys are deprecated
				if (authenticationType === 'apiKey') {
					const endpoint = '/hooks';
					const { data } = await calendlyApiRequest.call(this, 'GET', endpoint, {});

					for (const webhook of data) {
						if (webhook.attributes.url === webhookUrl) {
							for (const event of events) {
								if (!webhook.attributes.events.includes(event)) {
									return false;
								}
							}
						}
						// Set webhook-id to be sure that it can be deleted
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}

				if (authenticationType === 'accessToken') {
					const scope = this.getNodeParameter('scope', 0) as string;
					const { resource } = await calendlyApiRequest.call(this, 'GET', '/users/me');

					const qs: IDataObject = {};

					if (scope === 'user') {
						qs.scope = 'user';
						qs.organization = resource.current_organization;
						qs.user = resource.uri;
					}

					if (scope === 'organization') {
						qs.scope = 'organization';
						qs.organization = resource.current_organization;
					}

					const endpoint = '/webhook_subscriptions';
					const { collection } = await calendlyApiRequest.call(this, 'GET', endpoint, {}, qs);

					for (const webhook of collection) {
						if (
							webhook.callback_url === webhookUrl &&
							events.length === webhook.events.length &&
							events.every((event: string) => webhook.events.includes(event))
						) {
							webhookData.webhookURI = webhook.uri;
							return true;
						}
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];

				const authenticationType = await getAuthenticationType.call(this);

				// remove condition once API Keys are deprecated
				if (authenticationType === 'apiKey') {
					const endpoint = '/hooks';

					const body = {
						url: webhookUrl,
						events,
					};

					const responseData = await calendlyApiRequest.call(this, 'POST', endpoint, body);

					if (responseData.id === undefined) {
						// Required data is missing so was not successful
						return false;
					}

					webhookData.webhookId = responseData.id as string;
				}

				if (authenticationType === 'accessToken') {
					const scope = this.getNodeParameter('scope', 0) as string;
					const { resource } = await calendlyApiRequest.call(this, 'GET', '/users/me');

					const body: IDataObject = {
						url: webhookUrl,
						events,
						organization: resource.current_organization,
						scope,
					};

					if (scope === 'user') {
						body.user = resource.uri;
					}

					const endpoint = '/webhook_subscriptions';
					const responseData = await calendlyApiRequest.call(this, 'POST', endpoint, body);

					if (responseData?.resource === undefined || responseData?.resource?.uri === undefined) {
						return false;
					}

					webhookData.webhookURI = responseData.resource.uri;
				}

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const authenticationType = await getAuthenticationType.call(this);

				// remove condition once API Keys are deprecated
				if (authenticationType === 'apiKey') {
					if (webhookData.webhookId !== undefined) {
						const endpoint = `/hooks/${webhookData.webhookId}`;

						try {
							await calendlyApiRequest.call(this, 'DELETE', endpoint);
						} catch (error) {
							return false;
						}

						// Remove from the static workflow data so that it is clear
						// that no webhooks are registered anymore
						delete webhookData.webhookId;
					}
				}

				if (authenticationType === 'accessToken') {
					if (webhookData.webhookURI !== undefined) {
						try {
							await calendlyApiRequest.call(
								this,
								'DELETE',
								'',
								{},
								{},
								webhookData.webhookURI as string,
							);
						} catch (error) {
							return false;
						}

						delete webhookData.webhookURI;
					}
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
