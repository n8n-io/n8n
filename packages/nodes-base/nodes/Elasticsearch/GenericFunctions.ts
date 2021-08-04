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
	ElasticsearchApiCredentials,
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

export function formatSingleScheduleTime(properties: Array<{ [key: string]: string }>) {
	const key = Object.keys(properties[0])[0];
	return { [key]: Number(properties[0][key]) };
}

/**
 * Format watch creation payload properties for multiple schedule times.
 */
export function formatMultipleScheduleTimes(properties: Array<{ [key: string]: string }>) {
	return properties.reduce<{ [key: string]: number[] }>((acc, cur) => {
		const key = Object.keys(cur)[0];

		acc[key]
			? acc[key].push(Number(cur[key]))
			: acc[key] = [Number(cur[key])];

		return acc;
	}, {});
}
