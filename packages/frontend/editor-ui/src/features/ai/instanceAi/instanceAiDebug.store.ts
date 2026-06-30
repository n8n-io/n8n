import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import {
	fetchThreads,
	fetchThreadMessages,
	fetchRunDebug,
	fetchThreadDebugRuns,
} from './instanceAi.memory.api';
import type {
	InstanceAiThreadInfo,
	InstanceAiStoredMessage,
	InstanceAiRunDebugResponse,
	InstanceAiRunDebugSummary,
} from '@n8n/api-types';

export const useInstanceAiDebugStore = defineStore('instanceAiDebug', () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	// --- State ---
	const threads = ref<InstanceAiThreadInfo[]>([]);
	const selectedThreadId = ref<string | null>(null);
	const threadMessages = ref<InstanceAiStoredMessage[]>([]);
	const isLoadingThreads = ref(false);
	const isLoadingMessages = ref(false);

	const selectedRunId = ref<string | null>(null);
	const runDebug = ref<InstanceAiRunDebugResponse | null>(null);
	const threadDebugRuns = ref<InstanceAiRunDebugSummary[]>([]);
	const isLoadingRunDebug = ref(false);
	const isLoadingThreadDebugRuns = ref(false);

	// --- Actions ---
	async function loadThreads(): Promise<void> {
		isLoadingThreads.value = true;
		try {
			const result = await fetchThreads(rootStore.restApiContext);
			threads.value = result.threads;
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.debug.threads.fetchError')),
				'Thread Inspector',
			);
		} finally {
			isLoadingThreads.value = false;
		}
	}

	async function selectThread(threadId: string): Promise<void> {
		selectedThreadId.value = threadId;
		await loadMessages();
	}

	async function loadMessages(page?: number): Promise<void> {
		if (!selectedThreadId.value) return;
		isLoadingMessages.value = true;
		try {
			const result = await fetchThreadMessages(
				rootStore.restApiContext,
				selectedThreadId.value,
				50,
				page,
			);
			threadMessages.value = result.messages;
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.debug.threads.fetchError')),
				'Thread Inspector',
			);
		} finally {
			isLoadingMessages.value = false;
		}
	}

	async function loadThreadDebugRuns(threadId: string): Promise<void> {
		isLoadingThreadDebugRuns.value = true;
		try {
			const result = await fetchThreadDebugRuns(rootStore.restApiContext, threadId);
			threadDebugRuns.value = result.runs;
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.debug.runDebug.fetchError')),
				'Run Debug',
			);
		} finally {
			isLoadingThreadDebugRuns.value = false;
		}
	}

	async function loadRunDebug(runId: string): Promise<void> {
		selectedRunId.value = runId;
		isLoadingRunDebug.value = true;
		try {
			runDebug.value = await fetchRunDebug(rootStore.restApiContext, runId);
		} catch {
			runDebug.value = null;
			toast.showError(
				new Error(i18n.baseText('instanceAi.debug.runDebug.fetchError')),
				'Run Debug',
			);
		} finally {
			isLoadingRunDebug.value = false;
		}
	}

	async function refreshRunDebug(threadId: string, preferredRunId?: string | null): Promise<void> {
		await loadThreadDebugRuns(threadId);
		const selectedRunIdForThread = threadDebugRuns.value.some(
			(run) => run.runId === selectedRunId.value,
		)
			? selectedRunId.value
			: null;
		const runId =
			preferredRunId ?? selectedRunIdForThread ?? threadDebugRuns.value.at(-1)?.runId ?? null;
		if (runId) {
			await loadRunDebug(runId);
		} else {
			selectedRunId.value = null;
			runDebug.value = null;
		}
	}

	function reset(): void {
		threads.value = [];
		selectedThreadId.value = null;
		threadMessages.value = [];
		isLoadingThreads.value = false;
		isLoadingMessages.value = false;
		selectedRunId.value = null;
		runDebug.value = null;
		threadDebugRuns.value = [];
		isLoadingRunDebug.value = false;
		isLoadingThreadDebugRuns.value = false;
	}

	return {
		// State
		threads,
		selectedThreadId,
		threadMessages,
		isLoadingThreads,
		isLoadingMessages,
		selectedRunId,
		runDebug,
		threadDebugRuns,
		isLoadingRunDebug,
		isLoadingThreadDebugRuns,
		// Actions
		loadThreads,
		selectThread,
		loadMessages,
		loadRunDebug,
		refreshRunDebug,
		reset,
	};
});
