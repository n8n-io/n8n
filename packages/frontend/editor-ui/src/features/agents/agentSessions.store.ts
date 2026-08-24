import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	defaultAgentSessionFilters,
	listThreads,
	getThreadDetail as getThreadDetailApi,
	deleteThread as deleteThreadApi,
	exportThreadToLangSmith as exportThreadToLangSmithApi,
	type AgentExecutionThread,
	type AgentSessionFilters,
	type ThreadDetail,
} from './composables/useAgentThreadsApi';

const ITEMS_PER_PAGE = 20;
const AUTO_REFRESH_INTERVAL_MS = 5_000;

export const useAgentSessionsStore = defineStore('agentSessions', () => {
	const threads = ref<AgentExecutionThread[]>([]);
	const nextCursor = ref<string | null>(null);
	const loading = ref(false);
	const autoRefresh = ref(true);
	const filters = ref<AgentSessionFilters>(defaultAgentSessionFilters());

	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let currentProjectId: string | null = null;
	let currentAgentId: string | null = null;
	let autoRefreshActive = false;
	let latestRefreshId = 0;

	// Tracks the most recently requested project, agent, and filter set. Concurrent
	// `fetchThreads` calls — typically when the user switches agents quickly —
	// would otherwise race, and an older response could overwrite the newer
	// agent's threads.
	function keyFor(projectId: string, agentId: string, value: AgentSessionFilters) {
		return `${projectId}:${agentId}:${JSON.stringify(value)}`;
	}
	let latestKey: string | null = null;

	async function fetchThreads(
		projectId: string,
		agentId: string,
		options: { filters?: AgentSessionFilters } = {},
	) {
		currentProjectId = projectId;
		currentAgentId = agentId;
		const requestedFilters = options.filters ?? filters.value;
		const key = keyFor(projectId, agentId, requestedFilters);
		latestKey = key;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(rootStore.restApiContext, projectId, agentId, {
				limit: ITEMS_PER_PAGE,
				filters: requestedFilters,
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
	async function refreshThreads(projectId: string, agentId: string) {
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
				filters: requestedFilters,
			});
			if (latestKey !== key || refreshId !== latestRefreshId) return;
			const refreshed = [...page.threads];
			const seen = new Set(refreshed.map(({ id }) => id));
			while (refreshed.length < limit && page.nextCursor) {
				page = await listThreads(rootStore.restApiContext, projectId, agentId, {
					limit: limit - refreshed.length,
					cursor: page.nextCursor,
					filters: requestedFilters,
				});
				if (latestKey !== key || refreshId !== latestRefreshId) return;
				refreshed.push(...page.threads.filter(({ id }) => !seen.has(id)));
				for (const { id } of page.threads) seen.add(id);
			}
			if (loading.value || threads.value.length !== threadCount || nextCursor.value !== cursor)
				return;
			threads.value = refreshed;
			nextCursor.value = page.nextCursor;
		} catch {
			// Swallow refresh errors — the next tick will retry
		}
	}

	async function loadMore(projectId: string, agentId: string) {
		if (!nextCursor.value || loading.value) return;
		const key = keyFor(projectId, agentId, filters.value);
		// Don't paginate against a stale agent — the cursor belongs to the
		// previous list.
		if (latestKey !== null && latestKey !== key) return;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(rootStore.restApiContext, projectId, agentId, {
				limit: ITEMS_PER_PAGE,
				cursor: nextCursor.value,
				filters: filters.value,
			});
			if (latestKey !== key) return;
			// Dedupe by id when appending: the server's cursor can be
			// inclusive of the boundary, returning the last item of the
			// previous page as the first item of the next one. Without this
			// the duplicate flashes in the table until the next refresh tick
			// merges it away.
			const seen = new Set(threads.value.map((t) => t.id));
			const fresh = page.threads.filter((t) => !seen.has(t.id));
			threads.value.push(...fresh);
			nextCursor.value = page.nextCursor;
		} finally {
			if (latestKey === key) loading.value = false;
		}
	}

	async function getThreadDetail(
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<ThreadDetail> {
		const rootStore = useRootStore();
		return await getThreadDetailApi(rootStore.restApiContext, projectId, agentId, threadId);
	}

	function upsertThread(thread: AgentExecutionThread) {
		const index = threads.value.findIndex(({ id }) => id === thread.id);
		if (index === -1) {
			threads.value.push(thread);
			return;
		}
		threads.value.splice(index, 1, thread);
	}

	async function deleteThread(projectId: string, agentId: string, threadId: string) {
		const rootStore = useRootStore();
		await deleteThreadApi(rootStore.restApiContext, projectId, agentId, threadId);
		threads.value = threads.value.filter((t) => t.id !== threadId);
	}

	async function exportThreadToLangSmith(projectId: string, agentId: string, threadId: string) {
		const rootStore = useRootStore();
		return await exportThreadToLangSmithApi(rootStore.restApiContext, projectId, agentId, threadId);
	}

	async function setFilters(projectId: string, agentId: string, value: AgentSessionFilters) {
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
			if (currentProjectId && currentAgentId && !document.hidden) {
				await refreshThreads(currentProjectId, currentAgentId);
			}
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
		nextCursor.value = null;
		loading.value = false;
		currentProjectId = null;
		currentAgentId = null;
		latestKey = null;
		filters.value = defaultAgentSessionFilters();
	}

	return {
		threads,
		nextCursor,
		loading,
		autoRefresh,
		filters,
		fetchThreads,
		refreshThreads,
		loadMore,
		getThreadDetail,
		upsertThread,
		deleteThread,
		exportThreadToLangSmith,
		setFilters,
		startAutoRefresh,
		stopAutoRefresh,
		reset,
	};
});
