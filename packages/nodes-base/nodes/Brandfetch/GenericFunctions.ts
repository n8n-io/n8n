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

export async function brandfetchApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	try {
		let options: IHttpRequestOptions = {
			method: method as IHttpRequestMethods,
			qs,
			body,
			url: uri || `https://api.brandfetch.io/v2${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		if (this.getNodeParameter('operation', 0) === 'logo' && options.json === false) {
			delete options.headers;
		}

		if (!Object.keys(body as IDataObject).length) {
			delete options.body;
		}
		if (!Object.keys(qs).length) {
			delete options.qs;
		}

		console.log(options);

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'brandfetchApi', options);

		if (response.statusCode && response.statusCode !== 200) {
			throw new NodeApiError(this.getNode(), response as JsonObject);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
