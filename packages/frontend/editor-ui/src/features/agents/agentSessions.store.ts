import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	listThreads,
	getThreadDetail as getThreadDetailApi,
	deleteThread as deleteThreadApi,
	type ExecutionThread,
	type ThreadDetail,
} from './composables/useAgentThreadsApi';

const ITEMS_PER_PAGE = 20;
const AUTO_REFRESH_INTERVAL_MS = 4_000;

export const useAgentSessionsStore = defineStore('agentSessions', () => {
	const threads = ref<ExecutionThread[]>([]);
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
			threads.value.push(...page.threads);
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
			try {
				if (currentProjectId) {
					await fetchThreads(currentProjectId, currentAgentId ?? undefined);
				}
			} catch {
				// Swallow refresh errors so the cycle continues
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
		loadMore,
		getThreadDetail,
		deleteThread,
		startAutoRefresh,
		stopAutoRefresh,
		reset,
	};
});
