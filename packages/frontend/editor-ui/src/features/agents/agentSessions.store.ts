import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	listThreads,
	deleteThread as deleteThreadApi,
	type ExecutionThread,
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

	async function fetchThreads(projectId: string) {
		currentProjectId = projectId;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(rootStore.restApiContext, projectId, ITEMS_PER_PAGE);
			threads.value = page.threads;
			nextCursor.value = page.nextCursor;
		} finally {
			loading.value = false;
		}
	}

	async function loadMore(projectId: string) {
		if (!nextCursor.value || loading.value) return;
		loading.value = true;
		try {
			const rootStore = useRootStore();
			const page = await listThreads(
				rootStore.restApiContext,
				projectId,
				ITEMS_PER_PAGE,
				nextCursor.value,
			);
			threads.value.push(...page.threads);
			nextCursor.value = page.nextCursor;
		} finally {
			loading.value = false;
		}
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
				await fetchThreads(currentProjectId);
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
	}

	return {
		threads,
		nextCursor,
		loading,
		autoRefresh,
		fetchThreads,
		loadMore,
		deleteThread,
		startAutoRefresh,
		stopAutoRefresh,
		reset,
	};
});
