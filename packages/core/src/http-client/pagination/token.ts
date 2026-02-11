import get from 'lodash/get';

import type { IHttpRequestOptions, IDataObject } from 'n8n-workflow';

import type { PaginationOptions, RequestExecutor } from '../types';

/**
 * Token-based pagination for GraphQL APIs (Linear pattern).
 *
 * Injects `first` and `after` into the GraphQL `variables` in the request body.
 * Reads `endCursor` and `hasNextPage` from the response to continue.
 */
export async function paginateToken<T>(
	baseOptions: IHttpRequestOptions,
	paginationOpts: PaginationOptions,
	execute: RequestExecutor,
): Promise<T[]> {
	const { itemsPath, pageSize = 50, maxPages = 1000, tokenPath, hasMorePath } = paginationOpts;

	if (!tokenPath || !hasMorePath) {
		throw new Error('Token pagination requires tokenPath and hasMorePath options');
	}

	const results: T[] = [];
	let after: string | null = null;
	let page = 0;

	do {
		const body = baseOptions.body as IDataObject | undefined;
		const variables = ((body?.variables as IDataObject) ?? {}) as IDataObject;

		const options: IHttpRequestOptions = {
			...baseOptions,
			body: {
				...(body ?? {}),
				variables: {
					...variables,
					first: pageSize,
					after,
				},
			},
		};

		const response = await execute(options);

		const items = (itemsPath ? get(response, itemsPath) : response) as T[] | undefined;
		if (items?.length) {
			results.push(...items);
		}

		after = get(response, tokenPath) as string | null;
		const hasMore = get(response, hasMorePath) as boolean;
		if (!hasMore) break;
		page++;
	} while (page < maxPages);

	return results;
}
