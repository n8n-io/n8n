import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions
} from 'n8n-workflow';

export async function erpNextApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {'Accept': 'application/json'},
		method,
		body,
		qs: query,
		uri: uri || ``,
		json: true
	};

	options = Object.assign({}, options, option);

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = this.getCredentials('erpNextApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers!['Authorization'] = `token ${credentials.apiKey}:${credentials.apiSecret}`;
			options.uri = `https://${credentials.subdomain}.erpnext.com${resource}`;

			console.log(options);

			return await this.helpers.request!(options);
		} else {
			const credentials = this.getCredentials('erpNextOAuth2Api');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.uri = `https://${credentials.subdomain}.erpnext.com${resource}`;
			return await this.helpers.requestOAuth2!.call(this, 'erpNextOAuth2Api', options);
		}
	} catch (error) {
		throw error;
	}
}

export async function erpNextApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const limit : number = 100;
	const returnData: IDataObject[] = [];

	let responseData;
	let index : number = 0;

	do {
		endpoint = `${endpoint}${index}`;
		responseData = await erpNextApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData.data);

		index = index + limit;
	} while (
		responseData.data.length !== 0
	);

	return {
		data: returnData
	};
}

