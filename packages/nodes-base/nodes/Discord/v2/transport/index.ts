import type { OptionsWithUrl } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';
import { sleep, NodeApiError, jsonParse } from 'n8n-workflow';

import type FormData from 'form-data';

export async function discordApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
) {
	const credentials = await this.getCredentials('discordOAuth2Api');

	const options: OptionsWithUrl = {
		headers: {
			Authorization: `Bot ${credentials.botToken}`,
		},
		method,
		qs,
		body,
		url: `https://discord.com/api/v10/${endpoint}`,
		json: true,
	};

	try {
		const response = await this.helpers.request({ ...options, resolveWithFullResponse: true });

		const resetAfter = Number(response.headers['x-ratelimit-reset-after']) * 1000;
		await sleep(resetAfter || 1200);

		return response.body;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function discordApiMultiPartRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	formData: FormData,
) {
	const credentials = await this.getCredentials('discordOAuth2Api');

	const options: OptionsWithUrl = {
		headers: {
			Authorization: `Bot ${credentials.botToken}`,
			'content-type': 'multipart/form-data; charset=utf-8',
		},
		method,
		formData,
		url: `https://discord.com/api/v10/${endpoint}`,
	};

	try {
		const response = await this.helpers.request({ ...options, resolveWithFullResponse: true });

		const resetAfter = Number(response.headers['x-ratelimit-reset-after']) * 1000;
		await sleep(resetAfter || 1200);

		return jsonParse<IDataObject[]>(response.body);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
