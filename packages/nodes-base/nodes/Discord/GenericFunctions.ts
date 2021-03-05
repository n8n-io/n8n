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

import WebSocket = require('ws');

export async function discordApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {

	const { oauthTokenData } = this.getCredentials('discordOAuth2Api') as {
		oauthTokenData: { access_token: string }
	};

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${oauthTokenData.access_token}`,
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
		// console.log(options);
		return await this.helpers.requestOAuth2!.call(this, 'discordOAuth2Api', options, oAuth2Options);
		// return await this.helpers.request!.call(this, options);
	} catch (error) {

		// TODO

		throw error;
	}
}

export function setHeartbeatInterval(ws: WebSocket, data: string) {
	const interval = JSON.parse(data).d.heartbeat_interval;

	const payload = JSON.stringify({
		op: 1, // opcode
		d: 251, // last sequence number `s` received by client
	});

	return setInterval(() => ws.send(payload), interval);
}
