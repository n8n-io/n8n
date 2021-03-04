import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function discordApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://discord.com/api${resource}`,
		json: true,
	};

	if (Object.keys(option).length) {
		Object.assign(options, option);
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	const oAuth2Options = {
		includeCredentialsOnRefreshOnBody: true,
	};

	try {
		console.log(options);
		return await this.helpers.requestOAuth2!.call(this, 'discordOAuth2Api', options, oAuth2Options);
	} catch (error) {

		const errors = error.response.body.context_info.errors;
		const message = error.response.body.message;

		if (errors) {
			const errorMessage = errors.map((e: IDataObject) => e.message).join('|');
			throw new Error(`Discord error response [${error.statusCode}]: ${errorMessage}`);
		} else if (message) {
			throw new Error(`Discord error response [${error.statusCode}]: ${message}`);
		}

		throw error;
	}
}
