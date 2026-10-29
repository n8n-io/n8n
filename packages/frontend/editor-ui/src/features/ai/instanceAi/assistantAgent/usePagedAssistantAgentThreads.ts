import type { SystemAgentThreadSummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { listSystemAgentThreads } from '@/features/agents/composables/useAgentApi';

import { ASSISTANT_AGENT_ID } from './assistantAgentThreads';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';

export type UsePagedAssistantAgentThreadsOptions = {
	/** Server-side title search. A change resets paging. */
	search?: MaybeRefOrGetter<string | undefined>;
	/** Gates `loadNext()`. Default true. */
	enabled?: MaybeRefOrGetter<boolean>;
	pageSize: number;
};

/** Cursor-paged, de-duplicated Assistant agent threads for the chat history. */
export function usePagedAssistantAgentThreads(options: UsePagedAssistantAgentThreadsOptions) {
	const rootStore = useRootStore();
	const threadsStore = useAssistantAgentThreadsStore();

	// Paging keys off the unfiltered list, so a deleted row never shifts the cursor.
	const rawItems = ref<SystemAgentThreadSummary[]>([]);
	const items = computed(() =>
		rawItems.value.filter((thread) => !threadsStore.deletedThreadIds.has(thread.id)),
	);
	const hasMore = ref(true);
	const isLoading = ref(false);
	const error = ref(false);

	let cursor: string | undefined;
	let requestVersion = 0;
	let inFlight = false;

	async function fetchPage(version: number): Promise<void> {
		if (inFlight) return;
		inFlight = true;
		isLoading.value = true;
		try {
			const result = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, {
				limit: options.pageSize,
				cursor,
				search: toValue(options.search),
			});
			if (version !== requestVersion) return;
			threadsStore.remember(result.data);
			const seenIds = new Set(rawItems.value.map((thread) => thread.id));
			rawItems.value = [
				...rawItems.value,
				...result.data.filter((thread) => !seenIds.has(thread.id)),
			];
			cursor = result.nextCursor ?? undefined;
			hasMore.value = result.nextCursor !== null;
			error.value = false;
		} catch {
			if (version !== requestVersion) return;
			// A failed source is not "still paging" to a merge. The cursor stays, so a retry
			// requests the same page.
			error.value = true;
			hasMore.value = false;
		} finally {
			if (version === requestVersion) {
				inFlight = false;
				isLoading.value = false;
			}
		}
	}

	/** Loads the next page, or retries the last one after it failed. */
	function loadNext(): void {
		if (!toValue(options.enabled ?? true) || inFlight || (!hasMore.value && !error.value)) return;
		void fetchPage(requestVersion);
	}

	// A new search term starts over and drops titles that do not match.
	if (options.search !== undefined) {
		watch(
			() => toValue(options.search),
			() => {
				requestVersion += 1;
				cursor = undefined;
				hasMore.value = true;
				error.value = false;
				inFlight = false;
				isLoading.value = false;
				rawItems.value = [];
				loadNext();
			},
		);
	}

	return { items, hasMore, isLoading, error, loadNext };
}
