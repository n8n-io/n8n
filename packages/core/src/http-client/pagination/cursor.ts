import get from 'lodash/get';

import type { IHttpRequestOptions, IDataObject } from 'n8n-workflow';

import type { PaginationOptions, RequestExecutor } from '../types';

/**
 * Cursor-based pagination (Slack pattern).
 *
 * Each response includes a cursor pointing to the next page.
 * We pass it as a query parameter on subsequent requests.
 */
export async function paginateCursor<T>(
	baseOptions: IHttpRequestOptions,
	paginationOpts: PaginationOptions,
	execute: RequestExecutor,
): Promise<T[]> {
	const {
		itemsPath,
		pageSize = 100,
		maxPages = 1000,
		cursorPath = 'response_metadata.next_cursor',
		cursorQueryParam = 'cursor',
		limitParam = 'limit',
	} = paginationOpts;

	const results: T[] = [];
	let cursor: string | undefined;
	let page = 0;

	do {
		const qs: IDataObject = {
			...(baseOptions.qs as IDataObject),
			[limitParam]: pageSize,
		};
		if (cursor) {
			qs[cursorQueryParam] = cursor;
		}

		const options: IHttpRequestOptions = { ...baseOptions, qs };
		const response = await execute(options);

		const items = (itemsPath ? get(response, itemsPath) : response) as T[] | undefined;
		if (items?.length) {
			results.push(...items);
		}

		cursor = get(response, cursorPath) as string | undefined;
		if (!cursor) break;
		page++;
	} while (page < maxPages);

	return results;
}
