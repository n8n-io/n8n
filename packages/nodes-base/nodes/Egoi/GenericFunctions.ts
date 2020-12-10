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

export async function egoiApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, qs: IDataObject = {}, headers?: object): Promise<any> { // tslint:disable-line:no-any

	const credentials = this.getCredentials('egoiApi') as IDataObject;

	const options: OptionsWithUrl = {
		headers: {
			'accept': 'application/json',
			'Apikey': `${credentials.apiKey}`,
		},
		method,
		qs,
		body,
		url: `https://api.egoiapp.com${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {

		return await this.helpers.request!(options);

	} catch (error) {
		let errorMessage;

		if (error.response && error.response.body) {

			if (Array.isArray(error.response.body.errors)) {
				const errors = error.response.body.errors;
				errorMessage = errors.map((e: IDataObject) => e.detail);
			} else {
				errorMessage = error.response.body.detail;
			}

			throw new Error(`e-goi Error response [${error.statusCode}]: ${errorMessage}`);
		}
		throw error;
	}
}

export async function egoiApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query.offset = 0;
	query.count = 500;

	do {
		responseData = await egoiApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query.offset += query.count;
	} while (
		responseData[propertyName] && responseData[propertyName].length !== 0
	);

	return returnData;
}
