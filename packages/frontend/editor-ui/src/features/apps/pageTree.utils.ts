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
 * A page's path within its App: every ancestor's route segment plus its own,
 * joined with `/`. Index pages (empty route) contribute no segment of their
 * own. Segments may be literal (`clients`) or dynamic (`:id`, stored as-is).
 */
export function getPagePath(ancestors: Page[], ownRoute: string): string {
	return [...ancestors.map((p) => p.route), ownRoute].filter(Boolean).join('/');
}

/** The full served URL for a page: the app's namespace plus its path. */
export function getPageUrl(namespace: string, ancestors: Page[], ownRoute: string): string {
	const path = ['apps', namespace, getPagePath(ancestors, ownRoute)].filter(Boolean).join('/');
	return `${window.location.origin}/${path}`;
}

/**
 * The page a served pathname (`/apps/<namespace>/<segments>`) points at, or null.
 * A trailing slash is ignored; pages with a dynamic segment never match.
 */
export function findPageIdByPath(
	pages: Page[],
	namespace: string,
	pathname: string,
): string | null {
	const wanted = pathname.replace(/\/+$/, '');
	const match = pages.find((page) => {
		const path = getPagePath(getAncestorPages(pages, page.id), page.route);
		if (getDynamicParamNames(path).length > 0) return false;
		return ['/apps', namespace, path].filter(Boolean).join('/') === wanted;
	});
	return match?.id ?? null;
}

/** Names of the dynamic (`:name`) segments in a page path, in order. */
export function getDynamicParamNames(path: string): string[] {
	return path
		.split('/')
		.filter((segment) => segment.startsWith(':'))
		.map((segment) => segment.slice(1));
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

export interface PageTreeRow {
	page: Page;
	depth: number;
}

/** The page tree as a depth-first list, siblings sorted by route, the way the served menu orders them. */
export function flattenPageTree(pages: Page[]): PageTreeRow[] {
	const byParent = new Map<string | null, Page[]>();
	for (const page of pages) {
		byParent.set(page.parentPageId, [...(byParent.get(page.parentPageId) ?? []), page]);
	}
	const rows: PageTreeRow[] = [];
	const visit = (parentId: string | null, depth: number) => {
		const siblings = [...(byParent.get(parentId) ?? [])].sort((a, b) =>
			a.route.localeCompare(b.route),
		);
		for (const page of siblings) {
			rows.push({ page, depth });
			visit(page.id, depth + 1);
		}
	};
	visit(null, 0);
	return rows;
}

/** Select options for every page, labelled with its full path. */
export function getPageOptions(pages: Page[], indexLabel: string) {
	return flattenPageTree(pages).map(({ page }) => {
		const path = getPagePath(getAncestorPages(pages, page.id), page.route);
		return { value: page.id, label: path ? `/${path}` : `/ (${indexLabel})` };
	});
}
