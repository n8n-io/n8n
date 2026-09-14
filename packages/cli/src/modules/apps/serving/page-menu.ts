import { isDynamicRoute, type PageNode } from './resolve-page-path';

export type MenuItem = {
	title: string;
	path: string;
	current: boolean;
	children: MenuItem[];
};

const INDEX_PAGE_TITLE = 'Home';

export const appBasePath = (namespace: string) => `/apps/${namespace}`;

/**
 * Segments are encoded because a `:param` segment carries a value from the URL,
 * which can hold anything a page id can hold — a space or a `#` would otherwise
 * produce a link that points somewhere else.
 */
export const pagePath = (namespace: string, segments: string[]) =>
	[appBasePath(namespace), ...segments.map(encodeURIComponent)].join('/');

/**
 * The segment a page contributes to a URL, with a `:param` route replaced by the
 * value the current request captured. Undefined when the request captured no
 * value for it, which makes the page — and everything under it — unlinkable
 * from here.
 */
const resolveSegment = (route: string, params: Record<string, string>): string | undefined => {
	if (!isDynamicRoute(route)) return route;
	const name = route.slice(1);
	return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : undefined;
};

/** An index page owns no segment of its own, so it is named after its role. */
const titleFor = (segment: string) => (segment === '' ? INDEX_PAGE_TITLE : segment);

/**
 * How a page is named: its title, else its route segment. Undefined when it has
 * no title and cannot be named from here.
 */
export const pageTitle = (
	page: Pick<PageNode, 'route' | 'title'>,
	params: Record<string, string>,
) => {
	if (page.title) return page.title;
	const segment = resolveSegment(page.route, params);
	return segment === undefined ? undefined : titleFor(segment);
};

/**
 * The pages of an App as a tree that mirrors the page tree, so a renderer can
 * nest them (dropdowns, collapsible sections) without rebuilding the hierarchy.
 * Pages behind an unresolved `:param` are left out, together with their
 * children, rather than rendered as a half-built link.
 */
export function buildMenu<T extends PageNode>(
	namespace: string,
	pages: T[],
	currentPageId: string,
	params: Record<string, string>,
): MenuItem[] {
	const childrenOf = new Map<string | null, T[]>();
	for (const page of pages) {
		const siblings = childrenOf.get(page.parentPageId) ?? [];
		siblings.push(page);
		childrenOf.set(page.parentPageId, siblings);
	}

	const walk = (parentPageId: string | null, parentSegments: string[]): MenuItem[] => {
		// Empty routes sort first, so an App's index page heads its own level.
		const children = [...(childrenOf.get(parentPageId) ?? [])].sort((a, b) =>
			a.route.localeCompare(b.route),
		);

		const items: MenuItem[] = [];

		for (const page of children) {
			const segment = resolveSegment(page.route, params);
			if (segment === undefined) continue;

			// An index page contributes no segment, so it shares its parent's path.
			const segments = segment === '' ? parentSegments : [...parentSegments, segment];

			items.push({
				title: page.title ?? titleFor(segment),
				path: pagePath(namespace, segments),
				current: page.id === currentPageId,
				children: walk(page.id, segments),
			});
		}

		return items;
	};

	return walk(null, []);
}
