import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

import type { IAirtopResponse } from './types';
import { BASE_URL, N8N_VERSION } from '../constants';

const defaultHeaders = {
	'Content-Type': 'application/json',
	'x-airtop-sdk-environment': 'n8n',
	'x-airtop-sdk-version': N8N_VERSION,
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const options: IHttpRequestOptions = {
		headers: defaultHeaders,
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
