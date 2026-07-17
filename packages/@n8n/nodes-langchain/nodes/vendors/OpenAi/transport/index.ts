import { AiConfig } from '@n8n/config';
import { Container } from '@n8n/di';
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

// Fallback used only when the AiConfig cannot be resolved from the DI container
// (e.g. in unit tests). At runtime the configured value is authoritative.
const DEFAULT_AI_TIMEOUT_MS = 60 * 60 * 1000;

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

	// Honor the configured AI timeout (N8N_AI_TIMEOUT_MAX) so long-running requests
	// aren't capped at the process-global axios default (300000 ms). Read from the
	// central AiConfig, matching how sibling AI nodes consume this setting.
	const timeout = Container.get(AiConfig)?.timeout ?? DEFAULT_AI_TIMEOUT_MS;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers,
		method,
		body,
		qs,
		uri: requestUrl`${baseUrl}${endpoint}`,
		json: true,
		timeout,
	};

	if (option && Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	const response = await this.helpers.requestWithAuthentication.call(this, 'openAiApi', options);

	if (response && response.error === null) {
		response.error = undefined;
	}

	return response;
}
