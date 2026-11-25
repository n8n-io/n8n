import { $d as init_runtime_core_esm_bundler, Jf as toValue, Nf as init_reactivity_esm_bundler, Rd as computed, Tf as watch, Vf as ref, cd as refDebounced, lf as onMounted, of as onBeforeUnmount } from "./vendor-Hx42-oQF.js";
import { Ai as useInstanceAiSettingsStore, Jo as listSystemAgentThreads, Jr as useInstanceAiStore, Xi as ASSISTANT_AGENT_ID, bC as useRootStore, eC as DEBOUNCE_TIME, o as useAssistantAgentThreadsStore, s as withRenamedTitle, yy as getDebounceTime, zc as useAgentsN8nChatFlag } from "./app-D5flEmb-.js";
import { a as mergeChatHistoryPages } from "./mergeRecentChats-BLSTj3Bo.js";
import { t as usePagedN8nChatThreads } from "./usePagedN8nChatThreads-BdHm-oHe.js";
import { t as useIntersectionObserver } from "./useIntersectionObserver-BTGMngAL.js";
import "./useIntersectionObserver-CVH8U9lD.js";
//#region src/features/ai/instanceAi/assistantAgent/usePagedAssistantAgentThreads.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/** Cursor-paged, de-duplicated Assistant agent threads for the chat history. */
function usePagedAssistantAgentThreads(options) {
	const rootStore = useRootStore();
	const threadsStore = useAssistantAgentThreadsStore();
	const rawItems = ref([]);
	const hasMore = ref(true);
	const items = computed(() => {
		const byId = new Map(rawItems.value.map((thread) => [thread.id, thread]));
		if (!toValue(options.search)) {
			const oldest = rawItems.value.at(-1)?.updatedAt;
			for (const thread of threadsStore.knownThreads) {
				if (hasMore.value && (oldest === void 0 || thread.updatedAt < oldest)) continue;
				const loaded = byId.get(thread.id);
				if (!loaded || thread.updatedAt >= loaded.updatedAt) byId.set(thread.id, thread);
			}
		}
		return [...byId.values()].filter((thread) => !threadsStore.deletedThreadIds.has(thread.id)).map((thread) => withRenamedTitle(thread, threadsStore.renamedTitles)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	});
	const isLoading = ref(false);
	const error = ref(false);
	let cursor;
	let requestVersion = 0;
	let inFlight = false;
	async function fetchPage(version) {
		if (inFlight) return;
		inFlight = true;
		isLoading.value = true;
		try {
			const result = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, {
				limit: options.pageSize,
				cursor,
				search: toValue(options.search)
			});
			if (version !== requestVersion) return;
			threadsStore.remember(result.data);
			const seenIds = new Set(rawItems.value.map((thread) => thread.id));
			rawItems.value = [...rawItems.value, ...result.data.filter((thread) => !seenIds.has(thread.id))];
			cursor = result.nextCursor ?? void 0;
			hasMore.value = result.nextCursor !== null;
			error.value = false;
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
	/** Loads the next page, or retries the last one after it failed. */
	function loadNext() {
		if (!toValue(options.enabled ?? true) || inFlight || !hasMore.value && !error.value) return;
		fetchPage(requestVersion);
	}
	if (options.search !== void 0) watch(() => toValue(options.search), () => {
		requestVersion += 1;
		cursor = void 0;
		hasMore.value = true;
		error.value = false;
		inFlight = false;
		isLoading.value = false;
		rawItems.value = [];
		loadNext();
	});
	return {
		items,
		hasMore,
		isLoading,
		error,
		loadNext
	};
}
//#endregion
//#region src/features/ai/instanceAi/composables/useInstanceAiThreadHistory.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Server-side searched, cursor-paged chat list for one mounted list at a time.
* Bind `search` to the input, `listRef` to the scroll container and `sentinelRef` to an
* element after the last row. Loads on mount and clears the store state on unmount.
*/
function useInstanceAiThreadHistory(options) {
	const store = useInstanceAiStore();
	const history = computed(() => store.threadHistory);
	const search = ref("");
	const listRef = ref(null);
	const sentinelRef = ref(null);
	function loadMore() {
		store.loadThreadHistoryPage();
	}
	const debouncedSearch = refDebounced(search, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));
	watch(debouncedSearch, (value) => {
		store.resetThreadHistory(value.trim());
		loadMore();
	});
	const { observe } = useIntersectionObserver({
		root: listRef,
		onIntersect: options?.onSentinelLoadMore ?? loadMore
	});
	watch([
		sentinelRef,
		() => history.value.loading,
		() => options?.isExtraSourceLoading?.() ?? false
	], ([sentinel, loading, extraLoading]) => {
		if (sentinel && !loading && !extraLoading) observe(sentinel);
	}, { flush: "post" });
	onMounted(loadMore);
	onBeforeUnmount(() => store.resetThreadHistory());
	return {
		history,
		search,
		listRef,
		sentinelRef,
		loadMore
	};
}
//#endregion
//#region src/features/agents/n8nChatPage/useMergedChatHistory.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* Loads both chat history sources and merges them into one recency-ordered,
* infinite-scrolled list. Assistant paging stays in {@link useInstanceAiThreadHistory};
* agent paging is the shared {@link usePagedN8nChatThreads}.
*/
function useMergedChatHistory(options) {
	const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
	const instanceAiStore = useInstanceAiStore();
	const enabled = computed(() => toValue(options?.enabled ?? isAgentsN8nChatFlag));
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const assistantAgentEnabled = computed(() => toValue(options?.assistantAgentEnabled ?? instanceAiSettingsStore.isAssistantAgentEnabled));
	const agent = usePagedN8nChatThreads({
		pageSize: 30,
		enabled,
		search: () => enabled.value ? instanceAiStore.threadHistory.search || void 0 : void 0
	});
	const assistantAgent = usePagedAssistantAgentThreads({
		pageSize: 30,
		enabled: assistantAgentEnabled,
		search: () => assistantAgentEnabled.value ? instanceAiStore.threadHistory.search || void 0 : void 0
	});
	const assistant = useInstanceAiThreadHistory({
		onSentinelLoadMore: () => loadMore(),
		isExtraSourceLoading: () => enabled.value && agent.isLoading.value || assistantAgentEnabled.value && assistantAgent.isLoading.value
	});
	const agentLoaded = ref(false);
	watch(agent.isLoading, (loading) => {
		if (!loading) agentLoaded.value = true;
	});
	const assistantAgentLoaded = ref(false);
	watch(assistantAgent.isLoading, (loading) => {
		if (!loading) assistantAgentLoaded.value = true;
	});
	watch(() => instanceAiStore.threadHistory.search, () => {
		agentLoaded.value = false;
		assistantAgentLoaded.value = false;
	});
	const items = computed(() => {
		const assistantItems = assistant.history.value.threads.map((thread) => ({
			kind: "assistant",
			thread
		}));
		if (!enabled.value && !assistantAgentEnabled.value) return assistantItems;
		const sources = [{
			items: assistantItems,
			hasMore: assistant.history.value.hasMore && !assistant.history.value.error && assistantItems.length > 0
		}];
		if (assistantAgentEnabled.value) sources.push({
			items: assistantAgent.items.value.map((thread) => ({
				kind: "assistant-agent",
				thread
			})),
			hasMore: assistantAgentLoaded.value && assistantAgent.hasMore.value
		});
		if (enabled.value) sources.push({
			items: agent.items.value.map((thread) => ({
				kind: "agent",
				thread
			})),
			hasMore: agentLoaded.value && agent.hasMore.value
		});
		return mergeChatHistoryPages(sources);
	});
	const hasMore = computed(() => assistant.history.value.hasMore || enabled.value && agent.hasMore.value || assistantAgentEnabled.value && assistantAgent.hasMore.value);
	const isLoading = computed(() => assistant.history.value.loading || enabled.value && agent.isLoading.value || assistantAgentEnabled.value && assistantAgent.isLoading.value);
	const error = computed(() => assistant.history.value.error || enabled.value && agent.error.value || assistantAgentEnabled.value && assistantAgent.error.value);
	function loadMore() {
		assistant.loadMore();
		agent.loadNext();
		assistantAgent.loadNext();
	}
	watch(enabled, (active) => {
		if (active && !agentLoaded.value) agent.loadNext();
	});
	watch(assistantAgentEnabled, (active) => {
		if (active && !assistantAgentLoaded.value) assistantAgent.loadNext();
	});
	onMounted(() => {
		agent.loadNext();
		assistantAgent.loadNext();
	});
	return {
		items,
		hasMore,
		isLoading,
		error,
		history: assistant.history,
		search: assistant.search,
		listRef: assistant.listRef,
		sentinelRef: assistant.sentinelRef,
		loadMore
	};
}
//#endregion
export { useMergedChatHistory as t };
