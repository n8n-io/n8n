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

export async function eventbriteApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		uri: uri ||`https://www.eventbriteapi.com/v3${resource}`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'privateKey') {
			const credentials = this.getCredentials('eventbriteApi');
			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			options.headers!['Authorization'] = `Bearer ${credentials.apiKey}`;

			return await this.helpers.request!(options);
		} else {
			return await this.helpers.requestOAuth2!.call(this, 'eventbriteOAuth2Api', options);
		}
	} catch (error) {
		let errorMessage = error.message;
		if (error.response.body && error.response.body.error_description) {
			errorMessage = error.response.body.error_description;
		}
		throw new Error('Eventbrite Error: ' + errorMessage);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function eventbriteApiRequestAllItems(this: IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions, propertyName: string, method: string, resource: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await eventbriteApiRequest.call(this, method, resource, body, query);
		query.continuation = responseData.pagination.continuation;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.pagination !== undefined &&
		responseData.pagination.has_more_items !== undefined &&
		responseData.pagination.has_more_items !== false
	);

	return returnData;
}
