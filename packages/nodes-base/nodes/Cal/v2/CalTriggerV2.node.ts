import { isRecord } from '@n8n/utils/is-record';
import { randomBytes } from 'crypto';
import {
	type IDataObject,
	type IHookFunctions,
	type IWebhookFunctions,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	type IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';

import { verifySignature } from '../CalTriggerHelpers';
import { calApiRequestV2, sortOptionParameters } from '../GenericFunctions';

const WEBHOOK_PAGE_SIZE = 250;
const MAX_WEBHOOK_PAGES = 10;

interface CalApiResponse<T> {
	data: T;
}

interface CalEventType {
	id: number;
	title: string;
}

interface CalWebhook {
	id: number;
	subscriberUrl: string;
	triggers: string[];
	active: boolean;
	payloadTemplate?: string | null;
	secret?: string;
}

function getWebhookEndpoint(eventTypeId: IDataObject[string]): string {
	if (typeof eventTypeId === 'number' || (typeof eventTypeId === 'string' && eventTypeId)) {
		return `/event-types/${encodeURIComponent(eventTypeId)}/webhooks`;
	}

	return '/webhooks';
}

export class CalTriggerV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 3,
			subtitle: '=Events: {{$parameter["events"].join(", ")}}',
			defaults: {
				name: 'Cal.com Trigger',
			},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'calApi',
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
							name: 'Booking Cancelled',
							value: 'BOOKING_CANCELLED',
							description: 'Receive notifications when a Cal event is canceled',
						},
						{
							name: 'Booking Created',
							value: 'BOOKING_CREATED',
							description: 'Receive notifications when a new Cal event is created',
						},
						{
							name: 'Booking Rescheduled',
							value: 'BOOKING_RESCHEDULED',
							description: 'Receive notifications when a Cal event is rescheduled',
						},
						{
							name: 'Meeting Ended',
							value: 'MEETING_ENDED',
							description: 'Receive notifications when a Cal event or meeting has ended',
						},
					],
					default: [],
					required: true,
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add Field',
					default: {},
					options: [
						{
							displayName: 'EventType Name or ID',
							name: 'eventTypeId',
							type: 'options',
							typeOptions: {
								loadOptionsMethod: 'getEventTypes',
							},
							description:
								'The EventType to monitor. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
							default: '',
						},
						{
							displayName: 'Payload Template',
							name: 'payloadTemplate',
							type: 'string',
							description: 'Template to customize the webhook payload',
							default: '',
							typeOptions: {
								rows: 4,
							},
						},
					],
				},
			],
		};
	}

	methods = {
		loadOptions: {
			async getEventTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await (calApiRequestV2<CalApiResponse<CalEventType[]>>).call(
					this,
					'GET',
					'/event-types',
					{},
					{},
					{ headers: { 'cal-api-version': '2024-06-14' } },
				);
				return sortOptionParameters(
					response.data.map(({ id, title }) => ({ name: title, value: id })),
				);
			},
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const events = this.getNodeParameter('events') as string[];
				const options = this.getNodeParameter('options') as IDataObject;
				const eventTypeId = options.eventTypeId;
				const endpoint = getWebhookEndpoint(eventTypeId);
				const payloadTemplate =
					typeof options.payloadTemplate === 'string' ? options.payloadTemplate : '';

				for (let page = 0; page < MAX_WEBHOOK_PAGES; page++) {
					const skip = page * WEBHOOK_PAGE_SIZE;
					const response = await (calApiRequestV2<CalApiResponse<CalWebhook[]>>).call(
						this,
						'GET',
						endpoint,
						{},
						{ take: WEBHOOK_PAGE_SIZE, skip },
					);

					for (const webhook of response.data) {
						if (
							webhook.subscriberUrl === webhookUrl &&
							webhook.active &&
							webhook.triggers.length === events.length &&
							events.every((event) => webhook.triggers.includes(event)) &&
							(webhook.payloadTemplate ?? '') === payloadTemplate
						) {
							webhookData.webhookId = webhook.id;
							if (webhook.secret) {
								webhookData.webhookSecret = webhook.secret;
							} else {
								delete webhookData.webhookSecret;
							}
							if (eventTypeId !== undefined && eventTypeId !== '') {
								webhookData.webhookEventTypeId = eventTypeId;
							} else {
								delete webhookData.webhookEventTypeId;
							}

							return true;
						}
					}

					if (response.data.length < WEBHOOK_PAGE_SIZE) return false;
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriberUrl = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const options = this.getNodeParameter('options') as IDataObject;
				const eventTypeId = options.eventTypeId;
				const endpoint = getWebhookEndpoint(eventTypeId);
				const webhookSecret = randomBytes(32).toString('hex');
				const body: IDataObject = {
					subscriberUrl,
					triggers: events,
					active: true,
					secret: webhookSecret,
				};

				if (typeof options.payloadTemplate === 'string' && options.payloadTemplate) {
					body.payloadTemplate = options.payloadTemplate;
				}

				const response = await (calApiRequestV2<CalApiResponse<CalWebhook>>).call(
					this,
					'POST',
					endpoint,
					body,
				);
				if (response.data?.id === undefined) return false;

				webhookData.webhookId = response.data.id;
				webhookData.webhookSecret = webhookSecret;
				if (eventTypeId !== undefined && eventTypeId !== '') {
					webhookData.webhookEventTypeId = eventTypeId;
				} else {
					delete webhookData.webhookEventTypeId;
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) return true;

				const endpoint = `${getWebhookEndpoint(webhookData.webhookEventTypeId)}/${webhookData.webhookId}`;
				try {
					await calApiRequestV2.call(this, 'DELETE', endpoint);
				} catch {
					return false;
				}

				delete webhookData.webhookId;
				delete webhookData.webhookSecret;
				delete webhookData.webhookEventTypeId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		if (!verifySignature.call(this)) {
			const res = this.getResponseObject();
			res.status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}

		const body = this.getRequestObject().body as IDataObject;
		const payload = body.payload;
		const output = isRecord(payload)
			? {
					triggerEvent: body.triggerEvent,
					createdAt: body.createdAt,
					...payload,
				}
			: body;

		return {
			workflowData: [this.helpers.returnJsonArray(output)],
		};
	}
}
