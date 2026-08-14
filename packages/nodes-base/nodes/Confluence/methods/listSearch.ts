import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { extractNextCursor } from '../actions/common';
import { confluenceApiRequest } from '../transport';

const SEARCH_PAGE_SIZE = 50;

export async function searchSpaces(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const qs: IDataObject = { limit: SEARCH_PAGE_SIZE, sort: 'name', status: 'current' };
	if (paginationToken !== undefined) qs.cursor = paginationToken;

	const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/spaces', {}, qs);

	const entries = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];
	const filterLower = (filter ?? '').trim().toLowerCase();

	const results: INodeListSearchItems[] = entries
		.filter((space) => space.id !== undefined && typeof space.name === 'string')
		.filter((space) => filterLower === '' || String(space.name).toLowerCase().includes(filterLower))
		.map((space) => {
			const key = typeof space.key === 'string' && space.key !== '' ? ` (${space.key})` : '';
			return { name: `${String(space.name)}${key}`, value: String(space.id) };
		});

	return { results, paginationToken: extractNextCursor(response) };
}

export async function getPages(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const start = paginationToken === undefined ? 0 : Number(paginationToken);

	let spaceId = '';
	try {
		const raw = this.getCurrentNodeParameter('space', { extractValue: true });
		spaceId = raw === undefined || raw === null ? '' : String(raw).trim();
	} catch {
		spaceId = '';
	}
	let spaceClause = '';
	if (spaceId !== '') {
		// CQL's space field matches by key, so the selected space ID is resolved first
		const space = await confluenceApiRequest.call(
			this,
			'GET',
			`/wiki/api/v2/spaces/${encodeURIComponent(spaceId)}`,
		);
		if (typeof space.key === 'string' && space.key !== '') {
			spaceClause = ` AND space = "${space.key}"`;
		}
	}

	const escaped = (filter ?? '').replace(/(["\\])/g, '\\$1');
	const cql =
		escaped === ''
			? `type=page${spaceClause} ORDER BY lastmodified DESC`
			: `type=page${spaceClause} AND title ~ "${escaped}*" ORDER BY lastmodified DESC`;

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

	const results: INodeListSearchItems[] = entries
		.filter((entry) => (entry.content as IDataObject | undefined)?.id !== undefined)
		.map((entry) => {
			const content = entry.content as IDataObject;
			const id = String(content.id);
			const title = typeof content.title === 'string' && content.title !== '' ? content.title : id;
			// The space name disambiguates same-titled pages; redundant once scoped to one space
			const container = entry.resultGlobalContainer as IDataObject | undefined;
			const space =
				spaceId === '' && typeof container?.title === 'string' && container.title !== ''
					? ` (${container.title})`
					: '';
			const webui = (content._links as IDataObject | undefined)?.webui;
			const url = base !== '' && typeof webui === 'string' ? `${base}${webui}` : undefined;
			return { name: `${title}${space}`, value: id, url };
		});

	const hasMore = typeof links?.next === 'string' && links.next !== '';
	return { results, paginationToken: hasMore ? String(start + entries.length) : undefined };
}
