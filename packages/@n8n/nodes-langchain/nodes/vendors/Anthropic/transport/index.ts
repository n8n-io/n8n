import type FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
} from 'n8n-workflow';

type RequestParameters = {
	headers?: IDataObject;
	body?: IDataObject | string | FormData;
	qs?: IDataObject;
	option?: IDataObject;
	enableAnthropicBetas?: {
		promptTools?: boolean;
		codeExecution?: boolean;
	};
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	parameters?: RequestParameters,
) {
	const { body, qs, option, headers } = parameters ?? {};

	const credentials = await this.getCredentials('anthropicApi');
	const baseUrl = credentials.url ?? 'https://api.anthropic.com';
	const url = `${baseUrl}${endpoint}`;

	const betas = ['files-api-2025-04-14'];
	if (parameters?.enableAnthropicBetas?.promptTools) {
		betas.push('prompt-tools-2025-04-02');
	}

	if (parameters?.enableAnthropicBetas?.codeExecution) {
		betas.push('code-execution-2025-05-22');
	}

	const options = {
		headers: {
			'anthropic-version': '2023-06-01',
			'anthropic-beta': betas.join(','),
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

	return await this.helpers.httpRequestWithAuthentication.call(this, 'anthropicApi', options);
}
