import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { extractNextCursor, resolveSpaceKey } from '../actions/common';
import { confluenceApiRequest } from '../transport';

const SEARCH_PAGE_SIZE = 50;
const MAX_FILTERED_SEARCH_PAGES = 10;

export async function searchSpaces(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const filterLower = (filter ?? '').trim().toLowerCase();
	const results: INodeListSearchItems[] = [];
	let cursor = paginationToken;

	// No server-side text filter on the v2 spaces list; fetch ahead so matches
	// beyond the first page stay discoverable
	for (let fetched = 0; fetched < MAX_FILTERED_SEARCH_PAGES; fetched++) {
		const qs: IDataObject = { limit: SEARCH_PAGE_SIZE, sort: 'name', status: 'current' };
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(this, 'GET', '/wiki/api/v2/spaces', {}, qs);
		const entries = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];

		for (const space of entries) {
			if (typeof space.id !== 'string' && typeof space.id !== 'number') continue;
			if (typeof space.name !== 'string') continue;
			if (filterLower !== '' && !space.name.toLowerCase().includes(filterLower)) continue;
			const key = typeof space.key === 'string' && space.key !== '' ? ` (${space.key})` : '';
			results.push({ name: `${space.name}${key}`, value: String(space.id) });
		}

		cursor = extractNextCursor(response);
		if (cursor === undefined || filterLower === '' || results.length > 0) break;
	}

	return { results, paginationToken: cursor };
}

export async function searchSpacesWithAll(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const search = await searchSpaces.call(this, filter, paginationToken);
	if (paginationToken === undefined && (filter ?? '').trim() === '') {
		search.results.unshift({ name: 'All Spaces', value: '' });
	}
	return search;
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
		spaceId = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
	} catch {
		spaceId = '';
	}
	let spaceClause = '';
	if (spaceId !== '') {
		// CQL's space field matches by key, so the selected space ID is resolved first
		const spaceKey = await resolveSpaceKey.call(this, spaceId);
		if (spaceKey !== undefined) spaceClause = ` AND space = "${spaceKey}"`;
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

	const results: INodeListSearchItems[] = [];
	for (const entry of entries) {
		const content = entry.content as IDataObject | undefined;
		if (content === undefined) continue;
		if (typeof content.id !== 'string' && typeof content.id !== 'number') continue;
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
		results.push({ name: `${title}${space}`, value: id, url });
	}

	const next = typeof links?.next === 'string' && links.next !== '' ? links.next : undefined;
	if (next === undefined) return { results, paginationToken: undefined };

	let nextStart: string | null = null;
	try {
		nextStart = new URL(next, 'https://api.atlassian.com').searchParams.get('start');
	} catch {
		nextStart = null;
	}
	// A page can come back empty while next is still set; never repeat the same offset
	return { results, paginationToken: nextStart ?? String(start + Math.max(entries.length, 1)) };
}
