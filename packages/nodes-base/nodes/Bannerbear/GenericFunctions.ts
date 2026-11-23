import { snakeCase } from 'change-case';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function bannerbearApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	query: IDataObject = {},
	headers: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('bannerbearApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${credentials.apiKey}`,
		},
		method,
		body,
		qs: query,
		uri: requestUrl`https://api.bannerbear.com/v2${resource}`,
		json: true,
	};
	if (!Object.keys(body as IDataObject).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options.headers = Object.assign({}, options.headers, headers);
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function keysToSnakeCase(elements: IDataObject[] | IDataObject): IDataObject[] {
	if (!Array.isArray(elements)) {
		elements = [elements];
	}
	for (const element of elements) {
		for (const key of Object.keys(element)) {
			if (key !== snakeCase(key)) {
				element[snakeCase(key)] = element[key];
				delete element[key];
			}
		}
	}
	return elements;
}
