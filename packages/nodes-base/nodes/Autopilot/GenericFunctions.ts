import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHookFunctions, IWebhookFunctions, NodeApiError } from 'n8n-workflow';

export async function autopilotApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const credentials = (await this.getCredentials('autopilotApi')) as IDataObject;

	const apiKey = `${credentials.apiKey}`;

	const endpoint = 'https://api2.autopilothq.com/v1';

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			autopilotapikey: apiKey,
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

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function autopilotApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];
	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;

	const base = endpoint;

	let responseData;
	do {
		responseData = await autopilotApiRequest.call(this, method, endpoint, body, query);
		endpoint = `${base}/${responseData.bookmark}`;
		returnData.push.apply(returnData, responseData[propertyName]);
		if (query.limit && returnData.length >= query.limit && !returnAll) {
			return returnData;
		}
	} while (responseData.bookmark !== undefined);
	return returnData;
}
