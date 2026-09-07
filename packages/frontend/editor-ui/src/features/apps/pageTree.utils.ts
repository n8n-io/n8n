import type { Page } from '@/features/apps/apps.types';

/** Ancestors of `pageId`, root-first, excluding the page itself. */
export function getAncestorPages(pages: Page[], pageId: string): Page[] {
	const byId = new Map(pages.map((page) => [page.id, page]));
	const ancestors: Page[] = [];
	let parentId = byId.get(pageId)?.parentPageId ?? null;
	while (parentId) {
		const parent = byId.get(parentId);
		if (!parent) break;
		ancestors.unshift(parent);
		parentId = parent.parentPageId;
	}
	return ancestors;
}

/**
 * The full served URL for a page: the app's namespace plus every ancestor's
 * route segment plus this page's own route, joined with `/`. Index pages
 * (empty route) contribute no segment of their own.
 */
export function getPageUrl(namespace: string, ancestors: Page[], ownRoute: string): string {
	const segments = [...ancestors.map((p) => p.route), ownRoute].filter(Boolean);
	const path = ['apps', namespace, ...segments].join('/');
	return `${window.location.origin}/${path}`;
}

/** How many pages have each parent (keyed by parentPageId, null for root pages). */
export function getChildCounts(pages: Page[]): Map<string | null, number> {
	const counts = new Map<string | null, number>();
	for (const page of pages) {
		counts.set(page.parentPageId, (counts.get(page.parentPageId) ?? 0) + 1);
	}
	return counts;
}

/** "foo" -> "foo"; "" -> "(index)" — no leading slash, for breadcrumb items. */
export function formatRouteSegment(route: string, indexLabel: string): string {
	return route || `(${indexLabel})`;
}

/** "foo" -> "/foo"; "" -> "/ (index)" — with leading slash, for titles and labels. */
export function formatRoutePath(route: string, indexLabel: string): string {
	return route ? `/${route}` : `/ (${indexLabel})`;
}
