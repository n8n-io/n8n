import { childrenIn } from './document';
import { getComponentDef } from '../kit';
import type { UiNode, UiPageInfo, UiRoute } from './types';

/**
 * Pages, and the routing that picks one.
 *
 * An app is one page until it holds a shell. The shell owns a region whose
 * children are pages, of which exactly one renders; everything in its other
 * regions stays on screen while the content swaps. Pages are ordinary nodes in
 * an ordinary region, so the outline shows them and the inspector edits them.
 */

/**
 * The app's own corner of state, which every action posts along with the rest.
 * Route parameters therefore reach a workflow with nothing wired: a page at
 * `/orders/:id` gives `$json.body.$app.route.params.id`.
 *
 * Client-owned: a response trying to write it is refused, and so is a `model`
 * prop pointing into it. The `$` marks it reserved, matching `$state` and
 * `$loading` in the expression scope.
 */
export const APP_STATE_KEY = '$app';

/** The shell, if the document has one. The first found wins; see `nested shells` in the spec. */
export function findPagedNode(root: UiNode): UiNode | undefined {
	if (getComponentDef(root.type)?.pagedRegion) return root;

	for (const children of Object.values(root.tree)) {
		for (const child of children) {
			const found = findPagedNode(child);
			if (found) return found;
		}
	}

	return undefined;
}

/** The page nodes a shell holds, in document order. */
export function pageNodes(shell: UiNode): UiNode[] {
	const region = getComponentDef(shell.type)?.pagedRegion;
	if (!region) return [];

	return childrenIn(shell, region).filter((child) => child.type === 'page');
}

/**
 * `title` is kept as the author wrote it, empty included: the tab reads as the
 * app's name alone for an untitled page, and inventing a title here would give
 * it a dangling separator instead.
 */
export function pageInfos(shell: UiNode): UiPageInfo[] {
	return pageNodes(shell).map((node) => ({
		id: node.id,
		path: normalisePath(String(node.props.path ?? '')),
		title: String(node.props.title ?? ''),
	}));
}

/** What to call a page on screen. Its path is a better fallback than its id. */
export function pageLabel(page: UiPageInfo): string {
	return page.title || page.path;
}

/** Always one leading slash and no trailing one, so `orders`, `/orders` and `/orders/` are one page. */
export function normalisePath(path: string): string {
	const trimmed = path.trim().replace(/\/+$/, '');
	if (!trimmed) return '/';
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** The route the browser is on. Hash-based, because the app is served from one webhook path. */
export function routeFromHash(hash: string): string {
	return normalisePath(hash.replace(/^#/, ''));
}

function segmentsOf(path: string): string[] {
	return path.split('/').filter(Boolean);
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Matches a path against one page's pattern, returning its `:params`.
 * `/orders/:id` against `/orders/42` gives `{ id: '42' }`; a mismatch gives
 * nothing, which is how the caller tells the two apart from an empty params.
 */
export function matchPath(pattern: string, path: string): Record<string, string> | undefined {
	const expected = segmentsOf(pattern);
	const actual = segmentsOf(path);

	if (expected.length !== actual.length) return undefined;

	const params: Record<string, string> = {};

	for (const [index, segment] of expected.entries()) {
		if (segment.startsWith(':')) {
			// A half-typed escape in the address bar should not take the app down
			// with it, so a value that will not decode is taken as written.
			params[segment.slice(1)] = safeDecode(actual[index]);
			continue;
		}

		if (segment !== actual[index]) return undefined;
	}

	return params;
}

/**
 * Which page a path lands on.
 *
 * An unknown route falls back to the default page and says so. Rendering
 * nothing would be more honest about the mistake, but a blank app with a
 * console warning is a worse place to leave someone than the page they were
 * probably after. An unset `defaultPage` falls back to document order, which
 * also warns: reordering pages should not quietly change where an app opens.
 */
export function resolveRoute(
	pages: UiPageInfo[],
	path: string,
	defaultPage?: string,
): UiRoute | undefined {
	if (pages.length === 0) return undefined;

	for (const page of pages) {
		const params = matchPath(page.path, path);
		if (params) return { path, params, pageId: page.id };
	}

	const preferred = defaultPage
		? pages.find((page) => page.path === normalisePath(defaultPage))
		: undefined;
	const fallback = preferred ?? pages[0];

	// A pattern cannot be landed on: `/orders/:id` as a fallback would render the
	// page with `:id` as the literal parameter, which is nobody's intention.
	if (fallback.path.includes('/:')) {
		console.warn('[ui-builder]', fallback.path, 'takes a parameter, so it cannot be a fallback');
	}

	if (path !== '/') {
		console.warn('[ui-builder] no page matches', path, '- falling back to', fallback.path);
	} else if (defaultPage && !preferred) {
		// A default naming a page that is no longer there is a different mistake
		// from never having picked one, and reporting the wrong one sends whoever
		// reads it looking in the wrong place.
		const missing = normalisePath(defaultPage);
		console.warn('[ui-builder] the default page', missing, 'is gone, opening', fallback.path);
	} else if (!preferred) {
		// An empty fragment landing on the default page is the ordinary case and
		// says nothing. Landing on the first page because nobody picked one is
		// worth a word, since document order then decides where the app opens.
		console.warn('[ui-builder] no default page set, opening', fallback.path);
	}

	return { path: fallback.path, params: {}, pageId: fallback.id };
}

/** Which page the renderer should show, given what the runtime worked out. */
export function currentPageId(shell: UiNode, route: UiRoute | undefined): string | undefined {
	const pages = pageInfos(shell);
	if (pages.length === 0) return undefined;

	if (route?.pageId && pages.some((page) => page.id === route.pageId)) return route.pageId;

	// No route, or one naming a page that has since gone: fall back the same way
	// the runtime would, so the canvas and the app agree.
	const fallbackPath = route?.path ?? String(shell.props.defaultPage ?? '');
	const matched = pages.find((page) => matchPath(page.path, normalisePath(fallbackPath)));

	return (matched ?? pages[0]).id;
}
