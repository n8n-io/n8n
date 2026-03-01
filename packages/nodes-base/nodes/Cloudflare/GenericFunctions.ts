import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function cloudflareApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body = {},
	qs: IDataObject = {},
	_uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		method,
		body,
		qs,
		uri: `https://api.cloudflare.com/client/v4${resource}`,
		json: true,
	};

	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		return await this.helpers.requestWithAuthentication.call(this, 'cloudflareApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function cloudflareApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 1;

	do {
		responseData = await cloudflareApiRequest.call(this, method, endpoint, body, query);
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.result_info.total_pages !== responseData.result_info.page);
	return returnData;
}
