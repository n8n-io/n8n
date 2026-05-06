import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	listThreads,
	getThreadDetail as getThreadDetailApi,
	deleteThread as deleteThreadApi,
	type AgentExecutionThread,
	type ThreadDetail,
} from './composables/useAgentThreadsApi';

const ITEMS_PER_PAGE = 20;
const AUTO_REFRESH_INTERVAL_MS = 2_000;

export const useAgentSessionsStore = defineStore('agentSessions', () => {
	const threads = ref<AgentExecutionThread[]>([]);
	const nextCursor = ref<string | null>(null);
	const loading = ref(false);
	const autoRefresh = ref(true);

	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let currentProjectId: string | null = null;
	let currentAgentId: string | null = null;

	// Tracks the most recently requested (project, agent) pair. Concurrent
	// `fetchThreads` calls — typically when the user switches agents quickly —
	// would otherwise race, and an older response could overwrite the newer
	// agent's threads.
	function keyFor(projectId: string, agentId: string | null) {
		return `${projectId}:${agentId ?? ''}`;
	}
	let latestKey: string | null = null;

	async function fetchThreads(projectId: string, agentId?: string) {
		currentProjectId = projectId;
		currentAgentId = agentId ?? null;
		const key = keyFor(projectId, currentAgentId);
		latestKey = key;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(
				rootStore.restApiContext,
				projectId,
				ITEMS_PER_PAGE,
				undefined,
				agentId,
			);
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
	 *   - Merges the latest first page into the existing list by id rather
	 *     than replacing it, so threads loaded via "Load more" are preserved
	 *     across ticks.
	 *   - Leaves `nextCursor` untouched once the user has paginated — the
	 *     existing cursor still points past everything we've loaded, while
	 *     the cursor returned by a fresh first-page fetch would rewind us.
	 */
	async function refreshThreads(projectId: string, agentId?: string) {
		const key = keyFor(projectId, agentId ?? null);
		if (latestKey !== null && latestKey !== key) return;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(
				rootStore.restApiContext,
				projectId,
				ITEMS_PER_PAGE,
				undefined,
				agentId,
			);
			if (latestKey !== key) return;
			const seen = new Set(page.threads.map((t) => t.id));
			const tail = threads.value.filter((t) => !seen.has(t.id));
			threads.value = [...page.threads, ...tail];
			// Only adopt the new cursor if we hadn't paginated yet — otherwise
			// the existing cursor already points past what we've loaded.
			if (tail.length === 0) {
				nextCursor.value = page.nextCursor;
			}
		} catch {
			// Swallow refresh errors — the next tick will retry
		}
	}

	async function loadMore(projectId: string, agentId?: string) {
		if (!nextCursor.value || loading.value) return;
		const key = keyFor(projectId, agentId ?? null);
		// Don't paginate against a stale agent — the cursor belongs to the
		// previous list.
		if (latestKey !== null && latestKey !== key) return;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(
				rootStore.restApiContext,
				projectId,
				ITEMS_PER_PAGE,
				nextCursor.value,
				agentId,
			);
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
		threadId: string,
		agentId?: string,
	): Promise<ThreadDetail> {
		const rootStore = useRootStore();
		return await getThreadDetailApi(rootStore.restApiContext, projectId, threadId, agentId);
	}

	async function deleteThread(projectId: string, threadId: string) {
		const rootStore = useRootStore();
		await deleteThreadApi(rootStore.restApiContext, projectId, threadId);
		threads.value = threads.value.filter((t) => t.id !== threadId);
	}

	function startAutoRefresh() {
		stopAutoRefresh();
		if (!autoRefresh.value || !currentProjectId) return;
		refreshTimer = setTimeout(async () => {
			if (currentProjectId) {
				await refreshThreads(currentProjectId, currentAgentId ?? undefined);
			}
			startAutoRefresh();
		}, AUTO_REFRESH_INTERVAL_MS);
	}

	function stopAutoRefresh() {
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
	}

	return {
		threads,
		nextCursor,
		loading,
		autoRefresh,
		fetchThreads,
		refreshThreads,
		loadMore,
		getThreadDetail,
		deleteThread,
		startAutoRefresh,
		stopAutoRefresh,
		reset,
	};
});
