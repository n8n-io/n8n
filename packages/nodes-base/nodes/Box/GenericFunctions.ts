import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IOAuth2Options,
	IRequestOptions,
	JsonObject,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function boxApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: RequestUrl,
	option: Pick<IRequestOptions, 'encoding' | 'formData' | 'resolveWithFullResponse'> = {},
): Promise<any> {
	let options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || requestUrl`https://api.box.com/2.0${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}

		const oAuth2Options: IOAuth2Options = {
			includeCredentialsOnRefreshOnBody: true,
		};

		return await this.helpers.requestOAuth2.call(this, 'boxOAuth2Api', options, oAuth2Options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function boxApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 100;
	query.offset = 0;
	do {
		responseData = await boxApiRequest.call(this, method, endpoint, body, query);
		query.offset = (responseData.offset as number) + query.limit;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData[propertyName].length !== 0);

	return returnData;
}

export async function boxApiRequestAllItemsMarker(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.limit = 100;
	do {
		responseData = await boxApiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		query.next_marker = responseData.next_marker;
	} while (responseData.next_marker);

	return returnData;
}
