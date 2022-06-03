import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function calApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('calApi');

	const apiKeyParam = `?apiKey=${credentials.apiKey}`;

	const endpoint = 'https://api.cal.com/v1';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'X-TOKEN': credentials.apiKey,
		},
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}${apiKeyParam}`,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		const resp = await this.helpers.request!(options);
		return method == "GET" ? resp.webhooks : resp.webhook;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
