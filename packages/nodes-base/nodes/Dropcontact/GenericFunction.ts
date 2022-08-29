import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	NodeApiError,
} from 'n8n-workflow';

/**
 * Make an authenticated API request to Bubble.
 */
export async function dropcontactApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
) {
	const options: IHttpRequestOptions = {
		method,
		uri: `https://api.dropcontact.io${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'dropcontactApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
