import {
	INodeProperties,
} from 'n8n-workflow';

import {
	DAYS_OF_THE_WEEK,
	DAYS_PER_MONTH,
	HOURS_PER_DAY,
	MINUTES_PER_HOUR,
	MONTHS_OF_THE_YEAR,
} from '../constants';

import {
	WatcherAction,
} from '../types';

// https://www.elastic.co/guide/en/elasticsearch/reference/current/trigger-schedule.html

export const makeScheduleFields = (action: WatcherAction) => {
	return [
		{
			displayName: 'Hourly Schedule',
			name: 'hourlySchedule',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Frequency',
			displayOptions: {
				show: {
					action: [
						action,
					],
					schedule: [
						'hourly',
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
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Frequency',
			displayOptions: {
				show: {
					action: [
						action,
					],
					schedule: [
						'daily',
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
							displayName: 'Hour',
							name: 'hour',
							description: 'Hour to check the watch condition',
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
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Frequency',
			displayOptions: {
				show: {
					action: [
						action,
					],
					schedule: [
						'weekly',
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
							description: 'Hour to check the watch condition',
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
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Frequency',
			displayOptions: {
				show: {
					action: [
						action,
					],
					schedule: [
						'monthly',
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
							description: 'Hour to check the watch condition',
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
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			placeholder: 'Add Frequency',
			displayOptions: {
				show: {
					action: [
						action,
					],
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
							displayName: 'Month',
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
							description: 'Hour to check the watch condition',
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
			description: 'Fixed time interval to check the watch condition, expressed in <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units" target="_blank">Elasticsearch time units</a>',
			type: 'string',
			default: '',
			placeholder: '5m',
			displayOptions: {
				show: {
					action: [
						action,
					],
					schedule: [
						'interval',
					],
				},
			},
		},
		{
			displayName: 'Cron Expression',
			name: 'cron',
			description: '<a href="https://en.wikipedia.org/wiki/Cron" target="_blank">Cron expression</a> to set a schedule to check the watch condition',
			type: 'string',
			default: '',
			placeholder: '0 0 12 * * ?',
			displayOptions: {
				show: {
					action: [
						action,
					],
					schedule: [
						'cron',
					],
				},
			},
		},
	] as INodeProperties[];
};
