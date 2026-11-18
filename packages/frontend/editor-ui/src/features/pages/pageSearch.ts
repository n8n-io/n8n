import type { PageSummary } from '@n8n/api-types';

/** Keeps the pages whose title holds the search text. Case and outer whitespace do not count. */
export function filterPagesByTitle(pages: PageSummary[], search: string): PageSummary[] {
	const needle = search.trim().toLowerCase();
	return pages.filter(({ title }) => title.toLowerCase().includes(needle));
}

/** Sorts pages from the newest update to the oldest. */
export function byNewestUpdate(a: PageSummary, b: PageSummary): number {
	return b.updatedAt.localeCompare(a.updatedAt);
}
