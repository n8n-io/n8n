import type { IHttpRequestOptions, IDataObject } from 'n8n-workflow';

import type { FullResponse, PaginationOptions, RequestExecutor } from '../types';

/**
 * Link-header pagination (GitHub/GitLab pattern).
 *
 * Uses the `Link` response header with `rel="next"` to determine
 * if more pages exist. Requires `returnFullResponse: true`.
 */
export async function paginateLinkHeader<T>(
	baseOptions: IHttpRequestOptions,
	paginationOpts: PaginationOptions,
	execute: RequestExecutor,
): Promise<T[]> {
	const { pageSize = 100, maxPages = 1000, perPageParam = 'per_page' } = paginationOpts;

	const results: T[] = [];
	let page = 1;

	do {
		const options: IHttpRequestOptions = {
			...baseOptions,
			qs: {
				...(baseOptions.qs as IDataObject),
				[perPageParam]: pageSize,
				page,
			},
			returnFullResponse: true,
		};

		const response = await execute<FullResponse<T[]>>(options);

		if (Array.isArray(response.body)) {
			results.push(...response.body);
		}

		const linkHeader = response.headers?.link ?? response.headers?.Link;
		if (!linkHeader?.includes('rel="next"')) break;

		page++;
	} while (page <= maxPages);

	return results;
}
