import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import type { IAirtopResponse } from './types';
import { BASE_URL, N8N_VERSION } from '../constants';

const defaultHeaders = {
	'Content-Type': 'application/json',
	'x-airtop-sdk-environment': 'n8n',
	'x-airtop-sdk-version': N8N_VERSION,
};

function isRequestUrl(endpoint: RequestPath | RequestUrl): endpoint is RequestUrl {
	return endpoint.toString().startsWith('http');
}

export async function apiRequest<T extends IAirtopResponse = IAirtopResponse>(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath | RequestUrl,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<T> {
	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: defaultHeaders,
		method,
		body,
		qs: query,
		url: isRequestUrl(endpoint) ? endpoint : requestUrl`${BASE_URL}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'airtopApi', options);
}
