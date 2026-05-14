import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	confirmSession,
	getSessionState,
	startSession,
	type BuilderV2ConnectionContext,
	type BuilderV2Ghost,
	type BuilderV2InsertionPoint,
	type BuilderV2NarrativeMessage,
	type BuilderV2Task,
} from '../builder-v2.api';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { builderV2GhostId, isBuilderV2GhostId } from '../utils/ghostIds';

export interface BuilderV2StoreState {
	sessionId: string | null;
	activeWorkflowId: string | null;
	projectId: string | null;
	taskList: BuilderV2Task[];
	ghosts: BuilderV2Ghost[];
	insertionPoint: BuilderV2InsertionPoint | null;
	connectionContext: BuilderV2ConnectionContext | null;
	narrative: BuilderV2NarrativeMessage[];
	done: boolean;
	workflow: unknown;
	isLoading: boolean;
	error: string | null;
	/** Full visible transcript across builder runs in this panel. */
	chatMessages: BuilderV2NarrativeMessage[];
	/** User-typed messages we display optimistically (backend narrative is assistant-only). */
	userPrompts: string[];
	/** Mirrors `BuilderV2State.hasPendingSuspension` — true when BE is awaiting user input. */
	hasPendingSuspension: boolean;
}

export const useBuilderV2Store = defineStore('builderV2', () => {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	/**
	 * Resolves the current workflow's document store. Used by pick/reject to
	 * apply optimistic mutations directly, mirroring what the sync composable
	 * would do on the next refresh.
	 */
	function resolveDocStore(workflowId = workflowsStore.workflowId) {
		try {
			return useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		} catch {
			return null;
		}
	}

	const sessionId = ref<string | null>(null);
	const activeWorkflowId = ref<string | null>(null);
	const projectId = ref<string | null>(null);
	const taskList = ref<BuilderV2Task[]>([]);
	const ghosts = ref<BuilderV2Ghost[]>([]);
	const insertionPoint = ref<BuilderV2InsertionPoint | null>(null);
	const connectionContext = ref<BuilderV2ConnectionContext | null>(null);
	const narrative = ref<BuilderV2NarrativeMessage[]>([]);
	const done = ref(false);
	const workflow = ref<unknown>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);
	const chatMessages = ref<BuilderV2NarrativeMessage[]>([]);
	const chatMessagesBeforeCurrentSession = ref<BuilderV2NarrativeMessage[]>([]);
	const userPrompts = ref<string[]>([]);
	const hasPendingSuspension = ref(false);
	/** Index of the ghost currently being picked. Used by the canvas for an optimistic UI hint. */
	const pickingIndex = ref<number | null>(null);

	const hasSession = computed(() => sessionId.value !== null);
	const hasGhosts = computed(() => ghosts.value.length > 0);

	/**
	 * The agent is suspended (BE awaiting user input) but there are no ghosts
	 * on screen and the run isn't done. This shouldn't happen under normal flow
	 * — when it does, the user has no way to make progress. The FE surfaces an
	 * inline banner with Cancel + Retry actions when this is true.
	 */
	const isStuck = computed(
		() =>
			hasPendingSuspension.value &&
			!hasGhosts.value &&
			!done.value &&
			!isLoading.value &&
			hasSession.value,
	);

	function clearGhostNodes(workflowId = workflowsStore.workflowId) {
		const doc = resolveDocStore(workflowId);
		if (!doc) return;
		for (const node of [...doc.allNodes]) {
			if (isBuilderV2GhostId(node.id)) {
				doc.removeAllNodeConnection(node);
				doc.removeNodeById(node.id);
			}
		}
	}

	function clearActiveSessionState(workflowId = workflowsStore.workflowId) {
		clearGhostNodes(workflowId);
		sessionId.value = null;
		taskList.value = [];
		ghosts.value = [];
		insertionPoint.value = null;
		connectionContext.value = null;
		narrative.value = [];
		done.value = false;
		workflow.value = null;
		hasPendingSuspension.value = false;
		pickingIndex.value = null;
	}

	async function refreshState() {
		if (!sessionId.value || !projectId.value) return;
		try {
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] refreshState begin', { sessionId: sessionId.value });
			const state = await getSessionState(
				rootStore.restApiContext,
				projectId.value,
				sessionId.value,
			);
			taskList.value = state.taskList ?? [];
			ghosts.value = state.ghosts ?? [];
			insertionPoint.value = state.insertionPoint ?? null;
			connectionContext.value = state.connectionContext ?? null;
			narrative.value = state.narrative ?? [];
			chatMessages.value = [...chatMessagesBeforeCurrentSession.value, ...(state.narrative ?? [])];
			done.value = state.done;
			workflow.value = state.workflow;
			hasPendingSuspension.value = state.hasPendingSuspension ?? false;
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] refreshState ok', {
				ghosts: ghosts.value.length,
				tasks: taskList.value.length,
				done: done.value,
				hasPendingSuspension: hasPendingSuspension.value,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			// eslint-disable-next-line no-console
			console.warn('[builder-v2] refreshState failed', message);
			error.value = message;
		}
	}

	async function startNewSession(
		nextProjectId: string,
		prompt: string,
		workflowJson: unknown,
		context: {
			insertionPoint?: BuilderV2InsertionPoint;
			connectionContext?: BuilderV2ConnectionContext;
		} = {},
	) {
		isLoading.value = true;
		error.value = null;
		const nextActiveWorkflowId = workflowsStore.workflowId;
		const previousMessages = [...chatMessages.value];
		const nextPromptMessage: BuilderV2NarrativeMessage = { role: 'user', content: prompt };
		chatMessagesBeforeCurrentSession.value = [...previousMessages, nextPromptMessage];
		chatMessages.value = chatMessagesBeforeCurrentSession.value;
		userPrompts.value = [...userPrompts.value, prompt];
		clearActiveSessionState(activeWorkflowId.value ?? workflowsStore.workflowId);
		activeWorkflowId.value = nextActiveWorkflowId;
		try {
			projectId.value = nextProjectId;
			const res = await startSession(rootStore.restApiContext, nextProjectId, {
				prompt,
				workflowJson,
				...context,
			});
			sessionId.value = res.sessionId;
			await refreshState();
		} catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
		} finally {
			isLoading.value = false;
		}
	}

	async function pickGhost(index: number) {
		if (!sessionId.value || !projectId.value) {
			// eslint-disable-next-line no-console
			console.warn('[builder-v2] pickGhost called without an active session', { index });
			return;
		}
		if (isLoading.value) {
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] pickGhost ignored — already in flight', { index });
			return;
		}
		// eslint-disable-next-line no-console
		console.debug('[builder-v2] pickGhost begin', { index });
		isLoading.value = true;
		pickingIndex.value = index;
		error.value = null;

		// Snapshot the ghosts we're about to optimistically mutate so we can
		// restore them on backend failure.
		const ghostsAtPick = ghosts.value.map((g) => ({ ...g }));
		const snapshotSessionId = sessionId.value;
		const doc = resolveDocStore();

		// Capture the on-canvas position of the picked ghost BEFORE we mutate the
		// doc — we forward it to the BE so the committed node lands at exactly
		// the spot the user saw the ghost.
		let pickedPosition: [number, number] | undefined;
		if (doc) {
			const winningId = builderV2GhostId(snapshotSessionId, index);
			const winning = doc.getNodeById(winningId);
			if (winning) {
				pickedPosition = [winning.position[0], winning.position[1]];
			}
		}

		// Optimistic update: remove losing ghost nodes (and their preview
		// connections) from the doc immediately. Keep the winning ghost in place
		// with its ghost id + preview connection while the backend commits; the
		// canvas already renders it as the picked/in-flight ghost via
		// `pickingIndex`. Clearing the ghost flags here leaves a real-looking
		// node with a reusable ghost id, which can collide with the next
		// proposal's `idx=0` ghost and make the previous node appear again.
		if (doc) {
			for (let i = 0; i < ghostsAtPick.length; i++) {
				if (i === index) continue;
				const id = builderV2GhostId(snapshotSessionId, i);
				const node = doc.getNodeById(id);
				if (node) {
					doc.removeAllNodeConnection(node);
				}
				doc.removeNodeById(id);
			}
		}

		try {
			await confirmSession(rootStore.restApiContext, projectId.value, sessionId.value, {
				kind: 'pick',
				chosenIndex: index,
				...(pickedPosition ? { pickedPosition } : {}),
			});
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] pickGhost confirm ok', { index });
			await refreshState();
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] pickGhost complete', { index });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			// eslint-disable-next-line no-console
			console.error('[builder-v2] pickGhost failed', { index, message });
			error.value = message;
			// Revert optimistic changes by re-seeding the store ghosts. The sync
			// composable will re-add the doc nodes on the next tick.
			ghosts.value = ghostsAtPick;
		} finally {
			isLoading.value = false;
			pickingIndex.value = null;
		}
	}

	async function rejectGhosts() {
		if (!sessionId.value || !projectId.value) return;
		if (isLoading.value) {
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] rejectGhosts ignored — already in flight');
			return;
		}
		// eslint-disable-next-line no-console
		console.debug('[builder-v2] rejectGhosts begin');
		isLoading.value = true;
		error.value = null;

		// Optimistic update: remove every ghost (and its preview connections)
		// from the doc immediately so the canvas clears before the BE
		// round-trip.
		const doc = resolveDocStore();
		if (doc) {
			for (const node of [...doc.allNodes]) {
				if (isBuilderV2GhostId(node.id)) {
					doc.removeAllNodeConnection(node);
					doc.removeNodeById(node.id);
				}
			}
		}
		const ghostsAtReject = ghosts.value.map((g) => ({ ...g }));

		try {
			await confirmSession(rootStore.restApiContext, projectId.value, sessionId.value, {
				kind: 'reject',
			});
			// eslint-disable-next-line no-console
			console.debug('[builder-v2] rejectGhosts confirm ok');
			await refreshState();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			// eslint-disable-next-line no-console
			console.error('[builder-v2] rejectGhosts failed', message);
			error.value = message;
			// Restore ghosts in the store; the sync composable will re-add the
			// doc nodes.
			ghosts.value = ghostsAtReject;
		} finally {
			isLoading.value = false;
		}
	}

	function reset(options: { workflowId?: string } = {}) {
		// Drop any ghost nodes (and their preview connections) from the doc
		// store before clearing the session. The sync composable would clean
		// them up on its next watch tick, but reset() can be called
		// synchronously before that fires.
		clearActiveSessionState(
			options.workflowId ?? activeWorkflowId.value ?? workflowsStore.workflowId,
		);
		activeWorkflowId.value = null;
		projectId.value = null;
		isLoading.value = false;
		error.value = null;
		chatMessages.value = [];
		chatMessagesBeforeCurrentSession.value = [];
		userPrompts.value = [];
	}

	/**
	 * Re-issue the most recent user prompt, starting a fresh session. Used by
	 * the "stuck state" escape hatch in the chat panel. Returns silently when
	 * there's nothing to retry (no prior prompt or no project context).
	 */
	async function retryLastPrompt(workflowJson: unknown) {
		const last = userPrompts.value[userPrompts.value.length - 1];
		const project = projectId.value;
		if (!last || !project) {
			// eslint-disable-next-line no-console
			console.warn('[builder-v2] retryLastPrompt — nothing to retry');
			return;
		}
		reset();
		await startNewSession(project, last, workflowJson);
	}

	watch(
		() => workflowsStore.workflowId,
		(nextWorkflowId, previousWorkflowId) => {
			if (activeWorkflowId.value !== previousWorkflowId) return;

			// Saving a newly-created workflow swaps the active workflow id from
			// '' to the server id without changing the user's canvas. Keep the
			// active builder session attached to that document instead of
			// treating this as navigation.
			if (!previousWorkflowId && nextWorkflowId) {
				activeWorkflowId.value = nextWorkflowId;
				return;
			}

			reset({ workflowId: previousWorkflowId });
		},
		{ flush: 'sync' },
	);

	return {
		// state
		sessionId,
		activeWorkflowId,
		projectId,
		taskList,
		ghosts,
		insertionPoint,
		connectionContext,
		narrative,
		done,
		workflow,
		isLoading,
		error,
		chatMessages,
		userPrompts,
		hasPendingSuspension,
		pickingIndex,
		// computed
		hasSession,
		hasGhosts,
		isStuck,
		// actions
		startNewSession,
		pickGhost,
		rejectGhosts,
		refreshState,
		reset,
		retryLastPrompt,
	};
});
