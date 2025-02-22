import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

import type { IAirtopResponse } from './types';
import { BASE_URL } from '../constants';

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		url: endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'airtopApi',
		options,
	)) as IAirtopResponse;
}
