import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { tableSearch } from '../../DataTable/common/methods';
import { langfuseApiRequest, LANGFUSE_PAGE_SIZE } from '../utils/langfuse';
import type { LangfuseDataset, LangfusePage } from '../utils/langfuse';

export * from './../../Google/Sheet/v2/methods/listSearch';

export async function dataTableSearch(
	this: ILoadOptionsFunctions,
	filterString?: string,
	prevPaginationToken?: string,
): Promise<INodeListSearchResult> {
	return await tableSearch.call(this, filterString, prevPaginationToken);
}

const MAX_SEARCH_PAGES = 20;

export async function langfuseDatasetSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const needle = filter?.toLowerCase();
	const parsedToken = /^\d+$/.test(paginationToken ?? '') ? Number(paginationToken) : 0;
	let page = Number.isSafeInteger(parsedToken) && parsedToken > 0 ? parsedToken : 1;
	const results: INodeListSearchResult['results'] = [];
	let hasMore = false;
	let fetchedPages = 0;

	do {
		const response = (await langfuseApiRequest.call(this, 'GET', '/v2/datasets', {
			page,
			limit: LANGFUSE_PAGE_SIZE,
		})) as LangfusePage<LangfuseDataset>;

		const matches = (Array.isArray(response.data) ? response.data : [])
			.filter(
				(dataset) =>
					typeof dataset?.name === 'string' &&
					(!needle || dataset.name.toLowerCase().includes(needle)),
			)
			.map((dataset) => ({ name: dataset.name, value: dataset.name }));

		results.push(...matches);

		hasMore = page < (response.meta?.totalPages ?? page);
		page++;
		fetchedPages++;
	} while (hasMore && fetchedPages < MAX_SEARCH_PAGES && (needle || results.length === 0));

	return { results, paginationToken: !needle && hasMore ? String(page) : undefined };
}
