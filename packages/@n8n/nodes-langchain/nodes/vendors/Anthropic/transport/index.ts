import type FormData from 'form-data';
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
	body?: IDataObject | string | FormData;
	qs?: IDataObject;
	enableAnthropicBetas?: {
		promptTools?: boolean;
		codeExecution?: boolean;
	};
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	parameters?: RequestParameters,
) {
	const { body, qs, headers } = parameters ?? {};

	const credentials = await this.getCredentials('anthropicApi');
	const baseUrl = credentials.url ?? 'https://api.anthropic.com';

	const betas = ['files-api-2025-04-14'];
	if (parameters?.enableAnthropicBetas?.promptTools) {
		betas.push('prompt-tools-2025-04-02');
	}

	if (parameters?.enableAnthropicBetas?.codeExecution) {
		betas.push('code-execution-2025-05-22');
	}

	const requestHeaders: IDataObject = {
		'anthropic-version': '2023-06-01',
		'anthropic-beta': betas.join(','),
		...headers,
	};

	if (
		credentials.header &&
		typeof credentials.headerName === 'string' &&
		credentials.headerName &&
		typeof credentials.headerValue === 'string'
	) {
		requestHeaders[credentials.headerName] = credentials.headerValue;
	}

	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: requestHeaders,
		method,
		body,
		qs,
		url: requestUrl`${baseUrl}${endpoint}`,
		json: true,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, 'anthropicApi', options);
}
