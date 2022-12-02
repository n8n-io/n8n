import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
} from 'n8n-workflow';

import { eventbriteApiRequest, eventbriteApiRequestAllItems } from './GenericFunctions';

export class EventbriteTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Eventbrite Trigger',
		name: 'eventbriteTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:eventbrite.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Eventbrite events via webhooks',
		subtitle: '={{$parameter["event"]}}',
		defaults: {
			name: 'Eventbrite Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'eventbriteApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['privateKey'],
					},
				},
			},
			{
				name: 'eventbriteOAuth2Api',
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
						name: 'Private Key',
						value: 'privateKey',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'privateKey',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'organization',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getOrganizations',
				},
				default: '',
				description:
					'The Eventbrite Organization to work on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Event Name or ID',
				name: 'event',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['organization'],
					loadOptionsMethod: 'getEvents',
				},
				default: '',
				description:
					'Limit the triggers to this event. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Actions',
				name: 'actions',
				type: 'multiOptions',
				options: [
					{
						name: 'attendee.checked_in',
						value: 'attendee.checked_in',
					},
					{
						name: 'attendee.checked_out',
						value: 'attendee.checked_out',
					},
					{
						name: 'attendee.updated',
						value: 'attendee.updated',
					},
					{
						name: 'event.created',
						value: 'event.created',
					},
					{
						name: 'event.published',
						value: 'event.published',
					},
					{
						name: 'event.unpublished',
						value: 'event.unpublished',
					},
					{
						name: 'event.updated',
						value: 'event.updated',
					},
					{
						name: 'order.placed',
						value: 'order.placed',
					},
					{
						name: 'order.refunded',
						value: 'order.refunded',
					},
					{
						name: 'order.updated',
						value: 'order.updated',
					},
					{
						name: 'organizer.updated',
						value: 'organizer.updated',
					},
					{
						name: 'ticket_class.created',
						value: 'ticket_class.created',
					},
					{
						name: 'ticket_class.deleted',
						value: 'ticket_class.deleted',
					},
					{
						name: 'ticket_class.updated',
						value: 'ticket_class.updated',
					},
					{
						name: 'venue.updated',
						value: 'venue.updated',
					},
				],
				required: true,
				default: [],
				description: 'One or more action to subscribe to',
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default does the webhook-data only contain the URL to receive the object data manually. If this option gets activated, it will resolve the data automatically.',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available organizations to display them to user so that he can
			// select them easily
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const organizations = await eventbriteApiRequestAllItems.call(
					this,
					'organizations',
					'GET',
					'/users/me/organizations',
				);
				for (const organization of organizations) {
					const organizationName = organization.name;
					const organizationId = organization.id;
					returnData.push({
						name: organizationName,
						value: organizationId,
					});
				}
				return returnData;
			},
			// Get all the available events to display them to user so that he can
			// select them easily
			async getEvents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [{ name: 'All', value: 'all' }];
				const organization = this.getCurrentNodeParameter('organization');
				const events = await eventbriteApiRequestAllItems.call(
					this,
					'events',
					'GET',
					`/organizations/${organization}/events`,
				);
				for (const event of events) {
					const eventName = event.name.text;
					const eventId = event.id;
					returnData.push({
						name: eventName,
						value: eventId,
					});
				}
				return returnData;
			},
		},
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const organisation = this.getNodeParameter('organization') as string;
				const actions = this.getNodeParameter('actions') as string[];

				const endpoint = `/organizations/${organisation}/webhooks/`;

				const { webhooks } = await eventbriteApiRequest.call(this, 'GET', endpoint);

				const check = (currentActions: string[], webhookActions: string[]) => {
					for (const currentAction of currentActions) {
						if (!webhookActions.includes(currentAction)) {
							return false;
						}
					}
					return true;
				};

				for (const webhook of webhooks) {
					if (webhook.endpoint_url === webhookUrl && check(actions, webhook.actions)) {
						webhookData.webhookId = webhook.id;
						return true;
					}
				}

				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const organisation = this.getNodeParameter('organization') as string;
				const event = this.getNodeParameter('event') as string;
				const actions = this.getNodeParameter('actions') as string[];
				const endpoint = `/organizations/${organisation}/webhooks/`;
				const body: IDataObject = {
					endpoint_url: webhookUrl,
					actions: actions.join(','),
					event_id: event,
				};
				if (event === 'all' || event === '') {
					delete body.event_id;
				}
				const responseData = await eventbriteApiRequest.call(this, 'POST', endpoint, body);
				webhookData.webhookId = responseData.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let responseData;
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhooks/${webhookData.webhookId}/`;
				try {
					responseData = await eventbriteApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}
				if (!responseData.success) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();

		if (req.body.api_url === undefined) {
			throw new NodeApiError(this.getNode(), req.body, {
				message: 'The received data does not contain required "api_url" property!',
			});
		}

		const resolveData = this.getNodeParameter('resolveData', false) as boolean;

		if (!resolveData) {
			// Return the data as it got received
			return {
				workflowData: [this.helpers.returnJsonArray(req.body)],
			};
		}

		if (req.body.api_url.includes('api-endpoint-to-fetch-object-details')) {
			return {
				workflowData: [
					this.helpers.returnJsonArray({
						placeholder:
							'Test received. To display actual data of object get the webhook triggered by performing the action which triggers it.',
					}),
				],
			};
		}

		const responseData = await eventbriteApiRequest.call(
			this,
			'GET',
			'',
			{},
			undefined,
			req.body.api_url,
		);

		return {
			workflowData: [this.helpers.returnJsonArray(responseData)],
		};
	}
}
