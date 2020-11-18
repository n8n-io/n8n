import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function facebookApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	let credentials;

	if (this.getNode().name.includes('Trigger')) {
		credentials = this.getCredentials('facebookGraphAppApi') as IDataObject;
	} else {
		credentials = this.getCredentials('facebookGraphApi') as IDataObject;
	}

	qs.access_token = credentials!.accessToken;

	const options: OptionsWithUri = {
		headers: {
			accept: 'application/json,text/*;q=0.99',
		},
		method,
		qs,
		body,
		gzip: true,
		uri: uri ||`https://graph.facebook.com/v8.0${resource}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response.body && error.response.body.error) {
			const message = error.response.body.error.message;
			throw new Error(
				`Facebook Trigger error response [${error.statusCode}]: ${message}`,
			);
		}
		throw new Error(error);
	}
}
