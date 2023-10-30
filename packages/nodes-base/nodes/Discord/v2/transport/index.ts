import type { OptionsWithUrl } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { sleep, NodeApiError, jsonParse } from 'n8n-workflow';

import type FormData from 'form-data';

const getCredentialsType = (authentication: string) => {
	let credentialType = '';
	switch (authentication) {
		case 'botToken':
			credentialType = 'discordBotApi';
			break;
		case 'oAuth2':
			credentialType = 'discordOAuth2Api';
			break;
		case 'webhook':
			credentialType = 'discordWebhookApi';
			break;
		default:
			credentialType = 'discordBotApi';
	}
	return credentialType;
};

async function requestApi(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	options: OptionsWithUrl,
	credentialType: string,
	endpoint: string,
) {
	let response;
	if (credentialType === 'discordOAuth2Api' && endpoint !== '/users/@me/guilds') {
		const credentials = await this.getCredentials('discordOAuth2Api');
		(options.headers as IDataObject)!.Authorization = `Bot ${credentials.botToken}`;
		response = await this.helpers.request({ ...options, resolveWithFullResponse: true });
	} else {
		response = await this.helpers.requestWithAuthentication.call(this, credentialType, {
			...options,
			resolveWithFullResponse: true,
		});
	}
	return response;
}

export async function discordApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
) {
	const authentication = this.getNodeParameter('authentication', 0, 'webhook') as string;
	const headers: IDataObject = {};

	const credentialType = getCredentialsType(authentication);

	const options: OptionsWithUrl = {
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
) {
	const headers: IDataObject = {
		'content-type': 'multipart/form-data; charset=utf-8',
	};
	const authentication = this.getNodeParameter('authentication', 0, 'webhook') as string;

	const credentialType = getCredentialsType(authentication);

	const options: OptionsWithUrl = {
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
			await sleep(20); //prevent excing global rate limit of 50 requests per second
		}

		return jsonParse<IDataObject[]>(response.body);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
