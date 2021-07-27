import {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';

import {
	elasticsearchApiRequest,
} from './GenericFunctions';

import {
	WatcherAction,
} from './types';

import {
	WATCH_CHECK_SCHEDULES,
} from './constants';

import {
	makeScheduleFields,
} from './descriptions/shared';

export class ElasticsearchTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Elasticsearch Trigger',
		name: 'elasticsearchTrigger',
		icon: 'file:elasticsearch.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listen to Elasticsearch events',
		defaults: {
			name: 'Elasticsearch Trigger',
			color: '#e18063',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'elasticsearchApi',
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
				displayName: 'Action',
				name: 'action',
				type: 'options',
				required: true,
				default: 'webhook',
				options: [
					{
						name: 'Email',
						value: 'email',
						description: 'Send an email',
					},
					{
						name: 'Index',
						value: 'index',
						description: 'Index into Elasticsearch',
					},
					{
						name: 'Logging',
						value: 'logging',
						description: 'Log to Elasticsearch',
					},
					{
						name: 'Slack',
						value: 'slack',
						description: 'Send a message to Slack',
					},
					{
						name: 'Webhook',
						value: 'webhook',
						description: 'Send an HTTP request',
					},
				],
			},

			// ----------------------------------------
			//              email action
			// ----------------------------------------
			// https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-email.html#email-action-attributes
			{
				displayName: 'To',
				name: 'to',
				description: 'Email address to which the email will be sent',
				required: true,
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'email',
						],
					},
				},
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				description: 'Frequency to check the watch condition',
				type: 'options',
				default: 'weekly',
				required: true,
				displayOptions: {
					show: {
						action: [
							'email',
						],
					},
				},
				options: WATCH_CHECK_SCHEDULES.map(schedule => ({ name: schedule, value: schedule.toLowerCase() })),
			},
			...makeScheduleFields('email'),
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						action: [
							'email',
						],
					},
				},
				options: [
					{
						displayName: 'BCC',
						name: 'bcc',
						description: 'Comma-separated list of email addresses of the blind carbon copy recipients',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Body',
						name: 'body',
						description: 'Body of the email to send',
						type: 'string',
						default: '',
					},
					{
						displayName: 'CC',
						name: 'cc',
						description: 'Comma-separated list of email addresses of the carbon copy recipients',
						type: 'string',
						default: '',
					},
					{
						displayName: 'From',
						name: 'from',
						description: 'Email address from which the email will be sent',
						type: 'string',
						default: '',
						required: true,
					},
					{
						displayName: 'Reply To',
						name: 'reply_to',
						description: 'Comma-separated list of email addresses to which an eventual reply will be sent',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Subject',
						name: 'subject',
						description: 'Subject of the email to send',
						type: 'string',
						default: '',
					},
				],
			},

			// ----------------------------------------
			//              index action
			// ----------------------------------------
			// https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-index.html#index-action-attributes
			{
				displayName: 'Index',
				name: 'index',
				description: 'Index, alias, or data stream to index into',
				required: true,
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'index',
						],
					},
				},
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				description: 'Frequency to check the watch condition',
				type: 'options',
				default: 'weekly',
				required: true,
				displayOptions: {
					show: {
						action: [
							'index',
						],
					},
				},
				options: WATCH_CHECK_SCHEDULES.map(schedule => ({ name: schedule, value: schedule.toLowerCase() })),
			},
			...makeScheduleFields('index'),
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						action: [
							'index',
						],
					},
				},
				options: [
					{
						displayName: 'Document ID',
						name: 'doc_id',
						description: 'ID of the document to index',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Execution Time Field',
						name: 'execution_time_field',
						description: 'Field to store/index the watch execution time',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						description: 'Time to wait for the index API call to return, expressed in <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units</a>. If no response is received in time, the index action times out and fails.',
						type: 'string',
						default: '60s',
					},
				],
			},

			// ----------------------------------------
			//              logging action
			// ----------------------------------------
			// https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-logging.html#logging-action-attributes
			{
				displayName: 'Text',
				name: 'text',
				description: 'Text to write to the logs',
				required: true,
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'logging',
						],
					},
				},
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				description: 'Frequency to check the watch condition',
				type: 'options',
				default: 'weekly',
				required: true,
				displayOptions: {
					show: {
						action: [
							'logging',
						],
					},
				},
				options: WATCH_CHECK_SCHEDULES.map(schedule => ({ name: schedule, value: schedule.toLowerCase() })),
			},
			...makeScheduleFields('logging'),
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						action: [
							'logging',
						],
					},
				},
				options: [
					{
						displayName: 'Category',
						name: 'category',
						description: 'Category under which to log the text',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Level',
						name: 'level',
						description: 'Level of the log to write',
						type: 'options',
						default: '',
						options: [
							{
								name: 'Debug',
								value: 'debug',
							},
							{
								name: 'Error',
								value: 'error',
							},
							{
								name: 'Info',
								value: 'info',
							},
							{
								name: 'Trace',
								value: 'trace',
							},
							{
								name: 'Warning',
								value: 'warn',
							},
						],
					},
				],
			},

			// ----------------------------------------
			//              slack action
			// ----------------------------------------
			// https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-slack.html
			{
				displayName: 'To',
				name: 'to',
				required: true,
				description: 'Comma-separated list of channels and/or users to send the message to. Channel names must start with <code>#</code> and usernames must start with <code>@</code>.',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'slack',
						],
					},
				},
			},
			{
				displayName: 'Text',
				name: 'text',
				required: true,
				description: 'Content of the message to send',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'slack',
						],
					},
				},
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				description: 'Frequency to check the watch condition',
				type: 'options',
				default: 'weekly',
				required: true,
				displayOptions: {
					show: {
						action: [
							'slack',
						],
					},
				},
				options: WATCH_CHECK_SCHEDULES.map(schedule => ({ name: schedule, value: schedule.toLowerCase() })),
			},
			...makeScheduleFields('slack'),
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						action: [
							'slack',
						],
					},
				},
				options: [
					{
						displayName: 'From',
						name: 'from',
						description: 'The sender name to display in the Slack message. Overrides the incoming webhook’s configured name.',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Icon',
						name: 'icon',
						description: 'The icon to display in the Slack messages. Overrides the incoming webhook\'s configured icon. Accepts a public URL to an image.',
						type: 'string',
						default: '',
					},
				],
			},

			// ----------------------------------------
			//            webhook action
			// ----------------------------------------
			// https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-webhook.html
			{
				displayName: 'Host',
				name: 'host',
				description: 'Host to connect to',
				required: true,
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						action: [
							'webhook',
						],
					},
				},
			},
			{
				displayName: 'Port',
				name: 'port',
				description: 'Port the HTTP service is listening on',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						action: [
							'webhook',
						],
					},
				},
			},
			{
				displayName: 'Schedule',
				name: 'schedule',
				description: 'Frequency to check the watch condition',
				type: 'options',
				default: 'weekly',
				required: true,
				displayOptions: {
					show: {
						action: [
							'webhook',
						],
					},
				},
				options: WATCH_CHECK_SCHEDULES.map(schedule => ({ name: schedule, value: schedule.toLowerCase() })),
			},
			...makeScheduleFields('webhook'),
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						action: [
							'webhook',
						],
					},
				},
				options: [
					{
						displayName: 'Body',
						name: 'body',
						description: 'The HTTP request body, either as static text or using <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/how-watcher-works.html#templates" target="_blank">Mustache templates</a>. When not specified, an empty body is sent.',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Connection Timeout',
						name: 'connection_timeout',
						description: 'Time to wait for setting up the HTTP connection, expressed in <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units</a>.  If the connection could not be set up within this time, the action will timeout and fail.',
						type: 'string',
						default: '10s',
					},
					{
						displayName: 'Headers',
						name: 'headers',
						description: 'The HTTP request headers, either as static text or using <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/how-watcher-works.html#templates" target="_blank">Mustache templates</a>',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Method',
						name: 'method',
						description: 'HTTP method to use',
						type: 'options',
						default: 'get',
						options: [
							{
								name: 'DELETE',
								value: 'delete',
							},
							{
								name: 'GET',
								value: 'get',
							},
							{
								name: 'HEAD',
								value: 'head',
							},
							{
								name: 'POST',
								value: 'post',
							},
							{
								name: 'PUT',
								value: 'put',
							},
						],
					},
					{
						displayName: 'Path',
						name: 'path',
						description: 'The URL path, either static text or using <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/how-watcher-works.html#templates" target="_blank">Mustache templates</a>. URL query string parameters must be specified in the params field.',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Proxy Host',
						name: 'proxyHost',
						description: 'Proxy host to use when connecting to the host',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Proxy Port',
						name: 'proxyPort',
						description: 'Proxy port to use when connecting to the host',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Query String Parameters',
						name: 'params',
						description: 'URL query string parameters, either as static text or using <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/how-watcher-works.html#templates" target="_blank">Mustache templates</a>',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Read Timeout',
						name: 'read_timeout',
						description: 'Time to wait for reading data from the HTTP connection, expressed in <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units</a>. If no response was received within this time, the action will timeout and fail.',
						type: 'string',
						default: '10s',
					},
					{
						displayName: 'Scheme',
						name: 'scheme',
						description: 'Connection scheme for the webhook. Defaults to HTTP.',
						type: 'options',
						default: 'http',
						options: [
							{
								name: 'HTTP',
								value: 'http',
							},
							{
								name: 'HTTPS',
								value: 'https',
							},
						],
					},
					{
						displayName: 'URL',
						name: 'url',
						description: 'A shortcut for specifying the request scheme, host, port, and path as a single string, e.g. <code>http://example.org/foo/my-service</code>',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// TODO: Find GET /webhooks endpoint

				// const webhookUrl = this.getNodeWebhookUrl('default') as string;
				// const campaignId = this.getNodeParameter('campaignId') as string;
				// const { webhooks } = await emeliaApiRequest.call(this, 'GET', '/webhook');
				// for (const webhook of webhooks) {
				// 	if (webhook.url === webhookUrl && webhook.campaignId === campaignId) {
				// 		return true;
				// 	}
				// }

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const watchId = this.getNodeParameter('watchId') as string;
				const endpoint = `_watcher/watch/${watchId}`;

				const body = {
					action: this.getNodeParameter('action') as WatcherAction,
					interval: this.getNodeParameter('interval') as string,
				};

				// TODO: check response
				const response = await elasticsearchApiRequest.call(this, 'PUT', endpoint, body);
				console.log(response);
				webhookData.webhookId = response.webhookId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const watchId = this.getNodeParameter('watchId') as string;
				const endpoint = `_watcher/watch/${watchId}`;

				try {
					await elasticsearchApiRequest.call(this, 'DELETE', endpoint);
				} catch (error) {
					return false;
				}

				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		return {
			workflowData: [
				this.helpers.returnJsonArray(request.body),
			],
		};
	}
}
