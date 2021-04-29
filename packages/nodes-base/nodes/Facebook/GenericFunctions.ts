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
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function facebookApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	let credentials;

	if (this.getNode().name.includes('Trigger')) {
		credentials = await this.getCredentials('facebookGraphAppApi') as IDataObject;
	} else {
		credentials = await this.getCredentials('facebookGraphApi') as IDataObject;
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
		throw new NodeApiError(this.getNode(), error);
	}
}
