import { PAGE_SHORT_LINK_VIEW } from '@n8n/frontend-module-page';
import type { RouteLocationRaw } from 'vue-router';

/** Builds the route that opens a page by its short, stable address. */
export function toPageRoute(pageId: string): RouteLocationRaw {
	return { name: PAGE_SHORT_LINK_VIEW, params: { pageId } };
}
