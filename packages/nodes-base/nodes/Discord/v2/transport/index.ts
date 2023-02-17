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
	webhookUri?: string,
) {
	const headers: IDataObject = {};

	if (!webhookUri) {
		const credentials = await this.getCredentials('discordOAuth2Api');
		headers.Authorization = `Bot ${credentials.botToken}`;
	}

	const options: OptionsWithUrl = {
		headers,
		method,
		qs,
		body,
		url: webhookUri || `https://discord.com/api/v10/${endpoint}`,
		json: true,
	};

	try {
		const response = await this.helpers.request({ ...options, resolveWithFullResponse: true });

		const resetAfter = Number(response.headers['x-ratelimit-reset-after']);
		const remaining = Number(response.headers['x-ratelimit-remaining']);

		if (remaining === 0) {
			await sleep(resetAfter);
		} else {
			await sleep(20); //prevent excing global rate limit of 50 requests per second
		}

		return response.body || { success: true };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function discordApiMultiPartRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	formData: FormData,
	webhookUri?: string,
) {
	const headers: IDataObject = {
		'content-type': 'multipart/form-data; charset=utf-8',
	};

	if (!webhookUri) {
		const credentials = await this.getCredentials('discordOAuth2Api');
		headers.Authorization = `Bot ${credentials.botToken}`;
	}

	const options: OptionsWithUrl = {
		headers,
		method,
		formData,
		url: webhookUri || `https://discord.com/api/v10/${endpoint}`,
	};

	try {
		const response = await this.helpers.request({ ...options, resolveWithFullResponse: true });

		const resetAfter = Number(response.headers['x-ratelimit-reset-after']);
		const remaining = Number(response.headers['x-ratelimit-remaining']);

		if (remaining === 0) {
			await sleep(resetAfter);
		} else {
			await sleep(20); //prevent excing global rate limit of 50 requests per second
		}

		return jsonParse<IDataObject[]>(response.body);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
