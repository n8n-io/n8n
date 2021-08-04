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
	formatSingleScheduleTime,
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

// import * as config from '../../../cli/config';

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
				// const webhookUrl = this.getNodeWebhookUrl('default') as string;

				// const endpoint = '/_watcher/_query/watches';
				// const response = await elasticsearchApiRequest.call(this, 'GET', endpoint);
				// console.log('Query watches response:');
				// console.log(response);

				// for (const watch of response.watches) {
				// 	if (watch.url === webhookUrl && watch.campaignId === 'abc') {
				// 		return true;
				// 	}
				// }

				return false;
			},

			async create(this: IHookFunctions) {
				console.log('______________');
				const webhookData = this.getWorkflowStaticData('node');
				const endpoint = `/_watcher/watch/${uuid()}`;

				// console.log(config);

				// const port = config.get('port') as number;
				// console.log('______________');
				// console.log(port);
				// console.log('______________');

				const body: WatchCreationPayload = {
					trigger: {},
					actions: {
						my_webhook: {
							webhook: {
						// 		method: 'POST',
						// 		host: '',
						// 		port: 0,
						// 		path: '',
						// 		body: '',
							},
						},
					},
				};

				const scheduleType = this.getNodeParameter('schedule') as WatchSchedule;

				if (scheduleType !== 'interval' && scheduleType !== 'cron') {
					const { properties } = this.getNodeParameter(`${scheduleType}Schedule`) as ScheduleProperties;

					if (!properties.length) {
						throw new NodeOperationError(this.getNode(), 'Please fill in the schedule');
					}

					body.trigger = {
						schedule: {
							[scheduleType]: properties.length > 1
								? formatMultipleScheduleTimes(properties)
								: formatSingleScheduleTime(properties),
						},
					};
				} else {
					const value = this.getNodeParameter(scheduleType) as string;

					body.trigger = {
						schedule: {
							[scheduleType]: Number(value),
						},
					};
				}

				// console.log(JSON.stringify(body, null, 2));

				// const response = await elasticsearchApiRequest.call(this, 'PUT', endpoint, body);
				// console.log('Create watch response:');
				// console.log(response);
				// webhookData.webhookId = response.webhookId;
				return true;
			},

			async delete(this: IHookFunctions) {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				const watchId = 'abc'; // derive from webhookUrl
				const endpoint = `_watcher/watch/${watchId}`;

				try {
					// await elasticsearchApiRequest.call(this, 'DELETE', endpoint);
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
