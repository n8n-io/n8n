import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { AN as i18n, EA as STORES, Ko as listN8nChatThreads, Oo as getN8nChatThread, ao as deleteN8nChatThread, bC as useRootStore, dC as useToast, ih as AGENT_N8N_CHAT_VIEW, kc as INSTANCE_AI_THREAD_VIEW } from "./app-D5flEmb-.js";
//#region src/features/agents/n8nChatPage/n8nChatThreads.store.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/**
* The user's own n8n Chat threads across every agent they can reach, for the sidebar's
* "recent chats" list. The "All chats" view's own cursor-paged list lives in
* {@link useMergedChatHistory}, not here, since only that view ever pages through it.
*/
var useAgentN8nChatThreadsStore = defineStore(STORES.AGENT_N8N_CHAT_THREADS, () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const recentThreads = ref([]);
	const openedThreads = ref([]);
	/** Ids deleted this session, so every already-mounted list (recent, paged, merged) can
	* filter a row out without each one separately tracking and removing it. */
	const deletedThreadIds = ref(/* @__PURE__ */ new Set());
	/** Every known thread by id; a fresher `recentThreads` entry wins. Skips deleted threads,
	* so a list response that was already in flight cannot bring one back. */
	const threadsById = computed(() => new Map([...openedThreads.value, ...recentThreads.value].filter((thread) => !deletedThreadIds.value.has(thread.id)).map((thread) => [thread.id, thread])));
	/** Every known thread, newest `updatedAt` first — the single source for callers that
	* merge this store's threads into a recency-ordered list (the sidebar, the dropdown). */
	const knownThreads = computed(() => [...threadsById.value.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
	let requestVersion = 0;
	async function fetchRecent(limit) {
		const version = ++requestVersion;
		try {
			const result = await listN8nChatThreads(rootStore.restApiContext, { limit });
			if (version !== requestVersion) return;
			recentThreads.value = result.data;
		} catch (error) {
			if (version !== requestVersion) return;
			console.error("Failed to load n8n Chat threads", error);
		}
	}
	/**
	* Fetch a thread the store does not know yet, e.g. an older one opened
	* directly by URL, so the chat history button can still show its title.
	* Best-effort: a missing title must not break the page, so this swallows
	* every error instead of throwing.
	*/
	async function loadThread(threadId) {
		if (threadsById.value.has(threadId)) return;
		try {
			const thread = await getN8nChatThread(rootStore.restApiContext, threadId);
			if (threadsById.value.has(thread.id)) return;
			openedThreads.value.push(thread);
		} catch (error) {
			console.error("Failed to load n8n Chat thread", error);
		}
	}
	/**
	* Delete one of the user's own threads, like the preview chat deletes sessions.
	* Rename is out of scope — the preview chat has none either. Takes the thread itself,
	* not just its id, so a thread a pager loaded past the recent page can still delete.
	*/
	async function deleteThread(thread) {
		try {
			await deleteN8nChatThread(rootStore.restApiContext, thread.agent.projectId, thread.agent.id, thread.id);
		} catch (error) {
			toast.showError(error, i18n.baseText("agentSessions.showError.delete"));
			return false;
		}
		recentThreads.value = recentThreads.value.filter((t) => t.id !== thread.id);
		openedThreads.value = openedThreads.value.filter((t) => t.id !== thread.id);
		deletedThreadIds.value.add(thread.id);
		return true;
	}
	return {
		recentThreads,
		openedThreads,
		threadsById,
		knownThreads,
		deletedThreadIds,
		fetchRecent,
		loadThread,
		deleteThread
	};
});
//#endregion
//#region src/features/agents/n8nChatPage/mergeRecentChats.ts
/** Route to open a sidebar or history chat item on its own page. */
function chatItemRoute(item) {
	if (item.kind === "assistant" || item.kind === "assistant-agent") return {
		name: INSTANCE_AI_THREAD_VIEW,
		params: { threadId: item.thread.id }
	};
	return {
		name: AGENT_N8N_CHAT_VIEW,
		params: {
			agentId: item.thread.agent.id,
			agentThreadId: item.thread.id
		}
	};
}
/** Display title for a chat item, falling back to a generic label for an untitled agent thread. */
function chatItemTitle(item, i18n) {
	if (item.kind === "assistant") return item.thread.title;
	return item.thread.title ?? i18n.baseText("commandBar.instanceAi.newThread");
}
/** Whether the item is an n8n Assistant thread, on either runtime. */
function isAssistantChatItem(item) {
	return item.kind === "assistant" || item.kind === "assistant-agent";
}
/** The agent thread row menu, shared by every surface that lists them: delete only. */
function agentThreadActions(i18n) {
	return [{
		id: "delete",
		label: i18n.baseText("instanceAi.sidebar.deleteThread"),
		icon: "trash-2"
	}];
}
/**
* Single-pass merge of already newest-first lists into one recency-ordered list for
* the sidebar, stopping at `limit`. On equal times, the Assistant threads come first.
*/
function mergeRecentChats(assistantThreads, agentThreads, options) {
	const lists = [
		assistantThreads.map((thread) => ({
			kind: "assistant",
			thread
		})),
		(options.assistantAgentThreads ?? []).map((thread) => ({
			kind: "assistant-agent",
			thread
		})),
		agentThreads.map((thread) => ({
			kind: "agent",
			thread
		}))
	];
	const updatedAtOf = (item) => item.thread.updatedAt ?? "";
	const merged = [];
	const positions = lists.map(() => 0);
	while (merged.length < options.limit) {
		let next = -1;
		for (let index = 0; index < lists.length; index++) {
			const head = lists[index][positions[index]];
			if (!head) continue;
			if (next === -1 || updatedAtOf(head) > updatedAtOf(lists[next][positions[next]])) next = index;
		}
		if (next === -1) break;
		merged.push(lists[next][positions[next]++]);
	}
	const openId = options.openThreadId;
	if (!openId || merged.some((item) => item.thread.id === openId)) return merged;
	const openItem = lists.flat().find((item) => item.thread.id === openId);
	if (!openItem) return merged;
	return [...merged.slice(0, Math.max(options.limit - 1, 0)), openItem];
}
/**
* Merges several cursor-paged chat history sources into one recency-ordered list for the
* "All chats" view's infinite scroll. Stops at the oldest point every still-paging source
* has loaded down to, so nothing shows out of order while a page is still missing.
*/
function mergeChatHistoryPages(sources) {
	const stillPaging = sources.filter((source) => source.hasMore);
	const cutoff = stillPaging.length ? Math.max(...stillPaging.map((source) => {
		const oldest = source.items.at(-1);
		return oldest ? Date.parse(oldest.thread.updatedAt) : Infinity;
	})) : -Infinity;
	return sources.flatMap((source) => source.items).filter((item) => Date.parse(item.thread.updatedAt) >= cutoff).sort((a, b) => Date.parse(b.thread.updatedAt) - Date.parse(a.thread.updatedAt));
}
//#endregion
export { mergeChatHistoryPages as a, isAssistantChatItem as i, chatItemRoute as n, mergeRecentChats as o, chatItemTitle as r, useAgentN8nChatThreadsStore as s, agentThreadActions as t };
