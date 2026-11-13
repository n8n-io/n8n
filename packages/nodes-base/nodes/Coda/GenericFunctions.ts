import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import {
	NodeApiError,
	NodeOperationError,
	decodePathValue,
	requestPath,
	requestUrl,
} from 'n8n-workflow';

export const toPathValue = (version: number, value: string) =>
	version < 1.2 ? decodePathValue(value) : value;

export const currentPathParam = (context: ILoadOptionsFunctions, name: string) =>
	toPathValue(context.getNode().typeVersion, context.getCurrentNodeParameter(name) as string);

export async function codaApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('codaApi');

	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
		},
		method,
		qs,
		body,
		uri: requestUrl`https://coda.io/apis/v1${resource}`,
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

const API_PATH_PREFIX = '/apis/v1/';

const searchParamsToQuery = (searchParams: URLSearchParams) => {
	const qs: IDataObject = {};
	for (const key of new Set(searchParams.keys())) {
		const values = searchParams.getAll(key);
		qs[key] = values.length > 1 ? values : values[0];
	}
	return qs;
};

function parseNextPageLink(context: IExecuteFunctions | ILoadOptionsFunctions, link: string) {
	try {
		const url = new URL(link);
		if (!url.pathname.startsWith(API_PATH_PREFIX)) throw new Error('Unexpected path');
		const segments = url.pathname.slice(API_PATH_PREFIX.length).split('/').map(decodeURIComponent);
		return {
			resource: segments.reduce((path, segment) => requestPath`${path}/${segment}`, requestPath``),
			qs: searchParamsToQuery(url.searchParams),
		};
	} catch {
		throw new NodeOperationError(context.getNode(), 'Unexpected next page link');
	}
}

/**
 * Make an API request to paginated coda endpoint
 * and return all results
 */
export async function codaApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query.limit = 100;

	let next: { resource: RequestPath; qs: IDataObject } | undefined = { resource, qs: query };

	do {
		responseData = await codaApiRequest.call(this, method, next.resource, body, next.qs);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		next = responseData.nextPageLink
			? parseNextPageLink(this, responseData.nextPageLink as string)
			: undefined;
	} while (next);

	return returnData;
}
