import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

export async function actionNetworkApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	path: string,
	body?: any,
	headers?: object,
	qs?: any
): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('ActionNetworkGroupApiToken');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			'OSDI-API-Token': credentials.apiKey,
			'Content-Type': 'application/json',
			...(headers || {}),
		},
		method,
		uri: `https://actionnetwork.org${path}`,
		body: JSON.stringify(body),
		qs
	};

	try {
		const data = await this.helpers.request!(options);
		try {
			return JSON.parse(data);
		} catch (e) {
			return data;
		}
	} catch (error) {
		const errorMessage = (error.response && error.response.body.message) || (error.response && error.response.body.Message) || error.message;

		if (error.statusCode === 403) {
			throw new Error('The Action Network credentials are not valid!');
		}

		throw new Error(`Action Network error response [${error.statusCode}]: ${errorMessage}`);
	}
}
