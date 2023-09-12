import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

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
		outputs: ['main'],
		credentials: [
			{
				name: 'calendlyApi',
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
						name: 'invitee.created',
						value: 'invitee.created',
						description: 'Receive notifications when a new Calendly event is created',
					},
					{
						name: 'invitee.canceled',
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
				const events = this.getNodeParameter('events') as string;
				const { apiKey } = (await this.getCredentials('calendlyApi')) as { apiKey: string };

				const authenticationType = getAuthenticationType(apiKey);

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
						if (webhook.callback_url === webhookUrl) {
							for (const event of events) {
								if (!webhook.events.includes(event)) {
									return false;
								}
							}
						}

						webhookData.webhookURI = webhook.uri;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string;
				const { apiKey } = (await this.getCredentials('calendlyApi')) as { apiKey: string };

				const authenticationType = getAuthenticationType(apiKey);

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
				const { apiKey } = (await this.getCredentials('calendlyApi')) as { apiKey: string };
				const authenticationType = getAuthenticationType(apiKey);

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
