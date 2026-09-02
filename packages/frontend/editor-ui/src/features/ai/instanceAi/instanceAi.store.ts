import { defineStore } from 'pinia';
import { ref, computed, inject, provide, shallowReactive, type InjectionKey } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	UNLIMITED_CREDITS,
	type InstanceAiThreadSummary,
	type InstanceAiAttachment,
	type InstanceAiNodesAttachment,
	type PushMessage,
} from '@n8n/api-types';
import {
	ensureThread,
	getInstanceAiCredits,
	type InstanceAiThreadLaunchInput,
} from './instanceAi.api';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import {
	fetchThreads as fetchThreadsApi,
	deleteThread as deleteThreadApi,
	renameThread as renameThreadApi,
	updateThreadMetadata as updateThreadMetadataApi,
} from './instanceAi.memory.api';
import { NEW_CONVERSATION_TITLE } from './constants';
import { createThreadRuntime, type ThreadRuntime } from './instanceAi.threadRuntime';
import { mergeNodeSets } from './utils/buildNodesAttachment';

export type { PendingConfirmationItem, ThreadRuntime } from './instanceAi.threadRuntime';

type InstanceAiCreditsPushData = Extract<PushMessage, { type: 'updateInstanceAiCredits' }>['data'];

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const persistedThreadIds = new Set<string>();

	// --- Instance-level state ---
	const threads = ref<InstanceAiThreadSummary[]>([]);
	const debugMode = ref(false);
	// Credits are instance-level state (not per-thread). Re-fetched on mount via fetchCredits(),
	// and updated in real-time via the 'updateInstanceAiCredits' push event.
	// No reset needed on thread switch — login/logout reloads the page.
	const creditsQuota = ref<number | undefined>(undefined);
	const creditsClaimed = ref<number | undefined>(undefined);
	/** Whether the pool has been locked by the activation cap. */
	const quotaLocked = ref(false);

	// --- Progressive building mode ---
	// A single client-side toggle (like the legacy builder's mode selector), not
	// keyed by thread: the empty view only allocates a threadId at submit time.
	// The backend keeps it sticky per thread from the latest user message.
	// Default on while the PoC is dogfooded; the selector opts out per session.
	const progressiveMode = ref(true);

	function setProgressiveMode(enabled: boolean): void {
		if (progressiveMode.value === enabled) return;
		progressiveMode.value = enabled;
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_TOGGLED_PROGRESSIVE_BUILDING, {
			enabled,
		});
	}

	// --- Thread runtimes ---
	const runtimes = shallowReactive(new Map<string, ThreadRuntime>());
	const runtimeHooks = {
		onTitleUpdated: (threadId, title) => {
			const thread = threads.value.find((t) => t.id === threadId);
			if (thread) thread.title = title;
		},
		// Refresh thread list to pick up auto-generated titles
		onRunFinish: () => {
			void loadThreads();
		},
		getThreadMetadata: (threadId) => threads.value.find((t) => t.id === threadId)?.metadata,
		getBuildMode: () => (progressiveMode.value ? ('progressive' as const) : undefined),
	} satisfies Parameters<typeof createThreadRuntime>[1];

	function getOrCreateRuntime(threadId: string, projectId?: string): ThreadRuntime {
		const existingRuntime = runtimes.get(threadId);
		if (existingRuntime) return existingRuntime;

		const runtime = createThreadRuntime(threadId, runtimeHooks, projectId);
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

	/**
	 * Whether to warn about credits above the chat input: either the balance is running low, or the
	 * pool has been locked outright. The two are mutually exclusive in practice — a cohort with a
	 * masked balance can never read as "low" — so this is the single condition the views use.
	 */
	const showCreditWarning = computed(() => isLowCredits.value || quotaLocked.value);

	// --- Credits push handling ---

	// Applies an `updateInstanceAiCredits` push. The instance-ai module descriptor
	// registers this through its `pushHandlers`, so the shell owns the subscription
	// lifecycle and credits stay current instance-wide; the store just applies the
	// payload.
	function handleCreditsPush(data: InstanceAiCreditsPushData): void {
		creditsQuota.value = data.creditsQuota;
		creditsClaimed.value = data.creditsClaimed;
		// Absent means "no opinion", not "unlocked". Only the lock itself reports this; a claim
		// push carries no lock state, and claims can land after the lock — a background memory
		// task or a fire-and-forget HITL segment claim from an earlier run — so treating absence
		// as false would clear the warning the lock had just raised.
		if (data.quotaLocked !== undefined) {
			quotaLocked.value = data.quotaLocked;
		}
		// Per-message claims also carry the thread's running total — write it onto the
		// matching thread so the credits dropdown updates live for the acting user.
		const { creditsPerThread } = data;
		if (creditsPerThread !== undefined) {
			const thread = threads.value.find((t) => t.id === creditsPerThread.threadId);
			if (thread) {
				thread.metadata = { ...thread.metadata, creditsUsed: creditsPerThread.totalCreditsUsed };
			}
		}
	}

	async function fetchCredits(): Promise<void> {
		try {
			const result = await getInstanceAiCredits(rootStore.restApiContext);
			creditsQuota.value = result.creditsQuota;
			creditsClaimed.value = result.creditsClaimed;
			quotaLocked.value = result.quotaLocked ?? false;
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

	async function syncThread(
		threadId: string,
		projectId: string,
		launch: InstanceAiThreadLaunchInput,
	): Promise<void> {
		if (persistedThreadIds.has(threadId)) return;

		const result = await ensureThread(rootStore.restApiContext, threadId, projectId, launch);
		persistedThreadIds.add(result.thread.id);

		const templateId = launch.sourceContext?.templateId;
		telemetry.track('User launched Instance AI thread', {
			thread_id: result.thread.id,
			instance_id: rootStore.instanceId,
			source: launch.source,
			origin: launch.origin ?? 'internal',
			...(typeof templateId === 'string' || typeof templateId === 'number'
				? { template_id: templateId }
				: {}),
		});

		const existingThread = threads.value.find((thread) => thread.id === threadId);
		if (existingThread) {
			existingThread.createdAt = result.thread.createdAt;
			existingThread.updatedAt = result.thread.updatedAt;
			existingThread.title = result.thread.title || existingThread.title;
			existingThread.metadata = result.thread.metadata ?? existingThread.metadata;
			return;
		}

		threads.value.unshift({
			id: result.thread.id,
			title: result.thread.title || NEW_CONVERSATION_TITLE,
			createdAt: result.thread.createdAt,
			updatedAt: result.thread.updatedAt,
			metadata: result.thread.metadata ?? undefined,
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

	/** Reactive per-thread credit total (decimal), or undefined if none recorded yet. */
	function threadCreditsUsed(threadId: string): number | undefined {
		const used = threads.value.find((t) => t.id === threadId)?.metadata?.creditsUsed;
		return typeof used === 'number' ? used : undefined;
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

	const pendingComposerAttachments = ref<InstanceAiAttachment[]>([]);

	function stageNodeSets(workflowId: string, newSets: InstanceAiNodesAttachment['sets']): void {
		const existing = pendingComposerAttachments.value.find(
			(a): a is InstanceAiNodesAttachment => a.type === 'nodes' && a.workflowId === workflowId,
		);
		if (existing) {
			existing.sets = mergeNodeSets(existing.sets, newSets);
		} else {
			pendingComposerAttachments.value = [
				...pendingComposerAttachments.value,
				{ type: 'nodes', workflowId, sets: newSets },
			];
		}
	}

	function consumePendingAttachments(): InstanceAiAttachment[] {
		const staged = pendingComposerAttachments.value;
		pendingComposerAttachments.value = [];
		return staged;
	}

	const composerFocusRequest = ref(0);
	function requestComposerFocus(): void {
		composerFocusRequest.value++;
	}

	const clearCanvasSelectionRequest = ref(0);
	function requestClearCanvasSelection(): void {
		clearCanvasSelectionRequest.value++;
	}

	return {
		// Instance-level state
		threads,
		debugMode,
		creditsQuota,
		creditsClaimed,
		progressiveMode,
		setProgressiveMode,

		// Computed
		isGatewayConnected,
		gatewayDirectory,
		activeDirectory,
		creditsRemaining,
		creditsPercentageRemaining,
		isLowCredits,
		quotaLocked,
		showCreditWarning,

		// Thread-list actions
		deleteThread,
		renameThread,
		getThreadMetadata,
		threadCreditsUsed,
		updateThreadMetadata,
		loadThreads,
		fetchCredits,
		handleCreditsPush,
		getOrCreateRuntime,
		getRuntime,
		disposeRuntime,
		syncThread,
		pendingComposerAttachments,
		stageNodeSets,
		consumePendingAttachments,
		composerFocusRequest,
		requestComposerFocus,
		clearCanvasSelectionRequest,
		requestClearCanvasSelection,
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
