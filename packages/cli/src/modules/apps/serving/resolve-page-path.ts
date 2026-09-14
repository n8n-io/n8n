/** The fields of a Page that path resolution needs. */
export type PageNode = {
	id: string;
	route: string;
	parentPageId: string | null;
	title?: string | null;
};

export type ResolvedPagePath<T extends PageNode> = {
	page: T;
	/** Values captured by the `:param` segments on the way down the tree. */
	params: Record<string, string>;
};

export const isDynamicRoute = (route: string) => route.startsWith(':');

const paramName = (route: string) => route.slice(1);

/**
 * A segment the browser can send but no page can own. `.` and `..` never reach a
 * well-behaved client, so a request carrying one is rejected rather than walked.
 */
const isUnusableSegment = (segment: string) =>
	segment === '' || segment === '.' || segment === '..' || segment.includes('/');

/**
 * Resolves a request path to one page of an App.
 *
 * Each page owns exactly one path segment, so resolution walks the tree one
 * segment at a time. A static route wins over a `:param` route on the same
 * level, so `/clients/new` reaches the `new` page even when a `:id` sibling
 * would also match.
 *
 * An empty path resolves to the App's index page — the top-level page whose
 * route is empty. Index pages own no segment, so they are never reachable any
 * other way.
 */
export function resolvePagePath<T extends PageNode>(
	pages: T[],
	segments: string[],
): ResolvedPagePath<T> | undefined {
	if (segments.some(isUnusableSegment)) return undefined;

	const childrenOf = new Map<string | null, T[]>();
	for (const page of pages) {
		const siblings = childrenOf.get(page.parentPageId) ?? [];
		siblings.push(page);
		childrenOf.set(page.parentPageId, siblings);
	}

	if (segments.length === 0) {
		const indexPage = (childrenOf.get(null) ?? []).find((page) => page.route === '');
		return indexPage ? { page: indexPage, params: {} } : undefined;
	}

	const params: Record<string, string> = {};
	let current: T | undefined;

	for (const segment of segments) {
		const candidates = childrenOf.get(current?.id ?? null) ?? [];
		const match =
			candidates.find((page) => page.route === segment) ??
			// Sorted so two dynamic siblings (`:id` and `:slug`) always resolve the
			// same way instead of following row order.
			candidates
				.filter((page) => isDynamicRoute(page.route))
				.sort((a, b) => a.route.localeCompare(b.route))[0];

		if (!match) return undefined;

		if (isDynamicRoute(match.route)) params[paramName(match.route)] = segment;
		current = match;
	}

	return current ? { page: current, params } : undefined;
}
