import {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import {
	elasticsearchApiRequest,
	formatMultipleScheduleTimes,
	formatSchedule,
} from './GenericFunctions';

import {
	DAYS_OF_THE_WEEK,
	DAYS_PER_MONTH,
	HOURS_PER_DAY,
	MINUTES_PER_HOUR,
	MONTHS_OF_THE_YEAR,
	WATCH_CHECK_SCHEDULES,
} from './constants';

import {
	ScheduleProperties,
	WatchCreationPayload,
	WatchSchedule,
} from './types';

import { v4 as uuid } from 'uuid';

import { URL } from 'url';

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
				displayName: 'Schedule',
				name: 'schedule',
				required: true,
				description: 'Frequency to check the watch condition',
				type: 'options',
				default: 'weekly',
				options: WATCH_CHECK_SCHEDULES.map(schedule => {
					return {
						name: schedule[0].toUpperCase() + schedule.slice(1),
						value: schedule,
					};
				}),
			},
			{
				displayName: 'Hourly Schedule',
				name: 'hourlySchedule',
				required: true,
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Frequency',
				displayOptions: {
					show: {
						schedule: [
							'hourly',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Every hour at',
						name: 'properties',
						values: [
							{
								displayName: 'Minute',
								name: 'minute',
								description: 'Minute to check the watch condition',
								type: 'options',
								default: '0',
								options: MINUTES_PER_HOUR.map(minute => ({ name: minute, value: minute })),
							},
						],
					},
				],
			},
			{
				displayName: 'Daily Schedule',
				name: 'dailySchedule',
				required: true,
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Frequency',
				displayOptions: {
					show: {
						schedule: [
							'daily',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Every day at',
						name: 'properties',
						values: [
							{
								displayName: 'Hour',
								name: 'hour',
								description: 'Hour of the day to check the watch condition',
								type: 'options',
								default: '0',
								options: HOURS_PER_DAY.map(minute => ({ name: minute, value: minute })),
							},
						],
					},
				],
			},
			{
				displayName: 'Weekly Schedule',
				name: 'weeklySchedule',
				required: true,
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Frequency',
				displayOptions: {
					show: {
						schedule: [
							'weekly',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Every week at',
						name: 'properties',
						values: [
							{
								displayName: 'Day',
								name: 'day',
								description: 'Day of the week to check the watch condition',
								type: 'options',
								default: 'monday',
								options: DAYS_OF_THE_WEEK.map(day => ({ name: day, value: day.toLowerCase() })),
							},
							{
								displayName: 'Hour',
								name: 'hour',
								description: 'Hour of the day to check the watch condition',
								type: 'options',
								default: '0',
								options: HOURS_PER_DAY.map(hour => ({ name: `${hour}:00`, value: hour })),
							},
						],
					},
				],
			},
			{
				displayName: 'Monthly Schedule',
				name: 'monthlySchedule',
				required: true,
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Frequency',
				displayOptions: {
					show: {
						schedule: [
							'monthly',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Every month at',
						name: 'properties',
						values: [
							{
								displayName: 'Day',
								name: 'day',
								description: 'Day of the month to check the watch condition',
								type: 'options',
								default: '1',
								options: DAYS_PER_MONTH.map(day => ({ name: day, value: day })),
							},
							{
								displayName: 'Hour',
								name: 'hour',
								description: 'Hour of the day to check the watch condition',
								type: 'options',
								default: '0',
								options: HOURS_PER_DAY.map(hour => ({ name: `${hour}:00`, value: hour })),
							},
						],
					},
				],
			},
			{
				displayName: 'Yearly Schedule',
				name: 'yearlySchedule',
				required: true,
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Frequency',
				displayOptions: {
					show: {
						schedule: [
							'yearly',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Properties',
						name: 'properties',
						values: [
							{
								displayName: 'Every year at',
								name: 'month',
								description: 'Month to check the watch condition',
								type: 'options',
								default: 'january',
								options: MONTHS_OF_THE_YEAR.map(day => ({ name: day, value: day.toLowerCase() })),
							},
							{
								displayName: 'Day',
								name: 'day',
								description: 'Day of the month to check the watch condition',
								type: 'options',
								default: '1',
								options: DAYS_PER_MONTH.map(day => ({ name: day, value: day })),
							},
							{
								displayName: 'Hour',
								name: 'hour',
								description: 'Hour of the day to check the watch condition',
								type: 'options',
								default: '0',
								options: HOURS_PER_DAY.map(hour => ({ name: `${hour}:00`, value: hour })),
							},
						],
					},
				],
			},
			{
				displayName: 'Interval',
				name: 'interval',
				required: true,
				description: 'Fixed time interval to check the watch condition, expressed in <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units</a>',
				type: 'string',
				default: '',
				placeholder: '5m',
				displayOptions: {
					show: {
						schedule: [
							'interval',
						],
					},
				},
			},
			{
				displayName: 'Cron Expression',
				name: 'cron',
				required: true,
				description: '<a href="https://en.wikipedia.org/wiki/Cron#Overview" target="_blank">Cron expression</a> to set a schedule to check the watch condition',
				type: 'string',
				default: '',
				placeholder: '0 0 12 * * ?',
				displayOptions: {
					show: {
						schedule: [
							'cron',
						],
					},
				},
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions) {
				const endpoint = '/_watcher/_query/watches';
				const response = await elasticsearchApiRequest.call(this, 'GET', endpoint);
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const url = new URL(webhookUrl);

				for (const item of response.watches) {
					const registeredPath = item.watch.actions?.n8n_webhook.webhook.path;
					if (registeredPath === url.pathname) {
						console.log('checkExists true');
						webhookData.webhookId = item._id;
						return true;
					}
				}

				console.log('checkExists false');
				return false;
			},

			async create(this: IHookFunctions) {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const url = new URL(webhookUrl);

				const body: WatchCreationPayload = {
					trigger: {},

					// TODO: change to condition with script
					condition: {
						always: {},
					},

					// TODO: Add input with search and indices

					actions: {
						n8n_webhook: {
							webhook: {
								method: 'POST',
								host: url.hostname,
								port: Number(url.port),
								path: url.pathname,
								// body: '{{ctx.watch_id}}:{{ctx.payload.hits.total}}', // TODO: not needed?
							},
						},
					},
				};

				const scheduleType = this.getNodeParameter('schedule') as WatchSchedule;

				if (scheduleType !== 'interval' && scheduleType !== 'cron') {
					const { properties: schedules } = this.getNodeParameter(`${scheduleType}Schedule`) as ScheduleProperties;

					if (schedules?.length === 0) {
						throw new NodeOperationError(this.getNode(), 'Please fill in the schedule details');
					}

					body.trigger = {
						schedule: {
							[scheduleType]: schedules.length > 1
								? schedules.map((schedule) => formatSchedule(schedule, scheduleType))
								: formatSchedule(schedules[0], scheduleType),
						},
					};
				} else {
					const scheduleValue = this.getNodeParameter(scheduleType) as string;

					body.trigger = {
						schedule: {
							[scheduleType]: Number(scheduleValue),
						},
					};
				}

				console.log('***************');
				console.log('CREATION REQUEST BODY:');
				console.log(JSON.stringify(body, null, 2));
				console.log('***************');

				const watchId = url.pathname.split('/')[2];
				const endpoint = `/_watcher/watch/${watchId}`;
				const response = await elasticsearchApiRequest.call(this, 'PUT', endpoint, body);

				console.log('***************');
				console.log('CREATION RESPONSE:');
				console.log(response);
				console.log('***************');

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response._id;

				return true;
			},

			async delete(this: IHookFunctions) {
				const webhookData = this.getWorkflowStaticData('node');

				const endpoint = `/_watcher/watch/${webhookData.webhookId}`;
				try {
					const response = await elasticsearchApiRequest.call(this, 'DELETE', endpoint);
					console.log('DELETION RESPONSE:');
					console.log(response);
				} catch (error) {
					console.log('DELETION ERROR');
					console.log(error);
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
