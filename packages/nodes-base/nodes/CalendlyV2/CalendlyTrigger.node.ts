import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
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
		name: 'calendlyV2Trigger',
		icon: 'file:calendly.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Calendly events occur.',
		defaults: {
			name: 'Calendly Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'calendlyV2Api',
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
			{
				displayName: 'Scope Name or ID',
				name: 'scope',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getScopeOptions',
				},
				required: true,
			},
		],

	};

	methods = {
		loadOptions: {
			async getScopeOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const organizationScopeRoles = ['owner', 'admin'];
				const resultData: INodePropertyOptions[] = [{
					name: 'User',
					value: 'user',
					description: 'Receive notifications for your scheduled / canceled events',
				}];
				const { resource } = await calendlyApiRequest.call(this, 'GET', '/users/me', {});

				const { collection: [membership] } = await calendlyApiRequest.call(this, 'GET', '/organization_memberships', {}, {
					user: resource.uri,
				});

				if (organizationScopeRoles.includes(membership.role)) {
					resultData.push({
						name: 'Organization',
						value: 'organization',
						description: 'Receive notifications for all scheduled / canceled events in your organization',
					});
				}

				return resultData;
			},
		},
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string;
				const scope = this.getNodeParameter('scope') as string;

				const { resource } = await calendlyApiRequest.call(this, 'GET', '/users/me', {});

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const endpoint = '/webhook_subscriptions';
				const query = {
					scope,
					organization: resource.current_organization,
					count: 100,
					user: resource.uri,
				};
				
				if (scope !== 'user') {
					delete query.user;
				}

				const { collection } = await calendlyApiRequest.call(this, 'GET', endpoint, {}, query);

				for (const webhook of collection) {
					if (webhook.callback_url === webhookUrl && webhook.state === 'active') {
						for (const event of events) {
							if (!webhook.events.includes(event)) {
								return false;
							}
						}
					}
					// Set webhook-id to be sure that it can be deleted
					webhookData.webhookId = webhook.uri.slice(webhook.uri.lastIndexOf('/') + 1);
					return true;
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string;
				const scope = this.getNodeParameter('scope') as string;

				const { resource: { uri, current_organization} } = await calendlyApiRequest.call(this, 'GET', '/users/me', {});

				const endpoint = '/webhook_subscriptions';

				const body = {
					url: webhookUrl,
					organization: current_organization,
					events,
					scope,
					user: uri,
				};

				if (scope !== 'user') {
					delete body.user;
				}

				const { resource } = await calendlyApiRequest.call(this, 'POST', endpoint, body);

				if (resource === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = resource.uri.slice(resource.uri.lastIndexOf('/') + 1) as string;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {

					const endpoint = `/webhook_subscriptions/${webhookData.webhookId}`;

					try {
						await calendlyApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					// Remove from the static workflow data so that it is clear
					// that no webhooks are registered anymore
					delete webhookData.webhookId;
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