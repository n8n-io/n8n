import type { OptionsWithUrl } from 'request';

import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

import { sleep, NodeApiError, jsonParse, NodeOperationError } from 'n8n-workflow';

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

export async function checkBotAccessToGuild(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions,
	guildId: string,
	botId: string,
) {
	try {
		const members: Array<{ user: { id: string } }> = await discordApiRequest.call(
			this,
			'GET',
			`/guilds/${guildId}/members`,
			undefined,
			{ limit: 1000 },
		);

		return members.some((member) => member.user.id === botId);
	} catch (error) {}

	return false;
}

async function checkUserAccess(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions,
	guildId: string,
	itemIndex = 0,
	userGuilds?: IDataObject[],
) {
	if (!userGuilds) {
		userGuilds = (await discordApiRequest.call(this, 'GET', '/users/@me/guilds')) as IDataObject[];
	}

	if (!userGuilds.some((guild) => guild.id === guildId)) {
		throw new NodeOperationError(
			this.getNode(),
			`You do not have access to the guild with the id ${guildId}.`,
			{
				itemIndex,
			},
		);
	}
}

export async function checkUserAccessToChannel(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions,
	channelId: string,
	userGuilds: IDataObject[],
	itemIndex = 0,
) {
	let guildId = '';
	try {
		const channel = await discordApiRequest.call(this, 'GET', `/channels/${channelId}`);
		guildId = channel.guild_id;
	} catch (error) {}

	await checkUserAccess.call(this, guildId, itemIndex, userGuilds);
}

export async function getGuildId(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions,
) {
	const guildId = this.getNodeParameter('guildId', undefined, {
		extractValue: true,
	}) as string;

	const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';
	if (isOAuth2) await checkUserAccess.call(this, guildId);

	return guildId;
}

export async function getChannelIdSetup(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions,
) {
	const isOAuth2 = this.getNodeParameter('authentication', 0) === 'oAuth2';
	let userGuilds: IDataObject[] = [];

	if (isOAuth2) {
		userGuilds = await discordApiRequest.call(this, 'GET', '/users/@me/guilds');
	}

	return async (i: number) => {
		const channelId = this.getNodeParameter('channelId', i, undefined, {
			extractValue: true,
		}) as string;

		if (isOAuth2) await checkUserAccessToChannel.call(this, channelId, userGuilds, i);

		return channelId;
	};
}
