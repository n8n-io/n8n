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

	async function fetchThreads(projectId: string, agentId?: string) {
		currentProjectId = projectId;
		currentAgentId = agentId ?? null;
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
			threads.value = page.threads;
			nextCursor.value = page.nextCursor;
		} finally {
			loading.value = false;
		}
	}

	async function loadMore(projectId: string, agentId?: string) {
		if (!nextCursor.value || loading.value) return;
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
			threads.value.push(...page.threads);
			nextCursor.value = page.nextCursor;
		} finally {
			loading.value = false;
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
