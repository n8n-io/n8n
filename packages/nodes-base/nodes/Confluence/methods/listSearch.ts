import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { confluenceApiRequest } from '../transport';

const SEARCH_PAGE_SIZE = 50;

/**
 * Populates the Page resource locator's From List mode. Word-prefix title
 * matching needs CQL, so this uses the v1 search endpoint — a v1 survivor
 * (ENT-125 framing) covered by the read:content-details:confluence scope.
 */
export async function getPages(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const start = paginationToken === undefined ? 0 : Number(paginationToken);
	const escaped = (filter ?? '').replace(/(["\\])/g, '\\$1');
	const cql =
		escaped === ''
			? 'type=page ORDER BY lastmodified DESC'
			: `type=page AND title ~ "${escaped}*" ORDER BY lastmodified DESC`;

	const response = await confluenceApiRequest.call(
		this,
		'GET',
		'/wiki/rest/api/search',
		{},
		{ cql, limit: SEARCH_PAGE_SIZE, start },
	);

	const links = response._links as IDataObject | undefined;
	const base = typeof links?.base === 'string' ? links.base : '';
	const entries = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];

	const results: INodeListSearchItems[] = [];
	for (const entry of entries) {
		const content = entry.content as IDataObject | undefined;
		if (content?.id === undefined) continue;
		const id = String(content.id);
		const title = typeof content.title === 'string' && content.title !== '' ? content.title : id;
		// Space name in the label disambiguates same-titled pages (ENT-304 design)
		const container = entry.resultGlobalContainer as IDataObject | undefined;
		const space =
			typeof container?.title === 'string' && container.title !== '' ? ` (${container.title})` : '';
		const webui = (content._links as IDataObject | undefined)?.webui;
		const url = base !== '' && typeof webui === 'string' ? `${base}${webui}` : undefined;
		results.push({ name: `${title}${space}`, value: id, url });
	}

	const hasMore = typeof links?.next === 'string' && links.next !== '';
	return { results, paginationToken: hasMore ? String(start + entries.length) : undefined };
}
