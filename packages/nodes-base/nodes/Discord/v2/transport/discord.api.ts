import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
} from 'n8n-workflow';

import { sleep, NodeApiError, jsonParse } from 'n8n-workflow';

import type FormData from 'form-data';
import { getCredentialsType, requestApi } from './helpers';

export async function discordApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
) {
	const authentication = this.getNodeParameter('authentication', 0, 'webhook') as string;
	const headers: IDataObject = {};

	const credentialType = getCredentialsType(authentication);

	const options: IRequestOptions = {
		headers,
		method,
		qs,
		body,
		url: `https://discord.com/api/v10${endpoint}`,
		json: true,
	};

	if (credentialType === 'discordWebhookApi') {
		const credentials = await this.getCredentials('discordWebhookApi');
		options.url = credentials.webhookUri as string;
	}

	try {
		const response = await requestApi.call(this, options, credentialType, endpoint);

		const resetAfter = Number(response.headers['x-ratelimit-reset-after']);
		const remaining = Number(response.headers['x-ratelimit-remaining']);

		if (remaining === 0) {
			await sleep(resetAfter);
		} else {
			await sleep(20); //prevent exceeding global rate limit of 50 requests per second
		}

		return response.body || { success: true };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function discordApiMultiPartRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	formData: FormData,
) {
	const headers: IDataObject = {
		'content-type': 'multipart/form-data; charset=utf-8',
	};
	const authentication = this.getNodeParameter('authentication', 0, 'webhook') as string;

	const credentialType = getCredentialsType(authentication);

	const options: IRequestOptions = {
		headers,
		method,
		formData,
		url: `https://discord.com/api/v10${endpoint}`,
	};

	if (credentialType === 'discordWebhookApi') {
		const credentials = await this.getCredentials('discordWebhookApi');
		options.url = credentials.webhookUri as string;
	}

	try {
		const response = await requestApi.call(this, options, credentialType, endpoint);

		const resetAfter = Number(response.headers['x-ratelimit-reset-after']);
		const remaining = Number(response.headers['x-ratelimit-remaining']);

		if (remaining === 0) {
			await sleep(resetAfter);
		} else {
			await sleep(20); //prevent exceeding global rate limit of 50 requests per second
		}

		return jsonParse<IDataObject[]>(response.body);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
