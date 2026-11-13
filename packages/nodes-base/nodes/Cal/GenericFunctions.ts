import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodePropertyOptions,
	IWebhookFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function calApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('calApi');

	const options: WithRequestTarget<IHttpRequestOptions> = {
		baseURL: credentials.host as string,
		method,
		body,
		qs: query,
		url: resource,
	};

	if (!Object.keys(query).length) {
		delete options.qs;
	}
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'calApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function sortOptionParameters(
	optionParameters: INodePropertyOptions[],
): INodePropertyOptions[] {
	optionParameters.sort((a, b) => {
		const aName = a.name.toLowerCase();
		const bName = b.name.toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return optionParameters;
}
