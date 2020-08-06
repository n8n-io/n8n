import {
	OptionsWithUri
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions
} from 'n8n-workflow';

export async function convertKitApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: string, endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

		const credentials = this.getCredentials('convertKitApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri ||`https://api.convertkit.com/v3${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	console.log(options);

	try {

		qs.api_secret = credentials.apiSecret;

		return await this.helpers.request!(options);

	} catch (error) {

		let errorMessage = error;

		if (error.response && error.response.body && error.response.body.message) {
			errorMessage = error.response.body.message;
		}

		throw new Error(`ConvertKit error response: ${errorMessage}`);
	}
}
