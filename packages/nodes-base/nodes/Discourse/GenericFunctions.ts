import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

export async function discourseApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	option = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = (await this.getCredentials('discourseApi')) as { url: string };

	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		uri: `${credentials.url}${path}`,
		json: true,
	};

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(this, 'discourseApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function discourseApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;
	do {
		responseData = await discourseApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData);
		query.page++;
	} while (responseData.length !== 0);
	return returnData;
}
