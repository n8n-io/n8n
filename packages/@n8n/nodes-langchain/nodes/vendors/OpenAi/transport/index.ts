import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string;
	qs?: IDataObject;
	option?: Pick<
		IRequestOptions,
		'formData' | 'json' | 'encoding' | 'useStream' | 'resolveWithFullResponse'
	> & {
		uri?: never;
		url?: never;
		baseURL?: never;
	};
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	parameters?: RequestParameters,
) {
	const { body, qs, option } = parameters ?? {};

	const credentials = await this.getCredentials('openAiApi');

	const baseUrl = credentials.url || 'https://api.openai.com/v1';
	let headers = parameters?.headers ?? {};

	if (
		credentials.header &&
		typeof credentials.headerName === 'string' &&
		credentials.headerName &&
		typeof credentials.headerValue === 'string'
	) {
		headers = {
			...headers,
			[credentials.headerName]: credentials.headerValue,
		};
	}

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers,
		method,
		body,
		qs,
		uri: requestUrl`${baseUrl}${endpoint}`,
		json: true,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	return await this.helpers.requestWithAuthentication.call(this, 'openAiApi', options);
}
