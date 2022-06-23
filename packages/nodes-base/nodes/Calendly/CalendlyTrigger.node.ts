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
	calendlyApiRequest,
} from './GenericFunctions';

export class CalendlyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calendly Trigger',
		name: 'calendlyTrigger',
		icon: 'file:calendly.svg',
		group: ['trigger'],
		version: [1, 2],
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
				displayOptions: {
					show: {
						'apiVersion': [
							'version1',
						],
					},
				},
			},
			{
				name: 'calendlyAccessTokenApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
						'apiVersion': [
							'version2',
						],
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
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [
							1,
						],
					},
				},
				options: [
					{
						name: 'Version 1',
						value: 'version1',
					},
					{
						name: 'Version 2',
						value: 'version2',
					},
				],
				default: 'version2',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [
							2,
						],
					},
				},
				options: [
					{
						name: 'Version 1',
						value: 'version1',
					},
					{
						name: 'Version 2',
						value: 'version2',
					},
				],
				default: 'version2',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
				],
				default: 'accessToken',
				displayOptions: {
					show: {
						'apiVersion': [
							'version2',
						],
					},
				},
			},
			{
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				default: 'user',
				required: true,
				displayOptions: {
					show: {
						'apiVersion': [
							'version2',
						],
					},
				},
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Organisation',
						value: 'organisation',
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

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				if (apiVersion === 'version1') {
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

				if (apiVersion === 'version2') {
					const scope = this.getNodeParameter('scope', 0) as string;
					const { resource } = await calendlyApiRequest.call(this, 'GET', '/users/me');

					const qs: IDataObject = {};

					if (scope === 'user') {
						qs.scope = 'user';
						qs.organization = resource.current_organization;
						qs.user = resource.uri;
					}

					if (scope === 'organisation') {
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
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;


				if (apiVersion === 'version1') {
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

				if (apiVersion === 'version2') {
					const scope = this.getNodeParameter('scope', 0) as string;
					const { resource } = await calendlyApiRequest.call(this, 'GET', '/users/me');

					const body: IDataObject = {
						url: webhookUrl,
						events,
						organization: resource.current_organization,
						scope,
					};

					if ( scope === 'user') {
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
				const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

				if (apiVersion === 'version1') {
					if (webhookData.webhookId !== undefined) {

						const endpoint = `/hooks/${webhookData.webhookId}`;

						try {
							await calendlyApiRequest.call(this, 'DELETE', endpoint);
						} catch (error) {
							return false;
						}

						// Remove from the static workflow data so that it is clear
						// that no webhooks are registred anymore
						delete webhookData.webhookId;
					}
				}

				if (apiVersion === 'version2') {
					if (webhookData.webhookURI !== undefined) {
						try {
							await calendlyApiRequest.call(this, 'DELETE', '', {}, {},  webhookData.webhookURI as string);
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
			workflowData: [
				this.helpers.returnJsonArray(bodyData),
			],
		};
	}
}
