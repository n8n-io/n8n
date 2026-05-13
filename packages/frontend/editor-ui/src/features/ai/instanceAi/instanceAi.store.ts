import { defineStore } from 'pinia';
import { ref, computed, inject, provide, shallowReactive, type InjectionKey } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { UNLIMITED_CREDITS, type InstanceAiThreadSummary } from '@n8n/api-types';
import { ensureThread, getInstanceAiCredits } from './instanceAi.api';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import {
	fetchThreads as fetchThreadsApi,
	deleteThread as deleteThreadApi,
	renameThread as renameThreadApi,
	updateThreadMetadata as updateThreadMetadataApi,
} from './instanceAi.memory.api';
import { NEW_CONVERSATION_TITLE } from './constants';
import { createThreadRuntime, type ThreadRuntime } from './instanceAi.threadRuntime';

export type { PendingConfirmationItem, ThreadRuntime } from './instanceAi.threadRuntime';

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const toast = useToast();
	const persistedThreadIds = new Set<string>();

	// --- Instance-level state ---
	const threads = ref<InstanceAiThreadSummary[]>([]);
	const debugMode = ref(false);
	const researchMode = ref(localStorage.getItem('instanceAi.researchMode') === 'true');
	// Credits are instance-level state (not per-thread). Re-fetched on mount via fetchCredits(),
	// and updated in real-time via the 'updateInstanceAiCredits' push event.
	// No reset needed on thread switch — login/logout reloads the page.
	const creditsQuota = ref<number | undefined>(undefined);
	const creditsClaimed = ref<number | undefined>(undefined);

	// --- Thread runtimes ---
	const runtimes = shallowReactive(new Map<string, ThreadRuntime>());
	const runtimeHooks = {
		getResearchMode: () => researchMode.value,
		onTitleUpdated: (threadId, title) => {
			const thread = threads.value.find((t) => t.id === threadId);
			if (thread) thread.title = title;
		},
		// Refresh thread list to pick up Mastra-generated titles
		onRunFinish: () => {
			void loadThreads();
		},
	} satisfies Parameters<typeof createThreadRuntime>[1];

	function getOrCreateRuntime(threadId: string): ThreadRuntime {
		const existingRuntime = runtimes.get(threadId);
		if (existingRuntime) return existingRuntime;

		const runtime = createThreadRuntime(threadId, runtimeHooks);
		runtimes.set(threadId, runtime);
		return runtime;
	}

	function getRuntime(threadId: string): ThreadRuntime | undefined {
		return runtimes.get(threadId);
	}

	function disposeRuntime(threadId: string): void {
		const runtime = runtimes.get(threadId);
		if (!runtime) return;

		runtime.dispose();
		runtimes.delete(threadId);
	}

	function disposeRuntimes(): void {
		for (const runtime of runtimes.values()) {
			runtime.dispose();
		}
		runtimes.clear();
	}

	// --- Settings delegation ---
	const isGatewayConnected = computed(() => instanceAiSettingsStore.isGatewayConnected);
	const gatewayDirectory = computed(() => instanceAiSettingsStore.gatewayDirectory);
	const activeDirectory = computed(() => gatewayDirectory.value);

	// --- Computed credits ---
	const creditsRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsClaimed.value === undefined ||
			creditsQuota.value === UNLIMITED_CREDITS
		) {
			return undefined;
		}
		return Math.max(0, creditsQuota.value - creditsClaimed.value);
	});

	const creditsPercentageRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsQuota.value === UNLIMITED_CREDITS ||
			creditsRemaining.value === undefined
		) {
			return undefined;
		}
		if (creditsQuota.value === 0) return 0;
		return (creditsRemaining.value / creditsQuota.value) * 100;
	});

	const isLowCredits = computed(() => {
		return creditsPercentageRemaining.value !== undefined && creditsPercentageRemaining.value <= 10;
	});

	// --- Credits push listener ---

	let removeCreditsPushListener: (() => void) | null = null;

	function startCreditsPushListener(): void {
		if (removeCreditsPushListener) return;
		const pushStore = usePushConnectionStore();
		removeCreditsPushListener = pushStore.addEventListener((message) => {
			if (message.type !== 'updateInstanceAiCredits') return;
			creditsQuota.value = message.data.creditsQuota;
			creditsClaimed.value = message.data.creditsClaimed;
		});
	}

	function stopCreditsPushListener(): void {
		if (removeCreditsPushListener) {
			removeCreditsPushListener();
			removeCreditsPushListener = null;
		}
	}

	async function fetchCredits(): Promise<void> {
		try {
			const result = await getInstanceAiCredits(rootStore.restApiContext);
			creditsQuota.value = result.creditsQuota;
			creditsClaimed.value = result.creditsClaimed;
		} catch {
			// Non-critical — credits display is optional
		}
	}

	// --- Thread list & lifecycle ---

	async function loadThreads(): Promise<boolean> {
		try {
			const result = await fetchThreadsApi(rootStore.restApiContext);
			for (const thread of result.threads) {
				persistedThreadIds.add(thread.id);
			}
			// Merge server threads into local list, preserving any local-only threads
			// (e.g. a freshly created thread that hasn't been persisted yet)
			const serverIds = new Set(result.threads.map((t) => t.id));
			const localOnly = threads.value.filter((t) => !serverIds.has(t.id));
			const serverThreads: InstanceAiThreadSummary[] = result.threads.map((t) => ({
				id: t.id,
				title: t.title || NEW_CONVERSATION_TITLE,
				createdAt: t.createdAt,
				updatedAt: t.updatedAt,
				metadata: t.metadata ?? undefined,
			}));
			threads.value = [...localOnly, ...serverThreads];
			return true;
		} catch {
			// Silently ignore — threads will remain client-side only
			return false;
		}
	}

	async function syncThread(threadId: string): Promise<void> {
		if (persistedThreadIds.has(threadId)) return;

		const result = await ensureThread(rootStore.restApiContext, threadId);
		persistedThreadIds.add(result.thread.id);

		const existingThread = threads.value.find((thread) => thread.id === threadId);
		if (existingThread) {
			existingThread.createdAt = result.thread.createdAt;
			existingThread.updatedAt = result.thread.updatedAt;
			existingThread.title = result.thread.title || existingThread.title;
			return;
		}

		threads.value.unshift({
			id: result.thread.id,
			title: result.thread.title || NEW_CONVERSATION_TITLE,
			createdAt: result.thread.createdAt,
			updatedAt: result.thread.updatedAt,
		});
	}

	async function deleteThread(threadId: string): Promise<boolean> {
		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			try {
				await deleteThreadApi(rootStore.restApiContext, threadId);
				persistedThreadIds.delete(threadId);
			} catch {
				toast.showError(new Error('Failed to delete thread. Try again.'), 'Delete failed');
				return false;
			}
		}

		// Remove thread from list
		threads.value = threads.value.filter((t) => t.id !== threadId);
		disposeRuntime(threadId);

		return true;
	}

	async function renameThread(threadId: string, title: string): Promise<void> {
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) {
			thread.title = title;
		}

		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			await renameThreadApi(rootStore.restApiContext, threadId, title);
		}
	}

	function getThreadMetadata(threadId: string): Record<string, unknown> | undefined {
		return threads.value.find((t) => t.id === threadId)?.metadata;
	}

	async function updateThreadMetadata(
		threadId: string,
		metadata: Record<string, unknown>,
	): Promise<void> {
		// Optimistic update
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) {
			thread.metadata = { ...thread.metadata, ...metadata };
		}

		if (persistedThreadIds.has(threadId)) {
			await updateThreadMetadataApi(rootStore.restApiContext, threadId, metadata);
		}
	}

	function toggleResearchMode(): void {
		researchMode.value = !researchMode.value;
		localStorage.setItem('instanceAi.researchMode', String(researchMode.value));
	}

	return {
		// Instance-level state
		threads,
		debugMode,
		researchMode,
		creditsQuota,
		creditsClaimed,

		// Computed
		isGatewayConnected,
		gatewayDirectory,
		activeDirectory,
		creditsRemaining,
		creditsPercentageRemaining,
		isLowCredits,

		// Thread-list actions
		deleteThread,
		renameThread,
		getThreadMetadata,
		updateThreadMetadata,
		loadThreads,
		toggleResearchMode,
		fetchCredits,
		startCreditsPushListener,
		stopCreditsPushListener,
		getOrCreateRuntime,
		getRuntime,
		disposeRuntime,
		disposeRuntimes,
		syncThread,
	};
});

const ThreadKey: InjectionKey<ThreadRuntime> = Symbol('instanceAiThread');

export function provideThread(thread: ThreadRuntime | string): ThreadRuntime {
	if (typeof thread === 'string') {
		const runtime = useInstanceAiStore().getOrCreateRuntime(thread);
		provide(ThreadKey, runtime);
		return runtime;
	}
	provide(ThreadKey, thread);
	return thread;
}

export function useThread(threadId?: string): ThreadRuntime {
	if (threadId) {
		return useInstanceAiStore().getOrCreateRuntime(threadId);
	}

	const thread = inject(ThreadKey, null);
	if (!thread) {
		throw new Error('useThread() requires a provideThread() ancestor.');
	}
	return thread;
}
