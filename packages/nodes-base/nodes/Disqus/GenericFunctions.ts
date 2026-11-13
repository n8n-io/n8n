import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function disqusApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	qs: IDataObject = {},
	uri: RequestPath,
	body: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials<{ accessToken: string }>('disqusApi');
	qs.api_key = credentials.accessToken;

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		method,
		body,
		qs,
		qsStringifyOptions: { arrayFormat: 'repeat' },
		uri: requestUrl`https://disqus.com/api/3.0/${uri}`,
		json: true,
	};

	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function disqusApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	qs: IDataObject = {},
	uri: RequestPath,
	body: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await disqusApiRequest.call(this, method, qs, uri, body);
		qs.cursor = responseData.cursor.id;
		returnData.push.apply(returnData, responseData.response as IDataObject[]);
	} while (responseData.cursor.more === true && responseData.cursor.hasNext === true);
	return returnData;
}
