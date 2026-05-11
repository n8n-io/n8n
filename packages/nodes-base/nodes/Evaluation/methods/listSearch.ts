import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { tableSearch } from '../../DataTable/common/methods';

export * from './../../Google/Sheet/v2/methods/listSearch';

export async function dataTableSearch(
	this: ILoadOptionsFunctions,
	filterString?: string,
	prevPaginationToken?: string,
): Promise<INodeListSearchResult> {
	return await tableSearch.call(this, filterString, prevPaginationToken);
}
