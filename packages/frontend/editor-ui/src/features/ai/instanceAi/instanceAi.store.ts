import { defineStore } from 'pinia';
import { ref, computed, inject, provide, type InjectionKey } from 'vue';
import { v4 as uuidv4 } from 'uuid';
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
import { createThreadRuntime } from './instanceAi.threadRuntime';

export type { PendingConfirmationItem } from './instanceAi.threadRuntime';

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

	// --- Active thread runtime ---
	// Per-thread state (messages, SSE, reducer state, hydration) lives here.
	// The runtime is mutable via `switchTo(threadId)`; refs keep their identity
	// so external watchers (and re-exports below) continue working across switches.
	const runtime = createThreadRuntime(uuidv4(), {
		getResearchMode: () => researchMode.value,
		onTitleUpdated: (threadId, title) => {
			const thread = threads.value.find((t) => t.id === threadId);
			if (thread) thread.title = title;
		},
		// Refresh thread list to pick up Mastra-generated titles
		onRunFinish: () => {
			void loadThreads();
		},
	});

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

	function switchThread(threadId: string): void {
		runtime.switchTo(threadId);
		// Load rich historical messages first, then connect SSE after.
		// loadHistoricalMessages sets the SSE cursor (nextEventId) so SSE
		// only receives events that arrived AFTER the historical snapshot.
		void runtime.loadHistoricalMessages(threadId).then((hydrationStatus) => {
			if (hydrationStatus !== 'applied') return;
			void runtime.loadThreadStatus(threadId);
			runtime.connectSSE(threadId);
		});
	}

	/**
	 * Reset the store to a blank "no active thread" state — used when the user
	 * lands on the base `/instance-ai` route (fresh page, back button, or the
	 * AI Assistant nav link). Without this, `currentThreadId` keeps pointing
	 * at the last thread and the sidebar highlights it alongside the empty
	 * main view.
	 */
	function clearCurrentThread(): void {
		runtime.closeSSE();
		runtime.resetState(null);
		// Mirror the initial store state: a fresh UUID that doesn't match any
		// real thread, so the sidebar highlights nothing. EmptyView's
		// `handleSubmit` later promotes this id to a real thread via `syncThread`.
		runtime.currentThreadId.value = uuidv4();
	}

	function newThread(): string {
		const newThreadId = uuidv4();
		runtime.closeSSE();
		runtime.resetState(null);
		runtime.currentThreadId.value = newThreadId;
		runtime.connectSSE(newThreadId);
		return newThreadId;
	}

	async function deleteThread(
		threadId: string,
	): Promise<{ currentThreadId: string; wasActive: boolean }> {
		const wasActive = threadId === runtime.currentThreadId.value;

		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			try {
				await deleteThreadApi(rootStore.restApiContext, threadId);
				persistedThreadIds.delete(threadId);
			} catch {
				toast.showError(new Error('Failed to delete thread. Try again.'), 'Delete failed');
				return { currentThreadId: runtime.currentThreadId.value, wasActive };
			}
		}

		// Remove thread from list
		threads.value = threads.value.filter((t) => t.id !== threadId);

		// Clean up event cursor for the deleted thread
		delete runtime.lastEventIdByThread.value[threadId];

		if (wasActive) {
			if (threads.value.length > 0) {
				// Switch to first remaining thread
				switchThread(threads.value[0].id);
			} else {
				// No threads left — prepare a fresh thread (added to sidebar on first message)
				const freshId = uuidv4();
				runtime.closeSSE();
				runtime.resetState(null);
				runtime.currentThreadId.value = freshId;
				runtime.connectSSE(freshId);
			}
		}

		return { currentThreadId: runtime.currentThreadId.value, wasActive };
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

		// Per-thread state (re-exported from runtime — refs)
		currentThreadId: runtime.currentThreadId,
		sseState: runtime.sseState,
		lastEventIdByThread: runtime.lastEventIdByThread,
		activeRunId: runtime.activeRunId,
		messages: runtime.messages,
		debugEvents: runtime.debugEvents,
		amendContext: runtime.amendContext,
		resolvedConfirmationIds: runtime.resolvedConfirmationIds,
		feedbackByResponseId: runtime.feedbackByResponseId,

		// Computed (re-exported)
		isStreaming: runtime.isStreaming,
		isSendingMessage: runtime.isSendingMessage,
		hasMessages: runtime.hasMessages,
		isHydratingThread: runtime.isHydratingThread,
		isGatewayConnected,
		gatewayDirectory,
		activeDirectory,
		contextualSuggestion: runtime.contextualSuggestion,
		currentTasks: runtime.currentTasks,
		producedArtifacts: runtime.producedArtifacts,
		resourceNameIndex: runtime.resourceNameIndex,
		rateableResponseId: runtime.rateableResponseId,
		creditsRemaining,
		creditsPercentageRemaining,
		isLowCredits,
		pendingConfirmations: runtime.pendingConfirmations,
		isAwaitingConfirmation: runtime.isAwaitingConfirmation,

		// Thread-list actions (instance-level)
		newThread,
		clearCurrentThread,
		deleteThread,
		renameThread,
		getThreadMetadata,
		updateThreadMetadata,
		switchThread,
		loadThreads,
		toggleResearchMode,
		fetchCredits,
		startCreditsPushListener,
		stopCreditsPushListener,

		// Per-thread actions (re-exported from runtime)
		loadHistoricalMessages: runtime.loadHistoricalMessages,
		loadThreadStatus: runtime.loadThreadStatus,
		syncThread,
		sendMessage: runtime.sendMessage,
		cancelRun: runtime.cancelRun,
		cancelBackgroundTask: runtime.cancelBackgroundTask,
		amendAgent: runtime.amendAgent,
		confirmAction: runtime.confirmAction,
		confirmResourceDecision: runtime.confirmResourceDecision,
		resolveConfirmation: runtime.resolveConfirmation,
		findToolCallByRequestId: runtime.findToolCallByRequestId,
		copyFullTrace: runtime.copyFullTrace,
		submitFeedback: runtime.submitFeedback,
		connectSSE: runtime.connectSSE,
		closeSSE: runtime.closeSSE,
	};
});

export type ThreadRuntime = ReturnType<typeof useInstanceAiStore>;

const ThreadKey: InjectionKey<ThreadRuntime> = Symbol('instanceAiThread');

export function provideThread(thread: ThreadRuntime): ThreadRuntime {
	provide(ThreadKey, thread);
	return thread;
}

export function useThread(): ThreadRuntime {
	const thread = inject(ThreadKey, null);
	if (!thread) {
		throw new Error('useThread() requires a provideThread() ancestor.');
	}
	return thread;
}
