import {
	OptionsWithUri,
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

export async function circleciApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('circleCiApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	let options: OptionsWithUri = {
		headers: {
			'Circle-Token': credentials.apiKey,
			'Accept': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri ||`https://circleci.com/api/v2${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (err) {
		if (err.response && err.response.body && err.response.body.message) {
			// Try to return the error prettier
			throw new Error(`CircleCI error response [${err.statusCode}]: ${err.response.body.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw err;	}
}

/**
 * Make an API request to paginated CircleCI endpoint
 * and return all results
 */
export async function circleciApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await circleciApiRequest.call(this, method, resource, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query['page-token'] = responseData.next_page_token;
	} while (
		responseData.next_page_token !== undefined &&
		responseData.next_page_token !== null
	);
	return returnData;
}
