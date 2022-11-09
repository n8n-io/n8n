import { OptionsWithUri } from 'request';

import { BINARY_ENCODING, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions, NodeApiError } from 'n8n-workflow';

export async function affinityApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
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
	if (!Object.keys(body).length) {
		delete options.body;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function affinityApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	propertyName: string,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.page_size = 500;

	do {
		responseData = await affinityApiRequest.call(this, method, resource, body, query);
		// @ts-ignore
		query.page_token = responseData.page_token;
		returnData.push.apply(returnData, responseData[propertyName]);
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
