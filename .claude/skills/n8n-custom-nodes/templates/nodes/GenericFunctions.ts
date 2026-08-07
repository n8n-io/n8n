/**
 * TEMPLATE: GenericFunctions
 *
 * Every service node should have this file. Contains reusable API request
 * helpers shared across the node, trigger, and methods. Handles authentication,
 * error wrapping, and pagination.
 *
 * Replace all occurrences of:
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 *   - __BASE_URL__        → Your API base URL (or use credentials.baseUrl)
 */
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

// Union of all context types that might call these helpers
type Context =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IPollFunctions;

/**
 * Make an authenticated API request to the service.
 */
export async function __serviceName__ApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: IDataObject = {},
): Promise<IDataObject | IDataObject[]> {
	const credentials = await this.getCredentials('__serviceNameApi__');

	const options: IRequestOptions = {
		method,
		body,
		qs,
		uri: `${credentials.baseUrl}/api/v1${endpoint}`,
		json: true,
		...option,
	};

	// Don't send body on GET/DELETE
	if (method === 'GET' || method === 'DELETE') {
		delete options.body;
	}

	// Remove empty qs
	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return (await this.helpers.requestWithAuthentication.call(
			this,
			'__serviceNameApi__',
			options,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: (error as JsonObject).message as string,
		});
	}
}

/**
 * Fetch all items with automatic offset-based pagination.
 *
 * @param propertyName - The response property containing the array of items
 *                       e.g. 'data', 'results', 'items', 'records'
 */
export async function __serviceName__ApiRequestAllItems(
	this: Context,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];

	let responseData: IDataObject;
	qs.limit = 100;
	qs.offset = 0;

	do {
		responseData = (await __serviceName__ApiRequest.call(
			this,
			method,
			endpoint,
			body,
			qs,
		)) as IDataObject;

		const items = responseData[propertyName] as IDataObject[];
		returnData.push(...items);

		qs.offset = (qs.offset as number) + (qs.limit as number);
	} while (
		(responseData[propertyName] as IDataObject[]).length === qs.limit
	);

	return returnData;
}

/**
 * Alternative: Cursor-based pagination.
 * Use this when the API uses cursor/next_page_token style pagination.
 */
export async function __serviceName__ApiRequestAllItemsCursor(
	this: Context,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let cursor: string | undefined;

	do {
		if (cursor) {
			qs.cursor = cursor;
		}

		const responseData = (await __serviceName__ApiRequest.call(
			this,
			method,
			endpoint,
			body,
			qs,
		)) as IDataObject;

		const items = responseData[propertyName] as IDataObject[];
		returnData.push(...items);

		cursor = responseData.next_cursor as string | undefined;
	} while (cursor);

	return returnData;
}

/**
 * Alternative: Page-number pagination.
 * Use when API uses page=1&per_page=100 style.
 */
export async function __serviceName__ApiRequestAllItemsPages(
	this: Context,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	const perPage = 100;
	let page = 1;

	qs.per_page = perPage;

	let items: IDataObject[];
	do {
		qs.page = page;

		const responseData = (await __serviceName__ApiRequest.call(
			this,
			method,
			endpoint,
			body,
			qs,
		)) as IDataObject;

		items = responseData[propertyName] as IDataObject[];
		returnData.push(...items);

		page++;
	} while (items.length === perPage);

	return returnData;
}
