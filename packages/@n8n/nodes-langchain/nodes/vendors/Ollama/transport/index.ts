import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	option?: IDataObject;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option } = parameters ?? {};

	const credentials = await this.getCredentials('ollamaApi');
	const baseUrl = credentials.baseUrl as string;
	const url = `${baseUrl}${endpoint}`;

	const headers = parameters?.headers ?? {};
	if (credentials.apiKey) {
		headers.Authorization = `Bearer ${String(credentials.apiKey)}`;
	}

	const options = {
		headers: {
			'Content-Type': 'application/json',
			...headers,
		},
		method,
		body,
		qs,
		url,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'ollamaApi', options);
}
