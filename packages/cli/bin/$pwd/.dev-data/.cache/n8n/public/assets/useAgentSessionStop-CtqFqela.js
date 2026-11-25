import { Jf as toValue, Nf as init_reactivity_esm_bundler, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { Fw as makeRestApiRequest, Kr as useAgentPermissions, bC as useRootStore, dC as useToast, jN as useI18n } from "./app-D5flEmb-.js";
//#region src/features/agents/composables/useAgentThreadsApi.ts
function defaultAgentSessionFilters() {
	return {
		status: "all",
		origin: "all",
		startDate: "",
		endDate: ""
	};
}
/** `/projects/:projectId/agents/v2/:agentId`, with both segments percent-encoded. */
var agentBasePath = (projectId, agentId) => `/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}`;
var listThreads = async (context, projectId, agentId, options) => {
	const params = new URLSearchParams({ limit: String(options.limit) });
	if (options.cursor) params.set("cursor", options.cursor);
	if (options.previewOnly) params.set("previewOnly", "true");
	const { filters } = options;
	if (filters?.status && filters.status !== "all") params.set("status", filters.status);
	if (filters?.origin && filters.origin !== "all") params.set("origin", filters.origin);
	if (filters?.startDate) params.set("updatedAfter", new Date(filters.startDate).toISOString());
	if (filters?.endDate) params.set("updatedBefore", new Date(filters.endDate).toISOString());
	return await makeRestApiRequest(context, "GET", `${agentBasePath(projectId, agentId)}/threads?${params.toString()}`);
};
var getThreadDetail = async (context, projectId, agentId, threadId) => {
	return await makeRestApiRequest(context, "GET", `${agentBasePath(projectId, agentId)}/threads/${encodeURIComponent(threadId)}`);
};
var deleteThread = async (context, projectId, agentId, threadId) => {
	return await makeRestApiRequest(context, "DELETE", `${agentBasePath(projectId, agentId)}/threads/${encodeURIComponent(threadId)}`);
};
var resumeTaskApproval = async (context, projectId, agentId, threadId, body) => {
	return await makeRestApiRequest(context, "POST", `${agentBasePath(projectId, agentId)}/threads/${encodeURIComponent(threadId)}/approval`, body);
};
var stopSession = async (context, projectId, agentId, threadId) => {
	return await makeRestApiRequest(context, "POST", `${agentBasePath(projectId, agentId)}/threads/${encodeURIComponent(threadId)}/stop`);
};
var exportThreadToLangSmith = async (context, projectId, agentId, threadId) => {
	return await makeRestApiRequest(context, "POST", `${agentBasePath(projectId, agentId)}/threads/${encodeURIComponent(threadId)}/langsmith-export`);
};
//#endregion
//#region src/features/agents/agentSessions.store.ts
init_reactivity_esm_bundler();
var ITEMS_PER_PAGE = 20;
var AUTO_REFRESH_INTERVAL_MS = 5e3;
var useAgentSessionsStore = defineStore("agentSessions", () => {
	const threads = ref([]);
	const previewThreads = ref([]);
	const previewLoading = ref(false);
	const nextCursor = ref(null);
	const loading = ref(false);
	const autoRefresh = ref(true);
	const filters = ref(defaultAgentSessionFilters());
	let refreshTimer = null;
	let currentProjectId = null;
	let currentAgentId = null;
	let autoRefreshActive = false;
	let latestRefreshId = 0;
	let latestPreviewRequestId = 0;
	let previewTarget = null;
	function keyFor(projectId, agentId, value) {
		return `${projectId}:${agentId}:${JSON.stringify(value)}`;
	}
	let latestKey = null;
	async function fetchThreads(projectId, agentId, options = {}) {
		await Promise.all([fetchHistoryThreads(projectId, agentId, options), fetchPreviewThreads(projectId, agentId)]);
	}
	async function fetchPreviewThreads(projectId, agentId) {
		const target = `${projectId}:${agentId}`;
		if (previewTarget !== target) previewThreads.value = [];
		previewTarget = target;
		const requestId = ++latestPreviewRequestId;
		previewLoading.value = true;
		try {
			const page = await listThreads(useRootStore().restApiContext, projectId, agentId, {
				limit: ITEMS_PER_PAGE,
				previewOnly: true
			});
			if (requestId !== latestPreviewRequestId) return;
			previewThreads.value = page.threads;
		} finally {
			if (requestId === latestPreviewRequestId) previewLoading.value = false;
		}
	}
	async function fetchHistoryThreads(projectId, agentId, options) {
		currentProjectId = projectId;
		currentAgentId = agentId;
		const requestedFilters = options.filters ?? filters.value;
		const key = keyFor(projectId, agentId, requestedFilters);
		latestKey = key;
		loading.value = true;
		try {
			const page = await listThreads(useRootStore().restApiContext, projectId, agentId, {
				limit: ITEMS_PER_PAGE,
				filters: requestedFilters
			});
			if (latestKey !== key) return;
			threads.value = page.threads;
			nextCursor.value = page.nextCursor;
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}
	/**
	* Background refresh used by the polling timer and visibility-change
	* handler. Unlike `fetchThreads` it:
	*   - Does not flip `loading` (avoids flashing the "Load more" button's
	*     spinner on every tick).
	*   - Re-fetches the currently loaded range so filters are re-evaluated
	*     without collapsing the list back to its first page.
	*/
	async function refreshThreads(projectId, agentId) {
		if (currentProjectId !== projectId || currentAgentId !== agentId) return;
		await Promise.all([refreshHistoryThreads(projectId, agentId), fetchPreviewThreads(projectId, agentId).catch(() => {})]);
	}
	async function refreshHistoryThreads(projectId, agentId) {
		const requestedFilters = filters.value;
		const key = keyFor(projectId, agentId, requestedFilters);
		if (latestKey !== null && latestKey !== key) return;
		const refreshId = ++latestRefreshId;
		const threadCount = threads.value.length;
		const cursor = nextCursor.value;
		try {
			const rootStore = useRootStore();
			const limit = Math.max(threads.value.length, ITEMS_PER_PAGE);
			let page = await listThreads(rootStore.restApiContext, projectId, agentId, {
				limit,
				filters: requestedFilters
			});
			if (latestKey !== key || refreshId !== latestRefreshId) return;
			const refreshed = [...page.threads];
			const seen = new Set(refreshed.map(({ id }) => id));
			while (refreshed.length < limit && page.nextCursor) {
				page = await listThreads(rootStore.restApiContext, projectId, agentId, {
					limit: limit - refreshed.length,
					cursor: page.nextCursor,
					filters: requestedFilters
				});
				if (latestKey !== key || refreshId !== latestRefreshId) return;
				refreshed.push(...page.threads.filter(({ id }) => !seen.has(id)));
				for (const { id } of page.threads) seen.add(id);
			}
			if (loading.value || threads.value.length !== threadCount || nextCursor.value !== cursor) return;
			threads.value = refreshed;
			nextCursor.value = page.nextCursor;
		} catch {}
	}
	async function loadMore(projectId, agentId) {
		if (!nextCursor.value || loading.value) return;
		const key = keyFor(projectId, agentId, filters.value);
		if (latestKey !== null && latestKey !== key) return;
		loading.value = true;
		try {
			const page = await listThreads(useRootStore().restApiContext, projectId, agentId, {
				limit: ITEMS_PER_PAGE,
				cursor: nextCursor.value,
				filters: filters.value
			});
			if (latestKey !== key) return;
			const seen = new Set(threads.value.map((t) => t.id));
			const fresh = page.threads.filter((t) => !seen.has(t.id));
			threads.value.push(...fresh);
			nextCursor.value = page.nextCursor;
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}
	async function resumeTaskApproval$1(projectId, agentId, threadId, body) {
		await resumeTaskApproval(useRootStore().restApiContext, projectId, agentId, threadId, body);
	}
	async function getThreadDetail$1(projectId, agentId, threadId) {
		return await getThreadDetail(useRootStore().restApiContext, projectId, agentId, threadId);
	}
	function upsertThread(thread) {
		const index = threads.value.findIndex(({ id }) => id === thread.id);
		if (index === -1) threads.value.push(thread);
		else threads.value.splice(index, 1, thread);
		previewThreads.value = previewThreads.value.filter(({ id }) => id !== thread.id);
		if (thread.canContinueInPreview) {
			previewThreads.value.push(thread);
			previewThreads.value.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		}
	}
	async function deleteThread$1(projectId, agentId, threadId) {
		await deleteThread(useRootStore().restApiContext, projectId, agentId, threadId);
		if (currentProjectId !== projectId || currentAgentId !== agentId) return;
		threads.value = threads.value.filter((t) => t.id !== threadId);
		previewThreads.value = previewThreads.value.filter((t) => t.id !== threadId);
	}
	async function exportThreadToLangSmith$1(projectId, agentId, threadId) {
		return await exportThreadToLangSmith(useRootStore().restApiContext, projectId, agentId, threadId);
	}
	async function setFilters(projectId, agentId, value) {
		if (JSON.stringify(filters.value) === JSON.stringify(value)) return;
		filters.value = { ...value };
		threads.value = [];
		nextCursor.value = null;
		await fetchThreads(projectId, agentId);
	}
	function scheduleAutoRefresh() {
		if (!autoRefreshActive || !autoRefresh.value || !currentProjectId || !currentAgentId) return;
		refreshTimer = setTimeout(async () => {
			refreshTimer = null;
			if (currentProjectId && currentAgentId && !document.hidden) await refreshThreads(currentProjectId, currentAgentId);
			if (autoRefreshActive) scheduleAutoRefresh();
		}, AUTO_REFRESH_INTERVAL_MS);
	}
	function startAutoRefresh() {
		stopAutoRefresh();
		if (!autoRefresh.value || !currentProjectId || !currentAgentId) return;
		autoRefreshActive = true;
		scheduleAutoRefresh();
	}
	function stopAutoRefresh() {
		autoRefreshActive = false;
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
	}
	function reset() {
		stopAutoRefresh();
		threads.value = [];
		previewThreads.value = [];
		previewLoading.value = false;
		previewTarget = null;
		latestPreviewRequestId++;
		nextCursor.value = null;
		loading.value = false;
		currentProjectId = null;
		currentAgentId = null;
		latestKey = null;
		filters.value = defaultAgentSessionFilters();
	}
	return {
		threads,
		previewThreads,
		previewLoading,
		nextCursor,
		loading,
		autoRefresh,
		filters,
		fetchThreads,
		refreshThreads,
		loadMore,
		getThreadDetail: getThreadDetail$1,
		resumeTaskApproval: resumeTaskApproval$1,
		upsertThread,
		deleteThread: deleteThread$1,
		exportThreadToLangSmith: exportThreadToLangSmith$1,
		setFilters,
		startAutoRefresh,
		stopAutoRefresh,
		reset
	};
});
//#endregion
//#region src/features/agents/utils/thread-title.ts
/** Cap the inline preview so a paragraph-long first message doesn't blow up dropdown rows. */
var PREVIEW_MAX_CHARS = 60;
function previewFromFirstMessage(text) {
	const trimmed = text.replace(/\s+/g, " ").trim();
	if (!trimmed) return "";
	if (trimmed.length <= PREVIEW_MAX_CHARS) return trimmed;
	return `${trimmed.slice(0, 59).trimEnd()}…`;
}
/**
* Display title for a chat thread, in fallback order:
*
* 1. `title` — LLM-generated summary, set after the first turn completes.
* 2. `firstMessage` preview — what the user actually typed, available as soon
*    as the thread is persisted. Distinguishes untitled sessions in lists.
* 3. `fallbackLabel` — the i18n "New chat" string for empty / brand-new sessions.
*/
function formatThreadTitle(thread, fallbackLabel) {
	if (thread.title) return thread.title;
	if (thread.firstMessage) {
		const preview = previewFromFirstMessage(thread.firstMessage);
		if (preview) return preview;
	}
	return fallbackLabel;
}
function useThreadTitle() {
	const i18n = useI18n();
	return (thread) => formatThreadTitle(thread, i18n.baseText("agents.builder.chat.newChat.label"));
}
//#endregion
//#region src/features/agents/composables/useAgentSessionStop.ts
init_reactivity_esm_bundler();
function useAgentSessionStop(projectId, agentId) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();
	const { canExecute } = useAgentPermissions(projectId);
	const stoppingSessionIds = ref(/* @__PURE__ */ new Set());
	async function stop(threadId) {
		if (!canExecute.value || stoppingSessionIds.value.has(threadId)) return false;
		stoppingSessionIds.value.add(threadId);
		try {
			await stopSession(rootStore.restApiContext, toValue(projectId), toValue(agentId), threadId);
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText("agentSessions.showError.stop"));
			return false;
		} finally {
			stoppingSessionIds.value.delete(threadId);
		}
	}
	return {
		canStop: canExecute,
		stoppingSessionIds,
		stop
	};
}
//#endregion
export { defaultAgentSessionFilters as i, useThreadTitle as n, useAgentSessionsStore as r, useAgentSessionStop as t };
