import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function convertKitApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	qs: IDataObject = {},
	url?: string,
	option: IDataObject = {},
): Promise<any> {
	let options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		url: url || `https://api.convertkit.com/v3${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

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
