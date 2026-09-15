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

/** Every ancestor's route segment plus this one's own, joined with `/`. Index segments (empty route) contribute nothing. */
export function joinRouteSegments(ancestors: Page[], ownRoute: string): string {
	return [...ancestors.map((p) => p.route), ownRoute].filter(Boolean).join('/');
}

/**
 * The full served URL for a page: the app's namespace plus every ancestor's
 * route segment plus this page's own route, joined with `/`. Index pages
 * (empty route) contribute no segment of their own.
 */
export function getPageUrl(namespace: string, ancestors: Page[], ownRoute: string): string {
	const path = ['apps', namespace, joinRouteSegments(ancestors, ownRoute)]
		.filter(Boolean)
		.join('/');
	return `${window.location.origin}/${path}`;
}

/** `page`'s full path within the app — every ancestor's route plus its own, joined with `/`. */
export function getFullRoutePath(pages: Page[], page: Page): string {
	return joinRouteSegments(getAncestorPages(pages, page.id), page.route);
}

/** How many pages have each parent (keyed by parentPageId, null for root pages). */
export function getChildCounts(pages: Page[]): Map<string | null, number> {
	const counts = new Map<string | null, number>();
	for (const page of pages) {
		counts.set(page.parentPageId, (counts.get(page.parentPageId) ?? 0) + 1);
	}
	return counts;
}

/** How many levels of the tree a Pages list shows inline before requiring a click into a page. */
export const MAX_INLINE_PAGE_LEVELS = 3;

type PageRow = { page: Page; indent: number };

/**
 * `parentId`'s descendants, depth-first, up to `maxLevels` deep — each row
 * carries how many levels below `parentId` it sits, for indenting. A page
 * beyond `maxLevels` (and everything under it) is left out; drilling into
 * its own PageView is how a user reaches it, same as any page never shown
 * inline here.
 */
export function buildPageRows(
	pages: Page[],
	parentId: string | null,
	maxLevels: number = MAX_INLINE_PAGE_LEVELS,
): PageRow[] {
	const rows: PageRow[] = [];
	const walk = (currentParentId: string | null, indent: number) => {
		if (indent >= maxLevels) return;
		for (const page of pages) {
			if (page.parentPageId !== currentParentId) continue;
			rows.push({ page, indent });
			walk(page.id, indent + 1);
		}
	};
	walk(parentId, 0);
	return rows;
}

/** "foo" -> "foo"; "" -> "(index)" — no leading slash, for breadcrumb items. */
export function formatRouteSegment(route: string, indexLabel: string): string {
	return route || `(${indexLabel})`;
}

/** "foo" -> "/foo"; "" -> "/ (index)" — with leading slash, for titles and labels. */
export function formatRoutePath(route: string, indexLabel: string): string {
	return route ? `/${route}` : `/ (${indexLabel})`;
}
