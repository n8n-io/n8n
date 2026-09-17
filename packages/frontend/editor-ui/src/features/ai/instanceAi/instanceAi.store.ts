import { defineStore } from 'pinia';
import {
	ref,
	computed,
	effectScope,
	inject,
	provide,
	shallowReactive,
	type EffectScope,
	type InjectionKey,
} from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	UNLIMITED_CREDITS,
	type InstanceAiThreadHistoryResponse,
	type InstanceAiThreadInfo,
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
	fetchThreadHistory,
	fetchThread,
	deleteThread as deleteThreadApi,
	renameThread as renameThreadApi,
	updateThreadMetadata as updateThreadMetadataApi,
} from './instanceAi.memory.api';
import { NEW_CONVERSATION_TITLE } from './constants';
import { createThreadRuntime, type ThreadRuntime } from './instanceAi.threadRuntime';
import { mergeNodeSets } from './utils/buildNodesAttachment';

export type { PendingConfirmationItem, ThreadRuntime } from './instanceAi.threadRuntime';

type InstanceAiCreditsPushData = Extract<PushMessage, { type: 'updateInstanceAiCredits' }>['data'];

const THREAD_HISTORY_PAGE_SIZE = 30;

const emptyThreadHistory = (search = '') => ({
	search,
	threads: [] as InstanceAiThreadSummary[],
	hasMore: true,
	loading: false,
	error: false,
});

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const persistedThreadIds = new Set<string>();

	// --- Instance-level state ---
	const threads = ref<InstanceAiThreadSummary[]>([]);
	// The chat history page: cursor-paginated and searchable, kept apart from the sidebar list.
	const threadHistory = ref(emptyThreadHistory());
	const debugMode = ref(false);
	// Credits are instance-level state (not per-thread). Re-fetched on mount via fetchCredits(),
	// and updated in real-time via the 'updateInstanceAiCredits' push event.
	// No reset needed on thread switch — login/logout reloads the page.
	const creditsQuota = ref<number | undefined>(undefined);
	const creditsClaimed = ref<number | undefined>(undefined);
	/** Whether the pool has been locked by the activation cap. */
	const quotaLocked = ref(false);

	// --- Thread runtimes ---
	const runtimes = shallowReactive(new Map<string, ThreadRuntime>());
	// Detached scopes owning each runtime's watchers. The runtime must outlive the
	// component that created it: a Suspense duplicate of the thread view can create
	// it in setup and be discarded, and a component scope would take the watchers
	// (e.g. the resource registry) down with it.
	const runtimeScopes = new Map<string, EffectScope>();
	const runtimeHooks = {
		onTitleUpdated: (threadId, title) => {
			for (const thread of localThreadEntries(threadId)) thread.title = title;
		},
		// Refresh thread list to pick up auto-generated titles
		onRunFinish: () => {
			void loadThreads();
		},
		getThreadMetadata: (threadId) => threads.value.find((t) => t.id === threadId)?.metadata,
	} satisfies Parameters<typeof createThreadRuntime>[1];

	function getOrCreateRuntime(threadId: string, projectId?: string): ThreadRuntime {
		const existingRuntime = runtimes.get(threadId);
		if (existingRuntime) return existingRuntime;

		const scope = effectScope(true);
		const runtime = scope.run(() => createThreadRuntime(threadId, runtimeHooks, projectId));
		if (!runtime) throw new Error('Failed to create thread runtime');
		runtimes.set(threadId, runtime);
		runtimeScopes.set(threadId, scope);
		return runtime;
	}

	function getRuntime(threadId: string): ThreadRuntime | undefined {
		return runtimes.get(threadId);
	}

	function disposeRuntime(threadId: string): void {
		const runtime = runtimes.get(threadId);
		if (!runtime) return;

		runtime.dispose();
		runtimeScopes.get(threadId)?.stop();
		runtimeScopes.delete(threadId);
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

	function toThreadSummary(thread: InstanceAiThreadInfo): InstanceAiThreadSummary {
		return {
			id: thread.id,
			title: thread.title || NEW_CONVERSATION_TITLE,
			createdAt: thread.createdAt,
			updatedAt: thread.updatedAt,
			metadata: thread.metadata ?? undefined,
		};
	}

	/** Every local copy of a thread; the sidebar list and the history page can both hold one. */
	function localThreadEntries(threadId: string): InstanceAiThreadSummary[] {
		return [...threads.value, ...threadHistory.value.threads].filter((t) => t.id === threadId);
	}

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
			threads.value = [...localOnly, ...result.threads.map(toThreadSummary)];
			return true;
		} catch {
			// Silently ignore — threads will remain client-side only
			return false;
		}
	}

	/** Fetch a thread the sidebar list does not hold, e.g. an older one opened by URL. */
	async function loadThread(threadId: string): Promise<void> {
		const { thread } = await fetchThread(rootStore.restApiContext, threadId);
		persistedThreadIds.add(thread.id);
		if (!threads.value.some((t) => t.id === thread.id)) {
			threads.value.push(toThreadSummary(thread));
		}
	}

	let threadHistoryCursor: string | undefined;
	// Bumped by every reset so a response still in flight for the old state is dropped.
	let threadHistoryRequest = 0;

	function resetThreadHistory(search = ''): void {
		threadHistoryRequest++;
		threadHistoryCursor = undefined;
		threadHistory.value = emptyThreadHistory(search);
	}

	async function loadThreadHistoryPage(): Promise<void> {
		const history = threadHistory.value;
		if (history.loading || !history.hasMore) return;
		const request = threadHistoryRequest;
		history.loading = true;
		history.error = false;
		let result: InstanceAiThreadHistoryResponse | undefined;
		try {
			result = await fetchThreadHistory(rootStore.restApiContext, {
				limit: THREAD_HISTORY_PAGE_SIZE,
				search: history.search || undefined,
				cursor: threadHistoryCursor,
			});
		} catch {
			// Reported through `error` below
		}
		if (request !== threadHistoryRequest) return;
		history.loading = false;
		if (!result) {
			history.error = true;
			return;
		}
		for (const thread of result.threads) {
			persistedThreadIds.add(thread.id);
		}
		// A thread that gets activity while paging moves onto a later page; keep each row once.
		const known = new Set(history.threads.map((t) => t.id));
		history.threads.push(...result.threads.filter((t) => !known.has(t.id)).map(toThreadSummary));
		threadHistoryCursor = result.nextCursor ?? undefined;
		history.hasMore = result.hasMore;
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

		threads.value.unshift(toThreadSummary(result.thread));
	}

	/**
	 * Delete a thread. Returns false if the backend refused, in which case the thread is
	 * left in the list because it genuinely still exists.
	 *
	 * `silent` suppresses the failure toast, for callers cleaning up after some other
	 * failure they have already reported -- a second, unrelated "delete failed" on top of
	 * the real error only confuses. Those callers should handle `false` themselves.
	 */
	async function deleteThread(
		threadId: string,
		options: { silent?: boolean } = {},
	): Promise<boolean> {
		// Only call API for threads that have been persisted to the backend
		if (persistedThreadIds.has(threadId)) {
			try {
				await deleteThreadApi(rootStore.restApiContext, threadId);
				persistedThreadIds.delete(threadId);
			} catch {
				if (!options.silent) {
					toast.showError(new Error('Failed to delete thread. Try again.'), 'Delete failed');
				}
				return false;
			}
		}

		// Remove thread from list
		threads.value = threads.value.filter((t) => t.id !== threadId);
		threadHistory.value.threads = threadHistory.value.threads.filter((t) => t.id !== threadId);
		disposeRuntime(threadId);

		return true;
	}

	async function renameThread(threadId: string, title: string): Promise<void> {
		const entries = localThreadEntries(threadId);
		const previousTitle = entries[0]?.title;
		for (const entry of entries) entry.title = title;

		// Only call API for threads that have been persisted to the backend
		if (!persistedThreadIds.has(threadId)) return;
		try {
			await renameThreadApi(rootStore.restApiContext, threadId, title);
		} catch (error) {
			// Roll back the optimistic title so the list does not keep a name the server rejected
			if (previousTitle !== undefined) {
				for (const entry of entries) entry.title = previousTitle;
			}
			throw error;
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

	/**
	 * Replace a thread's metadata with an authoritative server copy — used after a
	 * write the server itself made (e.g. persisting a pending agent binds it),
	 * where a merge would keep locally-known keys the server just removed.
	 */
	function setThreadMetadata(threadId: string, metadata: Record<string, unknown> | undefined) {
		const thread = threads.value.find((t) => t.id === threadId);
		if (thread) thread.metadata = metadata;
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
		setThreadMetadata,
		loadThreads,
		loadThread,
		threadHistory,
		resetThreadHistory,
		loadThreadHistoryPage,
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
