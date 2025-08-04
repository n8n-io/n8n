import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { facebookFormList, facebookPageList } from '../GenericFunctions';

const filterMatches = (name: string, filter?: string): boolean =>
	!filter || name?.toLowerCase().includes(filter.toLowerCase());

export async function pageList(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { data: pages, paging } = await facebookPageList.call(this, paginationToken);
	return {
		results: pages
			.filter((page) => filterMatches(page.name, filter))
			.map((page) => ({
				name: page.name,
				value: page.id,
				url: `https://facebook.com/${page.id}`,
			})),
		paginationToken: paging?.next ? paging?.cursors?.after : undefined,
	};
}

export async function formList(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const pageId = this.getNodeParameter('page', '', { extractValue: true }) as string;

	const { data: forms, paging } = await facebookFormList.call(this, pageId, paginationToken);
	return {
		results: forms
			.filter((form) => filterMatches(form.name, filter))
			.map((form) => ({
				name: form.name,
				value: form.id,
			})),
		paginationToken: paging?.next ? paging?.cursors?.after : undefined,
	};
}
