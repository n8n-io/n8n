import get from 'lodash/get';

import type { IHttpRequestOptions, IDataObject } from 'n8n-workflow';

import type { PaginationOptions, RequestExecutor } from '../types';

/**
 * Offset/token-based pagination (Airtable pattern).
 *
 * The API returns an opaque offset token in the response body.
 * We pass it back as a query parameter on the next request.
 */
export async function paginateOffset<T>(
	baseOptions: IHttpRequestOptions,
	paginationOpts: PaginationOptions,
	execute: RequestExecutor,
): Promise<T[]> {
	const {
		itemsPath,
		pageSize = 100,
		maxPages = 1000,
		offsetResponsePath = 'offset',
		offsetQueryParam = 'offset',
		pageSizeParam = 'pageSize',
	} = paginationOpts;

	const results: T[] = [];
	let offsetToken: string | undefined;
	let page = 0;

	do {
		const options: IHttpRequestOptions = {
			...baseOptions,
			qs: {
				...(baseOptions.qs as IDataObject),
				[pageSizeParam]: pageSize,
				...(offsetToken !== undefined ? { [offsetQueryParam]: offsetToken } : {}),
			},
		};

		const response = await execute(options);

		const items = (itemsPath ? get(response, itemsPath) : response) as T[] | undefined;
		if (!items?.length) break;

		results.push(...items);
		offsetToken = get(response, offsetResponsePath) as string | undefined;
		page++;
	} while (offsetToken !== undefined && page < maxPages);

	return results;
}
