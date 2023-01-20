import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError } from 'n8n-workflow';

export async function eventbriteApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	let options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		uri: uri || `https://www.eventbriteapi.com/v3${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'privateKey') {
			const credentials = await this.getCredentials('eventbriteApi');

			options.headers!.Authorization = `Bearer ${credentials.apiKey}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'eventbriteOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function eventbriteApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await eventbriteApiRequest.call(this, method, resource, body, query);
		query.continuation = responseData.pagination.continuation;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.pagination?.has_more_items !== undefined &&
		responseData.pagination.has_more_items !== false
	);

	return returnData;
}
