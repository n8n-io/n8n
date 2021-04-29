import {
	OptionsWithUri
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function convertKitApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string, endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('convertKitApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.convertkit.com/v3${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	// it's a webhook so include the api secret on the body
	if ((options.uri as string).includes('/automations/hooks')) {
		options.body['api_secret'] = credentials.apiSecret;
	} else {
		qs.api_secret = credentials.apiSecret;
	}

	if (Object.keys(options.qs).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
