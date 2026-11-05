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

export async function langfuseDatasetSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const needle = filter?.toLowerCase();
	let page = paginationToken ? parseInt(paginationToken, 10) : 1;
	let results: INodeListSearchResult['results'] = [];
	let hasMore = false;

	do {
		const response = (await langfuseApiRequest.call(this, 'GET', '/v2/datasets', {
			page,
			limit: LANGFUSE_PAGE_SIZE,
		})) as LangfusePage<LangfuseDataset>;

		results = (response.data ?? [])
			.filter((dataset) => !needle || dataset.name.toLowerCase().includes(needle))
			.map((dataset) => ({ name: dataset.name, value: dataset.name }));

		hasMore = page < (response.meta?.totalPages ?? page);
		page++;
	} while (results.length === 0 && hasMore);

	return { results, paginationToken: hasMore ? String(page) : undefined };
}
