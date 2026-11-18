import type { PageBacklinks } from '@n8n/api-types';
import { shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { usePageStore } from '../page.store';

const NO_BACKLINKS: PageBacklinks = { pages: [], workflows: [] };

/**
 * Holds what links to the page with the given id.
 * The list is empty while the first answer for a page is not here, and after a failed request.
 * `refresh` keeps the current list until the new answer arrives.
 */
export function usePageBacklinks(pageId: MaybeRefOrGetter<string | undefined>) {
	const pageStore = usePageStore();
	const backlinks = shallowRef<PageBacklinks>(NO_BACKLINKS);

	/** Shows the answer only when the user is still on the page that it belongs to. */
	function showBacklinksOf(id: string, latest: PageBacklinks): void {
		if (toValue(pageId) === id) {
			backlinks.value = latest;
		}
	}

	async function fetchBacklinksOf(id: string): Promise<void> {
		try {
			showBacklinksOf(id, await pageStore.backlinksOf(id));
		} catch {
			showBacklinksOf(id, NO_BACKLINKS);
		}
	}

	async function refresh(): Promise<void> {
		const id = toValue(pageId);
		if (id !== undefined) {
			await fetchBacklinksOf(id);
		}
	}

	function showBacklinksOfNewPage(): void {
		backlinks.value = NO_BACKLINKS;
		void refresh();
	}

	watch(() => toValue(pageId), showBacklinksOfNewPage, { immediate: true });

	return { backlinks, refresh };
}
