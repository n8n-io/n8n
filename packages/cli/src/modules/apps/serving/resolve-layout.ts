import type { AppLayout } from '@n8n/api-types';

/** The fields of a Page that layout resolution needs; draft and snapshot pages both carry them. */
export type LayoutPageNode = {
	id: string;
	route: string;
	parentPageId: string | null;
	layout: AppLayout | null;
};

export type ResolvedLayout = {
	blocks: AppLayout;
	/** The page that defines the layout: its own id, the nearest ancestor's, or the app's index page. */
	ownerPageId: string;
};

const isAppIndexPage = (page: LayoutPageNode) => page.route === '' && page.parentPageId === null;

/**
 * The layout a page renders in: its own when it has one, else the nearest
 * ancestor's, else the app's index page's — the index page has no children,
 * so its layout is the App-wide default. Null when none of them defines one,
 * which means the built-in shell.
 */
export function resolveLayout(pages: LayoutPageNode[], pageId: string): ResolvedLayout | null {
	const byId = new Map(pages.map((page) => [page.id, page]));
	if (!byId.has(pageId)) return null;
	const visited = new Set<string>();

	let current = byId.get(pageId);
	while (current && !visited.has(current.id)) {
		if (current.layout) return { blocks: current.layout, ownerPageId: current.id };
		visited.add(current.id);
		current = current.parentPageId ? byId.get(current.parentPageId) : undefined;
	}

	const index = pages.find(isAppIndexPage);
	return index?.layout ? { blocks: index.layout, ownerPageId: index.id } : null;
}
