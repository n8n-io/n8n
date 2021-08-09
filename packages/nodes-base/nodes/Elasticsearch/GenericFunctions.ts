import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	ElasticsearchApiCredentials, WatchSchedule,
} from './types';

export async function elasticsearchApiRequest(
	this: IExecuteFunctions | IHookFunctions,
	method: 'GET' | 'PUT' | 'POST' | 'DELETE',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const {
		username,
		password,
		baseUrl,
	} = this.getCredentials('elasticsearchApi') as ElasticsearchApiCredentials;

	const token = Buffer.from(`${username}:${password}`).toString('base64');

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Basic ${token}`,
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `${baseUrl}${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function formatSchedule(
	schedule: { [key: string]: string },
	scheduleType: WatchSchedule,
) {
	if (scheduleType === 'hourly') {
		return {
			minute: Number(schedule.minute),
		};
	}

	if (scheduleType === 'daily') {
		return {
			at: `${schedule.hour}:00`,
		};
	}

	if (scheduleType === 'weekly') {
		return {
			on: schedule.day,
			at: `${schedule.hour}:00`,
		};
	}

	if (scheduleType === 'monthly') {
		return {
			on: Number(schedule.day),
			at: `${schedule.hour}:00`,
		};
	}

	if (scheduleType === 'yearly') {
		return {
			in: schedule.month,
			on: Number(schedule.day),
			at: `${schedule.hour}:00`,
		};
	}
}

/**
 * Format watch creation payload properties for multiple schedule times.
 */
export function formatMultipleScheduleTimes(
	schedules: Array<{ [key: string]: string }>,
	scheduleType: WatchSchedule,
) {
	const whoa = schedules.map((schedule) => formatSchedule(schedule, scheduleType));

	console.log('__________');
	console.log(whoa);
	console.log('__________');

	return whoa;



	// return properties.reduce<{ [key: string]: number[] }>((acc, cur) => {
	// 	const key = Object.keys(cur)[0];

	// 	acc[key]
	// 		? acc[key].push(Number(cur[key]))
	// 		: acc[key] = [Number(cur[key])];

	// 	return acc;
	// }, {});
}
