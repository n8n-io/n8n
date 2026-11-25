import { $d as init_runtime_core_esm_bundler, Jf as toValue, Nf as init_reactivity_esm_bundler, Rd as computed, Tf as watch, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Ko as listN8nChatThreads, bC as useRootStore } from "./app-D5flEmb-.js";
import { s as useAgentN8nChatThreadsStore } from "./mergeRecentChats-BLSTj3Bo.js";
//#region src/features/agents/n8nChatPage/usePagedN8nChatThreads.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Cursor-paged, de-duplicated n8n Chat thread list shared by the agent chat page's
* "all chats" merge ({@link useMergedChatHistory}) and its per-agent history dropdown
* (`N8nChatThreadHistory`).
*/
function usePagedN8nChatThreads(options) {
	const rootStore = useRootStore();
	const threadsStore = useAgentN8nChatThreadsStore();
	const rawItems = ref([]);
	const items = computed(() => rawItems.value.filter((thread) => !threadsStore.deletedThreadIds.has(thread.id)));
	const hasMore = ref(true);
	const isLoading = ref(false);
	const error = ref(false);
	let cursor;
	let requestVersion = 0;
	let inFlight = false;
	let replaceOnNextPage = false;
	async function fetchPage(version) {
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
				search: toValue(options.search)
			});
			if (version !== requestVersion) return;
			const base = replacing ? [] : rawItems.value;
			const seenIds = new Set(base.map((thread) => thread.id));
			const freshItems = result.data.filter((thread) => !seenIds.has(thread.id));
			rawItems.value = [...base, ...freshItems];
			cursor = result.nextCursor ?? void 0;
			hasMore.value = result.nextCursor !== null;
			error.value = false;
			replaceOnNextPage = false;
		} catch {
			if (version !== requestVersion) return;
			error.value = true;
			hasMore.value = false;
		} finally {
			if (version === requestVersion) {
				inFlight = false;
				isLoading.value = false;
			}
		}
	}
	/** Loads the next page, or retries the last one after it failed. No-op while disabled, while a page is already loading, or none remain (a failure never counts as "none remain" — it still allows a retry). */
	function loadNext() {
		if (!toValue(options.enabled ?? true) || inFlight || !hasMore.value && !error.value) return;
		fetchPage(requestVersion);
	}
	/**
	* Drops any in-flight response and rearms for a fresh first page — call
	* `loadNext()` after it to actually fetch. Does not clear `items`: the
	* caller can keep showing the previous list until the fresh page replaces it.
	*/
	function reset() {
		requestVersion += 1;
		cursor = void 0;
		hasMore.value = true;
		error.value = false;
		replaceOnNextPage = true;
		inFlight = false;
		isLoading.value = false;
	}
	if (options.agentId !== void 0) watch(() => toValue(options.agentId), () => {
		reset();
		rawItems.value = [];
	});
	if (options.search !== void 0) watch(() => toValue(options.search), () => {
		reset();
		rawItems.value = [];
		loadNext();
	});
	return {
		items,
		hasMore,
		isLoading,
		error,
		loadNext,
		reset
	};
}
//#endregion
export { usePagedN8nChatThreads as t };
