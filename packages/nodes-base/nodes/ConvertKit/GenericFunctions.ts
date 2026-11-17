import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function convertKitApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		url: requestUrl`https://api.convertkit.com/v3${endpoint}`,
		json: true,
	};

	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	if (Object.keys(options.qs as IDataObject).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'convertKitApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
