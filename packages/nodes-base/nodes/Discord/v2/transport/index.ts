import type { OptionsWithUrl } from 'request';

import type {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import type { IDataObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
