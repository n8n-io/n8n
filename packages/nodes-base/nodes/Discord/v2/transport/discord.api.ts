import type FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	LegacyRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { sleep, NodeApiError, jsonParse, requestUrl } from 'n8n-workflow';

import { getCredentialsType, requestApi } from './helpers';

async function getRequestTarget(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	credentialType: string,
	endpoint: RequestPath,
) {
	if (credentialType !== 'discordWebhookApi') {
		return { url: requestUrl`https://discord.com/api/v10${endpoint}` };
	}
	const credentials = await this.getCredentials('discordWebhookApi');
	return { url: credentials.webhookUri as string };
}

export async function discordApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body?: IDataObject,
	qs?: IDataObject,
) {
	const authentication = this.getNodeParameter('authentication', 0, 'webhook') as string;
	const headers: IDataObject = {};

	const credentialType = getCredentialsType(authentication);

	const options: LegacyRequestOptions = {
		headers,
		method,
		qs,
		body,
		...(await getRequestTarget.call(this, credentialType, endpoint)),
		json: true,
	};

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
	endpoint: RequestPath,
	formData: FormData,
) {
	const headers: IDataObject = {
		'content-type': 'multipart/form-data; charset=utf-8',
	};
	const authentication = this.getNodeParameter('authentication', 0, 'webhook') as string;

	const credentialType = getCredentialsType(authentication);

	const options: LegacyRequestOptions = {
		headers,
		method,
		formData,
		...(await getRequestTarget.call(this, credentialType, endpoint)),
	};

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
