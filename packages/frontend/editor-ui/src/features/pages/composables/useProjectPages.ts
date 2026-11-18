import type { PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';

/**
 * Lists the pages of a project, newest first.
 * The list is empty until `load` resolves. A failed load keeps the last list and sets `hasFailed`.
 */
export function useProjectPages(projectId: MaybeRefOrGetter<string | undefined>) {
	const pageStore = usePageStore();
	const isLoading = ref(false);
	const hasFailed = ref(false);

	const pages = computed<PageSummary[]>(() => {
		const id = toValue(projectId);
		return id === undefined ? [] : pageStore.pagesOf(id);
	});

	async function load(): Promise<void> {
		const id = toValue(projectId);
		if (id !== undefined) {
			isLoading.value = !pageStore.isListLoaded(id);
			hasFailed.value = false;
			try {
				await pageStore.fetchPages(id);
			} catch {
				hasFailed.value = true;
			} finally {
				isLoading.value = false;
			}
		}
	}

	return { pages, isLoading, hasFailed, load };
}
