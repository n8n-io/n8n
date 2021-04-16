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
) {

	const { oauthTokenData } = this.getCredentials('discordOAuth2Api') as {
		oauthTokenData: { access_token: string }
	};

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'user-agent': 'n8n',
			Authorization: `Bearer ${oauthTokenData.access_token}`,
		},
		method,
		body,
		qs,
		uri: `https://discord.com/api${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	const oAuth2Options = {
		includeCredentialsOnRefreshOnBody: true,
	};

	try {
		console.log(options);
		return await this.helpers.requestOAuth2!.call(this, 'discordOAuth2Api', options, oAuth2Options);
	} catch (error) {
		console.log(error);

		// TODO: Prettify error

		throw error;
	}
}
