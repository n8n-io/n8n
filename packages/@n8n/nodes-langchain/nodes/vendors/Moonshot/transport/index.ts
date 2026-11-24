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
	body?: IDataObject;
	qs?: IDataObject;
};

export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	parameters?: RequestParameters,
) {
	const { body, qs, headers } = parameters ?? {};

	const credentials = await this.getCredentials('moonshotApi');
	const baseUrl = (credentials.url as string) ?? 'https://api.moonshot.ai/v1';

	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: headers ?? {},
		method,
		body,
		qs,
		url: requestUrl`${baseUrl}${endpoint}`,
		json: true,
	};

	return await this.helpers.httpRequestWithAuthentication.call(this, 'moonshotApi', options);
}
