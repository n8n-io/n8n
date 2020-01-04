import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	eventbriteApiRequestAllItems,
	eventbriteApiRequest,
} from './GenericFunctions';

export class EventbriteTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Eventbrite Trigger',
		name: 'eventbrite',
		icon: 'file:eventbrite.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle Eventbrite events via webhooks',
		defaults: {
			name: 'Eventbrite Trigger',
			color: '#559922',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'eventbriteApi',
				required: true,
			}
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
				displayName: 'Organization',
				name: 'organization',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getOrganizations'
				},
				default: [],
				description: '',
			},
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getEvents'
				},
				default: [],
				description: '',
			},
			{
				displayName: 'Actions',
				name: 'actions',
				type: 'multiOptions',
				options: [
					{
						name: 'attendee.updated',
						value: 'attendee.updated'
					},
					{
						name: 'attendee.checked_in',
						value: 'attendee.checked_in'
					},
					{
						name: 'attendee.checked_out',
						value: 'attendee.checked_out'
					},
					{
						name: 'event.created',
						value: 'event.created'
					},
					{
						name: 'event.published',
						value: 'event.published'
					},
					{
						name: 'event.unpublished',
						value: 'event.unpublished'
					},
					{
						name: 'event.updated',
						value: 'event.updated'
					},
					{
						name: 'order.placed',
						value: 'order.placed'
					},
					{
						name: 'order.refunded',
						value: 'order.refunded'
					},
					{
						name: 'order.updated',
						value: 'order.updated'
					},
					{
						name: 'organizer.updated',
						value: 'organizer.updated'
					},
					{
						name: 'ticket_class.created',
						value: 'ticket_class.created'
					},
					{
						name: 'ticket_class.deleted',
						value: 'ticket_class.deleted'
					},
					{
						name: 'ticket_class.updated',
						value: 'ticket_class.updated'
					},
					{
						name: 'venue.updated',
						value: 'venue.updated'
					},
				],
				required: true,
				default: [],
				description: '',
			},
		],

	};

	methods = {
		loadOptions: {
			// Get all the available organizations to display them to user so that he can
			// select them easily
			async getOrganizations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let organizations;
				organizations = await eventbriteApiRequestAllItems.call(this, 'organizations', 'GET', '/users/me/organizations');
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
				const returnData: INodePropertyOptions[] = [];
				const organization = this.getCurrentNodeParameter('organization');
				let events;
				events = await eventbriteApiRequestAllItems.call(this, 'events', 'GET', `/organizations/${organization}/events`);
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
				let webhooks;
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const endpoint = `/webhooks/${webhookData.webhookId}/`;
				try {
					webhooks = await eventbriteApiRequest.call(this, 'GET', endpoint);
				} catch (e) {
					return false;
				}
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				let body, responseData;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const event = this.getNodeParameter('event') as string;
				const actions = this.getNodeParameter('actions') as string[];
				const endpoint = `/webhooks/`;
				// @ts-ignore
				body = {
					endpoint_url: webhookUrl,
					actions: actions.join(','),
					event_id: event,
				};
				try {
					responseData = await eventbriteApiRequest.call(this, 'POST', endpoint, body);
				} catch(error) {
					console.log(error)
					return false;
				}
				// @ts-ignore
				webhookData.webhookId = responseData.id;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				let responseData;
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/webhooks/${webhookData.webhookId}/`;
				try {
					responseData = await eventbriteApiRequest.call(this, 'DELETE', endpoint);
				} catch(error) {
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
		return {
			workflowData: [
				this.helpers.returnJsonArray(req.body)
			],
		};
	}
}
