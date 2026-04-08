import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { fetchThreads, fetchThreadMessages, fetchThreadContext } from './instanceAi.memory.api';
import type {
	InstanceAiThreadInfo,
	InstanceAiStoredMessage,
	InstanceAiThreadContextResponse,
} from '@n8n/api-types';

export const useInstanceAiDebugStore = defineStore('instanceAiDebug', () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	// --- State ---
	const threads = ref<InstanceAiThreadInfo[]>([]);
	const selectedThreadId = ref<string | null>(null);
	const threadMessages = ref<InstanceAiStoredMessage[]>([]);
	const threadContext = ref<InstanceAiThreadContextResponse | null>(null);
	const isLoadingThreads = ref(false);
	const isLoadingMessages = ref(false);
	const isLoadingContext = ref(false);

	// --- Computed ---
	const selectedThread = computed(() => threads.value.find((t) => t.id === selectedThreadId.value));

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
		await Promise.all([loadMessages(), loadContext()]);
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

	async function loadContext(): Promise<void> {
		if (!selectedThreadId.value) return;
		isLoadingContext.value = true;
		try {
			threadContext.value = await fetchThreadContext(
				rootStore.restApiContext,
				selectedThreadId.value,
			);
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.debug.threads.fetchError')),
				'Thread Inspector',
			);
		} finally {
			isLoadingContext.value = false;
		}
	}

	function reset(): void {
		threads.value = [];
		selectedThreadId.value = null;
		threadMessages.value = [];
		threadContext.value = null;
		isLoadingThreads.value = false;
		isLoadingMessages.value = false;
		isLoadingContext.value = false;
	}

	return {
		// State
		threads,
		selectedThreadId,
		threadMessages,
		threadContext,
		isLoadingThreads,
		isLoadingMessages,
		isLoadingContext,
		// Computed
		selectedThread,
		// Actions
		loadThreads,
		selectThread,
		loadMessages,
		loadContext,
		reset,
	};
});
