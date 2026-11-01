import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodePropertyOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { CalPaginatedApiResponse } from './helpers/interfaces';

/**
 * Cal.com pins every v2 endpoint group to its own `cal-api-version` date. A
 * missing or wrong value makes the API answer with an older response schema
 * instead of an error, so each request states its version explicitly.
 */
export const CAL_API_VERSION = {
	BOOKINGS_WRITE: '2026-02-25',
	BOOKINGS_LIST: '2026-05-01',
	EVENT_TYPES: '2024-06-14',
	SLOTS: '2024-09-04',
	SCHEDULES: '2024-06-11',
} as const;

export type CalApiVersion = (typeof CAL_API_VERSION)[keyof typeof CAL_API_VERSION];

/** `GET /v2/bookings` accepts at most 100 records for each page. */
const MAX_PAGE_SIZE = 100;

export async function calApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	query: IDataObject = {},
	option: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('calApi');
	let options: IHttpRequestOptions = {
		baseURL: credentials.host as string,
		method,
		body,
		qs: {
			...query,
			apiKey: credentials.apiKey,
		},
		url: resource,
	};

	options = Object.assign({}, options, option);
	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function calApiRequestV2<T>(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	option: Partial<IHttpRequestOptions> = {},
): Promise<T> {
	const credentials = await this.getCredentials('calApi');
	let options: IHttpRequestOptions = {
		baseURL: credentials.host as string,
		method,
		body,
		qs: query,
		url: `/v2${resource}`,
	};

	if (!Object.keys(query).length) {
		delete options.qs;
	}

	options = Object.assign({}, options, option);
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'calApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * The only place that builds the `cal-api-version` header. `calApiRequestV2`
 * merges its `option` argument with `Object.assign`, so a second caller that
 * passes `headers` would replace this header instead of adding to it.
 */
export async function calApiRequestV2Versioned<T>(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	apiVersion: CalApiVersion,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<T> {
	return await (calApiRequestV2<T>).call(this, method, resource, body, query, {
		headers: { 'cal-api-version': apiVersion },
	});
}

/**
 * Collects cursor-paginated records until `limit` is reached (pass `Infinity`
 * for Return All). A cursor the server repeats ends the loop, which would
 * otherwise never finish.
 */
export async function calApiRequestV2AllItems<T>(
	this: IExecuteFunctions,
	resource: string,
	apiVersion: CalApiVersion,
	query: IDataObject,
	limit: number,
): Promise<T[]> {
	const records: T[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;

	do {
		const pageQuery: IDataObject = {
			...query,
			limit: Math.min(limit - records.length, MAX_PAGE_SIZE),
		};
		if (cursor !== undefined) pageQuery.cursor = cursor;

		const response = await (calApiRequestV2Versioned<CalPaginatedApiResponse<T>>).call(
			this,
			'GET',
			resource,
			apiVersion,
			{},
			pageQuery,
		);

		if (Array.isArray(response.data)) {
			records.push(...response.data);
		}

		const nextCursor = response.pagination?.nextCursor;
		cursor =
			response.pagination?.hasMore === true &&
			typeof nextCursor === 'string' &&
			nextCursor !== '' &&
			!seenCursors.has(nextCursor)
				? nextCursor
				: undefined;
		if (cursor !== undefined) seenCursors.add(cursor);
	} while (cursor !== undefined && records.length < limit);

	return records.length > limit ? records.slice(0, limit) : records;
}

export function sortOptionParameters(
	optionParameters: INodePropertyOptions[],
): INodePropertyOptions[] {
	optionParameters.sort((a, b) => {
		const aName = a.name.toLowerCase();
		const bName = b.name.toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return optionParameters;
}
