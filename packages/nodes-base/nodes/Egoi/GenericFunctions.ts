import {
	OptionsWithUrl,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
 } from 'n8n-workflow';

export async function egoiApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, endpoint: string, method: string, body: any = {}, qs: IDataObject = {} ,headers?: object): Promise<any> { // tslint:disable-line:no-any

	const host = 'api.egoiapp.com';

	const options: OptionsWithUrl = {
		headers: {
			'accept': 'application/json',
		},
		method,
		qs,
		body,
		url: ``,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
			const credentials = this.getCredentials('egoiApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers = Object.assign({}, headers, { 'Apikey':`${credentials.apiKey}` });

			options.url = `https://${host}${endpoint}`;

			return await this.helpers.request!(options);
		
	} catch (error) {
		if (error.respose && error.response.body && error.response.body.detail) {
			throw new Error(`E-goi Error response [${error.statusCode}]: ${error.response.body.detail}`);
		}
		throw error;
	}
}

export async function egoiApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, endpoint: string, method: string, propertyName: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 500;

		responseData = await egoiApiRequest.call(this, endpoint, method, body);
		
		do {
			responseData = await egoiApiRequest.call(this, endpoint, method, body, query);
			returnData.push(responseData as IDataObject);
			query.offset += query.count;
		} while (
			responseData[propertyName] && responseData[propertyName].length !== 0
		);


	return returnData;
}