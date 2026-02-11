import type { IHttpRequestOptions } from 'n8n-workflow';

import type { PaginationOptions, RequestExecutor } from '../types';

import { paginateCursor } from './cursor';
import { paginateLinkHeader } from './link-header';
import { paginateOffset } from './offset';
import { paginateToken } from './token';

/**
 * Dispatches to the correct pagination strategy based on `options.strategy`.
 */
export async function paginate<T>(
	baseOptions: IHttpRequestOptions,
	paginationOpts: PaginationOptions,
	execute: RequestExecutor,
): Promise<T[]> {
	switch (paginationOpts.strategy) {
		case 'offset':
			return paginateOffset<T>(baseOptions, paginationOpts, execute);
		case 'cursor':
			return paginateCursor<T>(baseOptions, paginationOpts, execute);
		case 'link-header':
			return paginateLinkHeader<T>(baseOptions, paginationOpts, execute);
		case 'token':
			return paginateToken<T>(baseOptions, paginationOpts, execute);
	}
}
