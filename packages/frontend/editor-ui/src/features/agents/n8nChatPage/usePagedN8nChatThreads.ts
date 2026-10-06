import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import { listN8nChatThreads } from '../composables/useAgentApi';

export type UsePagedN8nChatThreadsOptions = {
	/** Narrows every page to one agent's threads. Changing it resets paging. */
	agentId?: MaybeRefOrGetter<string | undefined>;
	pageSize: number;
};

/**
 * Cursor-paged, de-duplicated n8n Chat thread list shared by the agent chat page's
 * "all chats" merge ({@link useMergedChatHistory}) and its per-agent history dropdown
 * (`N8nChatThreadHistory`).
 */
export function usePagedN8nChatThreads(options: UsePagedN8nChatThreadsOptions) {
	const rootStore = useRootStore();

	const items = ref<AgentN8nChatThreadSummary[]>([]);
	const hasMore = ref(true);
	const isLoading = ref(false);
	const error = ref(false);

	let cursor: string | undefined;
	let requestVersion = 0;
	let inFlight = false;
	// Set by reset(), until the next successful page lands — that page replaces
	// `items` outright instead of appending, so a reopen can keep showing the
	// stale list while the fresh first page loads in the background.
	let replaceOnNextPage = false;

	async function fetchPage(version: number): Promise<void> {
		if (inFlight) return;
		inFlight = true;
		isLoading.value = true;
		const requestCursor = cursor;
		const replacing = replaceOnNextPage;
		try {
			const result = await listN8nChatThreads(rootStore.restApiContext, {
				limit: options.pageSize,
				cursor: requestCursor,
				agentId: toValue(options.agentId),
			});
			if (version !== requestVersion) return;
			const base = replacing ? [] : items.value;
			const seenIds = new Set(base.map((thread) => thread.id));
			const freshItems = result.data.filter((thread) => !seenIds.has(thread.id));
			items.value = [...base, ...freshItems];
			cursor = result.nextCursor ?? undefined;
			hasMore.value = result.nextCursor !== null;
			error.value = false;
			replaceOnNextPage = false;
		} catch {
			if (version !== requestVersion) return;
			error.value = true;
			// A source that failed isn't "still paging" to a caller merging it with others
			// (e.g. `useMergedChatHistory`) — `loadNext()` below still allows a retry despite
			// this, and the cursor is left untouched, so that retry re-requests this same page.
			hasMore.value = false;
		} finally {
			// Guarded like `isLoading`: a stale request's own completion must not touch
			// `inFlight` once `reset()` has moved on, or it could clear it out from under
			// the newer request that `reset()` unblocked.
			if (version === requestVersion) {
				inFlight = false;
				isLoading.value = false;
			}
		}
	}

	/** Loads the next page, or retries the last one after it failed. No-op while a page is already loading or none remain (a failure never counts as "none remain" — it still allows a retry). */
	function loadNext(): void {
		if (inFlight || (!hasMore.value && !error.value)) return;
		void fetchPage(requestVersion);
	}

	/**
	 * Drops any in-flight response and rearms for a fresh first page — call
	 * `loadNext()` after it to actually fetch. Does not clear `items`: the
	 * caller can keep showing the previous list until the fresh page replaces it.
	 */
	function reset(): void {
		requestVersion += 1;
		cursor = undefined;
		hasMore.value = true;
		error.value = false;
		replaceOnNextPage = true;
		inFlight = false;
		// A pending request's own `finally` is version-guarded and skips clearing this,
		// so clear it here or a reset during a fetch leaves `isLoading` stuck true.
		isLoading.value = false;
	}

	if (options.agentId !== undefined) {
		watch(
			() => toValue(options.agentId),
			() => {
				reset();
				// Unlike a reopen, another agent's threads must not show while the new page loads.
				items.value = [];
			},
		);
	}

	return { items, hasMore, isLoading, error, loadNext, reset };
}
