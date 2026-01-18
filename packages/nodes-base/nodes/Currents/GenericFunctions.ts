import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const BASE_URL = 'https://api.currents.dev/v1';

export async function currentsApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const options: IRequestOptions = {
		method,
		body,
		qs,
		uri: `${BASE_URL}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'currentsApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function currentsApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];

	let responseData: IDataObject;
	qs.limit = 100;

	do {
		responseData = await currentsApiRequest.call(this, method, endpoint, body, qs);
		const items = (responseData.data as IDataObject[]) ?? [];
		returnData.push(...items);

		// Handle cursor-based pagination
		if (responseData.has_more && items.length > 0) {
			const lastItem = items[items.length - 1];
			qs.starting_after = lastItem.cursor as string;
		}
	} while (responseData.has_more);

	return returnData;
}
