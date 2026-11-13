import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function coinGeckoApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: requestUrl`https://api.coingecko.com/api/v3${endpoint}`,
		json: true,
	};

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.request.call(this, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function coinGeckoRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	let respData;
	query.per_page = 250;
	query.page = 1;

	do {
		responseData = await coinGeckoApiRequest.call(this, method, endpoint, body, query);
		query.page++;
		respData = responseData;
		if (propertyName !== '') {
			respData = responseData[propertyName];
		}
		returnData.push.apply(returnData, respData as IDataObject[]);
	} while (respData.length !== 0);

	return returnData;
}
