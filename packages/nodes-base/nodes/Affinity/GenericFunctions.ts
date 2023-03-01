import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { BINARY_ENCODING } from 'n8n-core';

import type { IDataObject, IHookFunctions, IWebhookFunctions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function affinityApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('affinityApi');

	const apiKey = `:${credentials.apiKey}`;

	const endpoint = 'https://api.affinity.co';

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${Buffer.from(apiKey).toString(BINARY_ENCODING)}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};
	if (!Object.keys(body as IDataObject).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function affinityApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	propertyName: string,
	method: string,
	resource: string,
	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.page_size = 500;

	do {
		responseData = await affinityApiRequest.call(this, method, resource, body, query);
		// @ts-ignore
		query.page_token = responseData.page_token;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.page_token !== undefined && responseData.page_token !== null);

	return returnData;
}

export function eventsExist(subscriptions: string[], currentSubsriptions: string[]) {
	for (const subscription of currentSubsriptions) {
		if (!subscriptions.includes(subscription)) {
			return false;
		}
	}
	return true;
}

export function mapResource(key: string) {
	//@ts-ignore
	return {
		person: 'persons',
		list: 'lists',
		note: 'notes',
		organization: 'organizatitons',
		list_entry: 'list-entries',
		field: 'fields',
		file: 'files',
	}[key];
}
