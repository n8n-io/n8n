import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	parameters?: RequestParameters,
) {
	const { body, qs } = parameters ?? {};

	const credentials = await this.getCredentials<{
		apiKey?: string;
		baseUrl: string;
	}>('ollamaApi');
	const apiKey = credentials.apiKey;
	if (apiKey !== undefined && typeof apiKey !== 'string') {
		throw new Error('API key must be a string');
	}

	const headers = parameters?.headers ?? {};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		method,
		body,
		qs,
		url: requestUrl`${credentials.baseUrl}${endpoint}`,
		json: true,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, 'ollamaApi', options);
}
