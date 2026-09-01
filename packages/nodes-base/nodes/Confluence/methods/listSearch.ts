import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { fetchAtlassianAccessibleResources } from '@utils/atlassian';

import { extractNextCursor, resolveSpaceKey } from '../actions/common';
import { CONFLUENCE_CREDENTIAL_NAME, confluenceApiRequest } from '../transport';

interface SearchPage {
	entries: IDataObject[];
	base: string;
	next?: string;
}

const SEARCH_PAGE_SIZE = 50;
const MAX_FILTERED_SEARCH_PAGES = 10;
const EMPTY_PAGE: SearchPage = { entries: [], base: '' };

/**
 * Shared list search over the v2 cursor-paginated lists that have no
 * server-side text filter (spaces, labels): the typed text is matched
 * client-side against `name`, fetching ahead so matches beyond the first
 * page stay discoverable.
 */
async function searchByName(
	this: ILoadOptionsFunctions,
	endpoint: string,
	baseQs: IDataObject,
	toDisplayName: (name: string, entry: IDataObject) => string,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const filterLower = (filter ?? '').trim().toLowerCase();
	const results: INodeListSearchItems[] = [];
	let cursor = paginationToken;

	for (let fetched = 0; fetched < MAX_FILTERED_SEARCH_PAGES; fetched++) {
		const qs: IDataObject = { ...baseQs, limit: SEARCH_PAGE_SIZE };
		if (cursor !== undefined) qs.cursor = cursor;

		const response = await confluenceApiRequest.call(this, 'GET', endpoint, {}, qs);
		const entries = Array.isArray(response.results) ? (response.results as IDataObject[]) : [];

		let lastName: string | undefined;
		let exactFound = false;
		for (const entry of entries) {
			if (typeof entry.name !== 'string') continue;
			lastName = entry.name.toLowerCase();
			if (typeof entry.id !== 'string' && typeof entry.id !== 'number') continue;
			if (filterLower !== '' && !lastName.includes(filterLower)) continue;
			if (lastName === filterLower) exactFound = true;
			results.push({ name: toDisplayName(entry.name, entry), value: String(entry.id) });
		}

		cursor = extractNextCursor(response);
		if (cursor === undefined || filterLower === '' || exactFound) break;
		// The list is name-sorted: don't stop on partial matches while an exact match may still lie ahead
		const exactMayLieAhead = lastName !== undefined && lastName < filterLower;
		if (results.length > 0 && !exactMayLieAhead) break;
	}

	return { results, paginationToken: cursor };
}

/**
 * Lists the sites the OAuth2 connection can reach; the item value is the
 * cloudId itself, so the selection needs no resolution at execute time.
 */
export async function getSites(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterLower = (filter ?? '').trim().toLowerCase();

	// Filtering is local and the first load sends none, so refreshing only then
	// picks up newly granted sites without a request per keystroke
	const resources = await fetchAtlassianAccessibleResources.call(this, CONFLUENCE_CREDENTIAL_NAME, {
		bypassCache: filterLower === '',
	});

	const results = resources
		.filter((site) => typeof site?.id === 'string' && site.id !== '')
		.map((site) => {
			const url = typeof site.url === 'string' && site.url !== '' ? site.url : undefined;
			const name = typeof site.name === 'string' && site.name !== '' ? site.name : (url ?? site.id);
			return { name, value: site.id, url };
		})
		.filter(
			(item) =>
				filterLower === '' ||
				item.name.toLowerCase().includes(filterLower) ||
				(item.url ?? '').toLowerCase().includes(filterLower),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	return { results };
}

export async function searchSpaces(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName.call(
		this,
		'/wiki/api/v2/spaces',
		{ sort: 'name', status: 'current' },
		(name, space) => {
			const key = typeof space.key === 'string' && space.key !== '' ? ` (${space.key})` : '';
			return `${name}${key}`;
		},
		filter,
		paginationToken,
	);
}

export async function getLabels(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByName.call(
		this,
		'/wiki/api/v2/labels',
		{ sort: 'name' },
		(name, label) => {
			// Non-global labels (my/team/system) share names with global ones; the prefix disambiguates
			const prefix =
				typeof label.prefix === 'string' && label.prefix !== '' && label.prefix !== 'global'
					? ` (${label.prefix})`
					: '';
			return `${name}${prefix}`;
		},
		filter,
		paginationToken,
	);
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

async function fetchSearchPage(
	this: ILoadOptionsFunctions,
	cql: string,
	start?: number,
): Promise<SearchPage> {
	const qs: IDataObject = { cql, limit: SEARCH_PAGE_SIZE };
	if (start !== undefined) qs.start = start;

	const response = await confluenceApiRequest.call(this, 'GET', '/wiki/rest/api/search', {}, qs);
	const links = response._links as IDataObject | undefined;
	return {
		entries: Array.isArray(response.results) ? (response.results as IDataObject[]) : [],
		base: typeof links?.base === 'string' ? links.base : '',
		next: typeof links?.next === 'string' && links.next !== '' ? links.next : undefined,
	};
}

function toPageItems(
	entries: IDataObject[],
	base: string,
	withSpaceLabel: boolean,
): INodeListSearchItems[] {
	const results: INodeListSearchItems[] = [];
	const seenIds = new Set<string>();
	for (const entry of entries) {
		const content = entry.content as IDataObject | undefined;
		if (content === undefined) continue;
		if (typeof content.id !== 'string' && typeof content.id !== 'number') continue;
		const id = String(content.id);
		if (seenIds.has(id)) continue;
		seenIds.add(id);
		const title = typeof content.title === 'string' && content.title !== '' ? content.title : id;
		// The space name disambiguates same-titled pages; redundant once scoped to one space
		const container = entry.resultGlobalContainer as IDataObject | undefined;
		const space =
			withSpaceLabel && typeof container?.title === 'string' && container.title !== ''
				? ` (${container.title})`
				: '';
		const webui = (content._links as IDataObject | undefined)?.webui;
		const url = base !== '' && typeof webui === 'string' ? `${base}${webui}` : undefined;
		results.push({ name: `${title}${space}`, value: id, url });
	}
	return results;
}

function nextStartToken(
	next: string | undefined,
	start: number,
	count: number,
): string | undefined {
	if (next === undefined) return undefined;
	let parsed: string | null = null;
	try {
		parsed = new URL(next, 'https://api.atlassian.com').searchParams.get('start');
	} catch {
		parsed = null;
	}
	// A page can come back empty while next is still set; never repeat the same offset
	return parsed ?? String(start + Math.max(count, 1));
}

function getScopedSpaceId(this: ILoadOptionsFunctions): string {
	try {
		const raw = this.getCurrentNodeParameter('space', { extractValue: true });
		return typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
	} catch {
		return '';
	}
}

export async function getPages(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const start = paginationToken === undefined ? 0 : Number(paginationToken);
	const spaceId = getScopedSpaceId.call(this);

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

	// Exact-title pages can be buried behind newer prefix matches, so page one
	// fetches them separately; toPageItems drops the overlap
	const exact =
		escaped !== '' && paginationToken === undefined
			? await fetchSearchPage.call(this, `type=page${spaceClause} AND title = "${escaped}"`)
			: EMPTY_PAGE;

	const page = await fetchSearchPage.call(this, cql, start);

	return {
		results: toPageItems(
			[...exact.entries, ...page.entries],
			page.base || exact.base,
			spaceId === '',
		),
		paginationToken: nextStartToken(page.next, start, page.entries.length),
	};
}
