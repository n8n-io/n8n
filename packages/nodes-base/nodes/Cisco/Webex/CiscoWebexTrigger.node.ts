import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	getAutomaticSecret,
	getEvents,
	mapResource,
	webexApiRequest,
	webexApiRequestAllItems,
} from './GenericFunctions';

import { createHmac } from 'crypto';

export class CiscoWebexTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webex by Cisco Trigger',
		name: 'ciscoWebexTrigger',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:ciscoWebex.png',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ":" + $parameter["event"]}}',
		description: 'Starts the workflow when Cisco Webex events occur.',
		defaults: {
			name: 'Webex by Cisco Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'ciscoWebexOAuth2Api',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: '[All]',
						value: 'all',
					},
					{
						name: 'Attachment Action',
						value: 'attachmentAction',
					},
					{
						name: 'Meeting',
						value: 'meeting',
					},
					{
						name: 'Membership',
						value: 'membership',
					},
					{
						name: 'Message',
						value: 'message',
					},
					// {
					// 	name: 'Telephony Call',
					// 	value: 'telephonyCall',
					// },
					{
						name: 'Recording',
						value: 'recording',
					},
					{
						name: 'Room',
						value: 'room',
					},
				],
				default: 'meeting',
				required: true,
			},
			...getEvents(),
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['attachmentAction'],
					},
				},
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'By default the response only contain a reference to the data the user inputed. If this option gets activated, it will resolve the data automatically.',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Has Files',
						name: 'hasFiles',
						type: 'boolean',
						displayOptions: {
							show: {
								'/resource': ['message'],
								'/event': ['created', 'deleted'],
							},
						},
						default: false,
						description: 'Whether to limit to messages which contain file content attachments',
					},
					{
						displayName: 'Is Locked',
						name: 'isLocked',
						type: 'boolean',
						displayOptions: {
							show: {
								'/resource': ['room'],
								'/event': ['created', 'updated'],
							},
						},
						default: false,
						description: 'Whether to limit to rooms that are locked',
					},
					{
						displayName: 'Is Moderator',
						name: 'isModerator',
						type: 'boolean',
						displayOptions: {
							show: {
								'/resource': ['membership'],
								'/event': ['created', 'updated', 'deleted'],
							},
						},
						default: false,
						description: 'Whether to limit to moderators of a room',
					},
					{
						displayName: 'Mentioned People',
						name: 'mentionedPeople',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['message'],
								'/event': ['created', 'deleted'],
							},
						},
						default: '',
						description:
							'Limit to messages which contain these mentioned people, by person ID; accepts me as a shorthand for your own person ID; separate multiple values with commas',
					},
					{
						displayName: 'Message ID',
						name: 'messageId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['attachmentAction'],
								'/event': ['created'],
							},
						},
						default: '',
						description: 'Limit to a particular message, by ID',
					},
					{
						displayName: 'Owned By',
						name: 'ownedBy',
						displayOptions: {
							show: {
								'/resource': ['meeting'],
							},
						},
						type: 'string',
						default: '',
					},
					{
						displayName: 'Person Email',
						name: 'personEmail',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['membership'],
								'/event': ['created', 'updated', 'deleted'],
							},
						},
						default: '',
						description: 'Limit to a particular person, by email',
					},
					{
						displayName: 'Person Email',
						name: 'personEmail',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['message'],
								'/event': ['created', 'deleted'],
							},
						},
						default: '',
						description: 'Limit to a particular person, by email',
					},
					{
						displayName: 'Person ID',
						name: 'personId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['attachmentAction'],
								'/event': ['created'],
							},
						},
						default: '',
						description: 'Limit to a particular person, by ID',
					},
					{
						displayName: 'Person ID',
						name: 'personId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['membership'],
								'/event': ['created', 'updated', 'deleted'],
							},
						},
						default: '',
						description: 'Limit to a particular person, by ID',
					},
					{
						displayName: 'Person ID',
						name: 'personId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['message'],
								'/event': ['created', 'deleted'],
							},
						},
						default: '',
						description: 'Limit to a particular person, by ID',
					},

					{
						displayName: 'Room ID',
						name: 'roomId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['attachmentAction'],
								'/event': ['created'],
							},
						},
						default: '',
						description: 'Limit to a particular room, by ID',
					},
					{
						displayName: 'Room ID',
						name: 'roomId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['membership'],
								'/event': ['created', 'updated', 'deleted'],
							},
						},
						default: '',
						description: 'Limit to a particular room, by ID',
					},
					{
						displayName: 'Room ID',
						name: 'roomId',
						type: 'string',
						displayOptions: {
							show: {
								'/resource': ['message'],
								'/event': ['created', 'updated'],
							},
						},
						default: '',
						description: 'Limit to a particular room, by ID',
					},
					{
						displayName: 'Room Type',
						name: 'roomType',
						type: 'options',
						options: [
							{
								name: 'Direct',
								value: 'direct',
							},
							{
								name: 'Group',
								value: 'group',
							},
						],
						displayOptions: {
							show: {
								'/resource': ['message'],
								'/event': ['created', 'deleted'],
							},
						},
						default: '',
						description: 'Limit to a particular room type',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: [
							{
								name: 'Direct',
								value: 'direct',
							},
							{
								name: 'Group',
								value: 'group',
							},
						],
						displayOptions: {
							show: {
								'/resource': ['room'],
								'/event': ['created', 'updated'],
							},
						},
						default: '',
						description: 'Limit to a particular room type',
					},
					// {
					// 	displayName: 'Call Type',
					// 	name: 'callType',
					// 	type: 'options',
					// 	options: [
					// 		{
					// 			name: 'Emergency',
					// 			value: 'emergency',
					// 		},
					// 		{
					// 			name: 'External',
					// 			value: 'external',
					// 		},
					// 		{
					// 			name: 'Location',
					// 			value: 'location',
					// 		},
					// 		{
					// 			name: 'Disconnected',
					// 			value: 'disconnected',
					// 		},
					// 		{
					// 			name: 'Organization',
					// 			value: 'organization',
					// 		},
					// 		{
					// 			name: 'Other',
					// 			value: 'other',
					// 		},
					// 		{
					// 			name: 'Repair',
					// 			value: 'repair',
					// 		},
					// 	],
					// 	displayOptions: {
					// 		show: {
					// 			'/resource': [
					// 				'telephonyCall',
					// 			],
					// 			'/event': [
					// 				'created',
					// 				'deleted',
					// 				'updated',
					// 			],
					// 		},
					// 	},
					// 	default: '',
					// 	description: `Limit to a particular call type`,
					// },
					// {
					// 	displayName: 'Person ID',
					// 	name: 'personId',
					// 	type: 'string',
					// 	displayOptions: {
					// 		show: {
					// 			'/resource': [
					// 				'telephonyCall',
					// 			],
					// 			'/event': [
					// 				'created',
					// 				'deleted',
					// 				'updated',
					// 			],
					// 		},
					// 	},
					// 	default: '',
					// 	description: 'Limit to a particular person, by ID',
					// },
					// {
					// 	displayName: 'Personality',
					// 	name: 'personality',
					// 	type: 'options',
					// 	options: [
					// 		{
					// 			name: 'Click To Dial',
					// 			value: 'clickToDial',
					// 		},
					// 		{
					// 			name: 'Originator',
					// 			value: 'originator',
					// 		},
					// 		{
					// 			name: 'Terminator',
					// 			value: 'terminator',
					// 		},
					// 	],
					// 	displayOptions: {
					// 		show: {
					// 			'/resource': [
					// 				'telephonyCall',
					// 			],
					// 			'/event': [
					// 				'created',
					// 				'deleted',
					// 				'updated',
					// 			],
					// 		},
					// 	},
					// 	default: '',
					// 	description: `Limit to a particular call personality`,
					// },
					// {
					// 	displayName: 'State',
					// 	name: 'state',
					// 	type: 'options',
					// 	options: [
					// 		{
					// 			name: 'Alerting',
					// 			value: 'alerting',
					// 		},
					// 		{
					// 			name: 'Connected',
					// 			value: 'connected',
					// 		},
					// 		{
					// 			name: 'Connecting',
					// 			value: 'connecting',
					// 		},
					// 		{
					// 			name: 'Disconnected',
					// 			value: 'disconnected',
					// 		},
					// 		{
					// 			name: 'Held',
					// 			value: 'held',
					// 		},
					// 		{
					// 			name: 'Remote Held',
					// 			value: 'remoteHeld',
					// 		},
					// 	],
					// 	displayOptions: {
					// 		show: {
					// 			'/resource': [
					// 				'telephonyCall',
					// 			],
					// 			'/event': [
					// 				'created',
					// 				'deleted',
					// 				'updated',
					// 			],
					// 		},
					// 	},
					// 	default: '',
					// 	description: `Limit to a particular call state`,
					// },
				],
			},
		],
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const webhookData = this.getWorkflowStaticData('node');
				const resource = this.getNodeParameter('resource') as string;
				const event = this.getNodeParameter('event') as string;

				// Check all the webhooks which exist already if it is identical to the
				// one that is supposed to get created.
				const data = await webexApiRequestAllItems.call(this, 'items', 'GET', '/webhooks');
				for (const webhook of data) {
					if (
						webhook.url === webhookUrl &&
						webhook.resource === mapResource(resource) &&
						webhook.event === event &&
						webhook.status === 'active'
					) {
						webhookData.webhookId = webhook.id as string;
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const resource = this.getNodeParameter('resource') as string;
				const filters = this.getNodeParameter('filters', {}) as IDataObject;
				const credentials = await this.getCredentials('ciscoWebexOAuth2Api');
				const secret = getAutomaticSecret(credentials);
				const filter = [];
				for (const key of Object.keys(filters)) {
					if (key !== 'ownedBy') {
						filter.push(`${key}=${filters[key]}`);
					}
				}
				const endpoint = '/webhooks';

				const body: IDataObject = {
					name: `n8n-webhook:${webhookUrl}`,
					targetUrl: webhookUrl,
					event,
					resource: mapResource(resource),
				};

				if (filters.ownedBy) {
					body.ownedBy = filters.ownedBy as string;
				}

				body.secret = secret;

				if (filter.length) {
					body.filter = filter.join('&');
				}

				const responseData = await webexApiRequest.call(this, 'POST', endpoint, body);
				if (responseData.id === undefined) {
					// Required data is missing so was not successful
					return false;
				}

				webhookData.webhookId = responseData.id as string;
				webhookData.secret = secret;
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const endpoint = `/webhooks/${webhookData.webhookId}`;
					try {
						await webexApiRequest.call(this, 'DELETE', endpoint);
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
		let bodyData = this.getBodyData();
		const webhookData = this.getWorkflowStaticData('node');
		const headers = this.getHeaderData() as IDataObject;
		const req = this.getRequestObject();
		const resolveData = this.getNodeParameter('resolveData', false) as boolean;

		//@ts-ignore
		const computedSignature = createHmac('sha1', webhookData.secret)
			.update(req.rawBody)
			.digest('hex');
		if (headers['x-spark-signature'] !== computedSignature) {
			return {};
		}

		if (resolveData) {
			const {
				data: { id },
			} = bodyData as { data: { id: string } };
			bodyData = await webexApiRequest.call(this, 'GET', `/attachment/actions/${id}`);
		}

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
