import { ref, computed, triggerRef } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { ResponseError } from '@n8n/rest-api-client';
import {
	instanceAiEventSchema,
	isSafeObjectKey,
	type InstanceAiConfirmation,
	type InstanceAiConfirmRequest,
	type InstanceAiResourceDecision,
	type InstanceAiAttachment,
	type InstanceAiEvent,
	type InstanceAiMessage,
	type InstanceAiAgentNode,
	type InstanceAiToolCallState,
	type InstanceAiSSEConnectionState,
	type TaskList,
	type AgentRunState,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import {
	postMessage,
	postCancel,
	postCancelTask,
	postConfirmation,
	postFeedback,
} from './instanceAi.api';
import {
	fetchThreadMessages as fetchThreadMessagesApi,
	fetchThreadStatus as fetchThreadStatusApi,
} from './instanceAi.memory.api';
import { handleEvent as reduceEvent, rebuildRunStateFromTree } from './instanceAi.reducer';
import { useResourceRegistry } from './useResourceRegistry';
import { useResponseFeedback } from './useResponseFeedback';

export interface PendingConfirmationItem {
	toolCall: InstanceAiToolCallState & { confirmation: InstanceAiConfirmation };
	agentNode: InstanceAiAgentNode;
	messageId: string;
}

export type HistoricalHydrationStatus = 'applied' | 'stale' | 'skipped';

const MAX_DEBUG_EVENTS = 1000;

/**
 * Cross-runtime hooks the store wires up at creation time.
 *
 * The runtime owns per-thread state and the SSE connection; the store owns
 * thread-list metadata and instance-level prefs. These hooks let SSE/send
 * side effects reach back into store-owned state without a circular import.
 */
export interface ThreadRuntimeHooks {
	/** Read at `sendMessage` time — the instance-level UI pref. */
	getResearchMode: () => boolean;
	/** SSE delivered a `thread-title-updated` event for the active thread. */
	onTitleUpdated: (threadId: string, title: string) => void;
	/** A run finished — refresh the thread list to pick up server-generated titles. */
	onRunFinish: () => void;
	/** Promote a not-yet-persisted thread to server-side. Called on first send. */
	syncThread: (threadId: string) => Promise<void>;
}

/** Walk an agent tree, collecting tool calls that have an active (pending) confirmation. */
function collectPendingConfirmations(
	node: InstanceAiAgentNode,
	messageId: string,
	resolved: Map<string, 'approved' | 'denied' | 'deferred'>,
	out: PendingConfirmationItem[],
): void {
	for (const tc of node.toolCalls) {
		if (
			tc.confirmation &&
			tc.isLoading &&
			tc.confirmationStatus !== 'approved' &&
			tc.confirmationStatus !== 'denied' &&
			!resolved.has(tc.confirmation.requestId) &&
			// Plan review renders inline in the timeline, not in the confirmation panel
			tc.confirmation.inputType !== 'plan-review'
		) {
			out.push({
				toolCall: tc as InstanceAiToolCallState & { confirmation: InstanceAiConfirmation },
				agentNode: node,
				messageId,
			});
		}
	}
	for (const child of node.children) {
		collectPendingConfirmations(child, messageId, resolved, out);
	}
}

/** Find a tool call in an agent tree by its confirmation requestId. */
function findToolCallInTree(
	node: InstanceAiAgentNode,
	requestId: string,
): InstanceAiToolCallState | undefined {
	for (const tc of node.toolCalls) {
		if (tc.confirmation?.requestId === requestId) return tc;
	}
	for (const child of node.children) {
		const found = findToolCallInTree(child, requestId);
		if (found) return found;
	}
	return undefined;
}

function findLatestTasksFromMessages(messages: InstanceAiMessage[]): TaskList | null {
	for (let i = messages.length - 1; i >= 0; i--) {
		const tasks = messages[i].agentTree?.tasks;
		if (tasks) return tasks;
	}
	return null;
}

interface DebugEventEntry {
	timestamp: string;
	event: InstanceAiEvent;
}

/**
 * Collapse runs of consecutive `text-delta` / `reasoning-delta` events from the
 * same agent into a single entry per run. Other events pass through unchanged.
 * Pure: same input array → same output array, no shared state.
 */
export function collapseDeltaEvents(events: DebugEventEntry[]): DebugEventEntry[] {
	const collapsed: DebugEventEntry[] = [];
	let pendingText: { timestamp: string; event: InstanceAiEvent; buffer: string } | null = null;
	let pendingReasoning: { timestamp: string; event: InstanceAiEvent; buffer: string } | null = null;

	const flushText = () => {
		if (!pendingText) return;
		(pendingText.event as InstanceAiEvent & { type: 'text-delta' }).payload.text =
			pendingText.buffer;
		collapsed.push({ timestamp: pendingText.timestamp, event: pendingText.event });
		pendingText = null;
	};

	const flushReasoning = () => {
		if (!pendingReasoning) return;
		(pendingReasoning.event as InstanceAiEvent & { type: 'reasoning-delta' }).payload.text =
			pendingReasoning.buffer;
		collapsed.push({ timestamp: pendingReasoning.timestamp, event: pendingReasoning.event });
		pendingReasoning = null;
	};

	for (const entry of events) {
		const { event } = entry;

		if (event.type === 'text-delta') {
			if (pendingText && pendingText.event.agentId === event.agentId) {
				pendingText.buffer += event.payload.text;
			} else {
				flushText();
				pendingText = {
					timestamp: entry.timestamp,
					event: { ...event, payload: { ...event.payload } },
					buffer: event.payload.text,
				};
			}
			continue;
		}

		if (event.type === 'reasoning-delta') {
			if (pendingReasoning && pendingReasoning.event.agentId === event.agentId) {
				pendingReasoning.buffer += event.payload.text;
			} else {
				flushReasoning();
				pendingReasoning = {
					timestamp: entry.timestamp,
					event: { ...event, payload: { ...event.payload } },
					buffer: event.payload.text,
				};
			}
			continue;
		}

		// Non-delta event — flush any pending buffers, then pass through.
		flushText();
		flushReasoning();
		collapsed.push(entry);
	}
	flushText();
	flushReasoning();

	return collapsed;
}

/**
 * Walk historical messages and build the reducer routing maps that SSE replay
 * events need to reduce into existing run state. Pure: returns fresh maps the
 * caller can `Object.assign` onto its own state.
 *
 * - `runStateByGroupId`: snapshot of run state keyed by message group id
 * - `groupIdByRunId`: every runId in the group → its group id, so late events
 *   from older runs in a merged A→B→C chain still route to the right message
 */
export function buildRoutingFromMessages(messages: InstanceAiMessage[]): {
	runStateByGroupId: Record<string, AgentRunState>;
	groupIdByRunId: Record<string, string>;
} {
	const runStateByGroupId: Record<string, AgentRunState> = {};
	const groupIdByRunId: Record<string, string> = {};

	for (const msg of messages) {
		if (msg.role !== 'assistant' || !msg.agentTree) continue;
		const groupId = msg.messageGroupId ?? msg.runId;
		if (!groupId || !isSafeObjectKey(groupId)) continue;
		const rebuiltRunState = rebuildRunStateFromTree(msg.agentTree);
		if (!rebuiltRunState) continue;
		runStateByGroupId[groupId] = rebuiltRunState;
		if (msg.runIds) {
			for (const rid of msg.runIds) {
				if (!isSafeObjectKey(rid)) continue;
				groupIdByRunId[rid] = groupId;
			}
		}
		if (msg.runId && isSafeObjectKey(msg.runId)) groupIdByRunId[msg.runId] = groupId;
	}

	return { runStateByGroupId, groupIdByRunId };
}

export type ThreadRuntime = ReturnType<typeof createThreadRuntime>;

/**
 * Owns per-thread state (messages, SSE, reducer state, hydration) for the
 * currently active thread. The store creates one of these and re-exports
 * its surface, so consumers continue to read `store.messages` etc.
 *
 * `switchTo(newThreadId)` resets state and updates `currentThreadId` in place
 * — refs keep their identity, so consumer watchers continue working.
 */
export function createThreadRuntime(initialThreadId: string, hooks: ThreadRuntimeHooks) {
	const rootStore = useRootStore();
	const workflowsListStore = useWorkflowsListStore();
	const toast = useToast();
	const telemetry = useTelemetry();

	// --- Reactive state ---
	const currentThreadId = ref<string>(initialThreadId);
	const messages = ref<InstanceAiMessage[]>([]);
	const activeRunId = ref<string | null>(null);
	const archivedWorkflowIds = ref<Set<string>>(new Set());
	const latestTasks = ref<TaskList | null>(null);
	const debugEvents = ref<Array<{ timestamp: string; event: InstanceAiEvent }>>([]);
	const resolvedConfirmationIds = ref<Map<string, 'approved' | 'denied' | 'deferred'>>(new Map());
	const pendingMessageCount = ref(0);
	const hydratingThreadId = ref<string | null>(null);
	const sseState = ref<InstanceAiSSEConnectionState>('disconnected');
	const lastEventIdByThread = ref<Record<string, number>>({});
	const amendContext = ref<{ agentId: string; role: string } | null>(null);

	// --- Non-reactive runtime state ---
	let runStateByGroupId: Record<string, AgentRunState> = {};
	let groupIdByRunId: Record<string, string> = {};
	let eventSource: EventSource | null = null;
	let sseGeneration = 0;
	let hydrationRequestSequence = 0;
	let activeHydrationRequestToken: number | null = null;

	// --- Computeds ---
	const isStreaming = computed(() => activeRunId.value !== null);
	const isSendingMessage = computed(() => pendingMessageCount.value > 0);
	const hasMessages = computed(() => messages.value.length > 0);
	const isHydratingThread = computed(() => hydratingThreadId.value === currentThreadId.value);

	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(
		() => messages.value,
		(id) => workflowsListStore.getWorkflowById(id)?.name,
		() => archivedWorkflowIds.value,
	);

	const { feedbackByResponseId, rateableResponseId, submitFeedback, resetFeedback } =
		useResponseFeedback({
			messages,
			currentThreadId,
			telemetry,
			postFeedback: async (tid, responseId, payload) =>
				await postFeedback(rootStore.restApiContext, tid, responseId, payload),
		});

	/** The latest task list, preferring explicit tasks-update events over tree snapshots. */
	const currentTasks = computed(
		() => latestTasks.value ?? findLatestTasksFromMessages(messages.value),
	);

	/**
	 * Derive a single contextual follow-up suggestion from the last completed
	 * assistant message. Shown as the input placeholder + Tab to autocomplete.
	 */
	const contextualSuggestion = computed((): string | null => {
		if (isStreaming.value) return null;

		const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant');
		if (!lastAssistant || lastAssistant.isStreaming) return null;

		const tree = lastAssistant.agentTree;
		if (!tree) return null;

		const builderChild = tree.children.find((c) => c.role === 'workflow-builder');
		if (builderChild) {
			return builderChild.status === 'error' || builderChild.status === 'cancelled'
				? 'Try building the workflow again with different settings'
				: 'Add error handling to the workflow';
		}

		const dataChild = tree.children.find((c) => c.role === 'data-table-manager');
		if (dataChild) {
			return 'Query the data table to show recent entries';
		}

		return null;
	});

	/** All pending confirmations across all messages, for the top-level panel. */
	const pendingConfirmations = computed((): PendingConfirmationItem[] => {
		const items: PendingConfirmationItem[] = [];
		for (const msg of messages.value) {
			if (msg.role !== 'assistant' || !msg.agentTree) continue;
			collectPendingConfirmations(msg.agentTree, msg.id, resolvedConfirmationIds.value, items);
		}
		return items;
	});

	/** True while the run is paused awaiting the user to resolve a confirmation. */
	const isAwaitingConfirmation = computed(() => pendingConfirmations.value.length > 0);

	function resolveConfirmation(
		requestId: string,
		action: 'approved' | 'denied' | 'deferred',
	): void {
		const next = new Map(resolvedConfirmationIds.value);
		next.set(requestId, action);
		resolvedConfirmationIds.value = next;
	}

	/** Find a tool call by its confirmation requestId across all messages. */
	function findToolCallByRequestId(requestId: string): InstanceAiToolCallState | undefined {
		for (const msg of messages.value) {
			if (!msg.agentTree) continue;
			const found = findToolCallInTree(msg.agentTree, requestId);
			if (found) return found;
		}
		return undefined;
	}

	// --- SSE lifecycle ---

	function onSSEMessage(sseEvent: MessageEvent): void {
		// Track last event ID per thread (for reconnection)
		if (sseEvent.lastEventId) {
			lastEventIdByThread.value[currentThreadId.value] = Number(sseEvent.lastEventId);
		}
		try {
			const parsed = instanceAiEventSchema.safeParse(JSON.parse(String(sseEvent.data)));
			if (!parsed.success) {
				console.warn('[InstanceAI] Invalid SSE event, skipping:', parsed.error.message);
				return;
			}
			// Push to debug event buffer (capped)
			debugEvents.value.push({
				timestamp: new Date().toISOString(),
				event: parsed.data,
			});
			if (debugEvents.value.length > MAX_DEBUG_EVENTS) {
				debugEvents.value.splice(0, debugEvents.value.length - MAX_DEBUG_EVENTS);
			}
			const previousRunId = activeRunId.value;
			activeRunId.value = reduceEvent(
				{
					messages: messages.value,
					activeRunId: activeRunId.value,
					runStateByGroupId,
					groupIdByRunId,
				},
				parsed.data,
			);
			if (parsed.data.type === 'tasks-update') {
				latestTasks.value = parsed.data.payload.tasks;
			}
			if (parsed.data.type === 'thread-title-updated') {
				hooks.onTitleUpdated(currentThreadId.value, parsed.data.payload.title);
			}
			if (parsed.data.type === 'run-finish') {
				const ids = parsed.data.payload.archivedWorkflowIds;
				if (ids && ids.length > 0) {
					// Reassign instead of mutating: Set.add() on a ref doesn't trigger reactivity.
					const next = new Set(archivedWorkflowIds.value);
					for (const id of ids) next.add(id);
					archivedWorkflowIds.value = next;
				}
			}
			// Force Vue reactivity when streaming state changes (run-start can
			// re-activate a completed message for auto-follow-up runs, run-finish
			// marks it done). In-place mutation of message properties may not
			// reliably trigger deep watchers in all scenarios (e.g. background tabs).
			if (parsed.data.type === 'run-start' || parsed.data.type === 'run-finish') {
				triggerRef(messages);
			}
			// When a run finishes, refresh thread list to pick up Mastra-generated titles
			if (previousRunId && activeRunId.value === null) {
				hooks.onRunFinish();
			}
		} catch {
			// Malformed JSON — skip
		}
	}

	/**
	 * Handle run-sync control frames — full state snapshot from the backend.
	 * Replaces the agent tree AND rebuilds the group-level run state so
	 * subsequent live events have state to reduce into. Also restores the
	 * runId → groupId mapping so late events from any run in the group route
	 * to the correct message.
	 */
	function onRunSync(sseEvent: MessageEvent): void {
		try {
			const data = JSON.parse(String(sseEvent.data)) as {
				runId: string;
				messageGroupId?: string;
				runIds?: string[];
				agentTree: InstanceAiAgentNode;
				status: string;
			};

			const groupId = data.messageGroupId ?? data.runId;
			if (!isSafeObjectKey(data.runId) || !isSafeObjectKey(groupId)) return;
			const rebuiltRunState = rebuildRunStateFromTree(data.agentTree);
			if (!rebuiltRunState) return;

			// Find the message to update — by messageGroupId first, then runId
			let msg: InstanceAiMessage | undefined;
			if (data.messageGroupId) {
				msg = messages.value.find(
					(m) => m.messageGroupId === data.messageGroupId && m.role === 'assistant',
				);
			}
			if (!msg) {
				msg = messages.value.find((m) => m.runId === data.runId);
			}

			if (!msg) {
				messages.value.push({
					id: groupId,
					runId: data.runId,
					messageGroupId: groupId,
					runIds: data.runIds,
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: data.agentTree.textContent,
					reasoning: data.agentTree.reasoning,
					isStreaming: false,
					agentTree: data.agentTree,
				});
				msg = messages.value[messages.value.length - 1];
			}

			msg.agentTree = data.agentTree;
			msg.runId = data.runId;
			msg.messageGroupId = groupId;
			msg.runIds = data.runIds;
			msg.content = data.agentTree.textContent;
			msg.reasoning = data.agentTree.reasoning;
			latestTasks.value = findLatestTasksFromMessages(messages.value);
			const isOrchestratorLive = data.status === 'active' || data.status === 'suspended';
			// For background-only groups, the orchestrator already finished.
			// Set isStreaming = false so InstanceAiMessage.vue's hasActiveBackgroundTasks
			// computed correctly detects active children and shows the indicator.
			msg.isStreaming = isOrchestratorLive;
			// Only the active/suspended orchestrator run should claim activeRunId.
			// Background-only groups update their message but don't override the
			// global active run, which controls input state and cancel buttons.
			if (isOrchestratorLive) {
				activeRunId.value = data.runId;
			}

			// Rebuild normalized run state keyed by groupId
			runStateByGroupId[groupId] = rebuiltRunState;

			// Restore runId → groupId mappings for ALL runs in the group.
			// This ensures late events from older follow-up runs still route
			// to this message after reconnect.
			if (data.runIds) {
				for (const rid of data.runIds) {
					if (!isSafeObjectKey(rid)) continue;
					groupIdByRunId[rid] = groupId;
				}
			}
			// Always register the current runId
			groupIdByRunId[data.runId] = groupId;
		} catch {
			// Malformed run-sync — skip
		}
	}

	function connectSSE(threadId?: string): void {
		const tid = threadId ?? currentThreadId.value;
		if (eventSource) {
			closeSSE();
		}
		sseState.value = 'connecting';

		// Increment generation — stale EventSource handlers will check this
		const gen = ++sseGeneration;
		const capturedThreadId = tid;

		const lastEventId = lastEventIdByThread.value[tid];
		const baseUrl = rootStore.restApiContext.baseUrl;
		const url =
			lastEventId !== null && lastEventId !== undefined
				? `${baseUrl}/instance-ai/events/${tid}?lastEventId=${String(lastEventId)}`
				: `${baseUrl}/instance-ai/events/${tid}`;

		eventSource = new EventSource(url, { withCredentials: true });

		eventSource.onopen = () => {
			if (gen !== sseGeneration) return;
			sseState.value = 'connected';
		};

		eventSource.onmessage = (ev: MessageEvent) => {
			// Guard: discard events from stale connections or wrong threads
			if (gen !== sseGeneration || capturedThreadId !== currentThreadId.value) {
				return;
			}
			onSSEMessage(ev);
		};

		// Listen for run-sync control frames (named SSE event, no id: field)
		eventSource.addEventListener('run-sync', (ev: MessageEvent) => {
			if (gen !== sseGeneration || capturedThreadId !== currentThreadId.value) return;
			onRunSync(ev);
		});

		eventSource.onerror = () => {
			if (gen !== sseGeneration) return;
			// EventSource auto-reconnects. Mark as reconnecting if not already closed.
			if (eventSource?.readyState === EventSource.CONNECTING) {
				sseState.value = 'reconnecting';
			} else if (eventSource?.readyState === EventSource.CLOSED) {
				sseState.value = 'disconnected';
				eventSource = null;
			}
		};
	}

	function closeSSE(): void {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		sseState.value = 'disconnected';
	}

	/**
	 * Reset all per-thread state. `nextHydratingThreadId` becomes the new
	 * `hydratingThreadId` value (used by `isHydratingThread` to decide whether
	 * to render the spinner).
	 */
	function resetState(nextHydratingThreadId: string | null): void {
		hydratingThreadId.value = nextHydratingThreadId;
		messages.value = [];
		archivedWorkflowIds.value = new Set();
		latestTasks.value = null;
		activeRunId.value = null;
		debugEvents.value = [];
		resetFeedback();
		resolvedConfirmationIds.value = new Map();
		runStateByGroupId = {};
		groupIdByRunId = {};
		activeHydrationRequestToken = null;
	}

	/**
	 * Switch to another thread: close SSE, reset state, drop the SSE cursor,
	 * and update `currentThreadId`. Caller is responsible for kicking off
	 * `loadHistoricalMessages` and `connectSSE` afterwards (the store sequences
	 * these so SSE only opens after history is hydrated).
	 *
	 * The cursor delete forces a full SSE replay if `loadHistoricalMessages`
	 * doesn't return a `nextEventId` (preserving prior store behavior).
	 */
	function switchTo(threadId: string): void {
		closeSSE();
		resetState(threadId);
		delete lastEventIdByThread.value[threadId];
		currentThreadId.value = threadId;
	}

	async function loadHistoricalMessages(
		threadId?: string,
		hydrationRequestToken?: number,
	): Promise<HistoricalHydrationStatus> {
		const tid = threadId ?? currentThreadId.value;
		hydratingThreadId.value = tid;
		const effectiveHydrationRequestToken = hydrationRequestToken ?? ++hydrationRequestSequence;
		if (hydrationRequestToken === undefined) {
			activeHydrationRequestToken = effectiveHydrationRequestToken;
		}
		const isCurrentHydrationRequest = () =>
			activeHydrationRequestToken === effectiveHydrationRequestToken;

		try {
			const result = await fetchThreadMessagesApi(rootStore.restApiContext, tid, 100);
			if (!isCurrentHydrationRequest()) return 'stale';
			// Only hydrate if we're still on the same thread and SSE hasn't delivered messages
			if (currentThreadId.value !== tid || messages.value.length > 0) return 'skipped';
			// Backend now returns InstanceAiMessage[] directly — no conversion needed
			if (result.messages.length > 0) {
				messages.value = result.messages;
				latestTasks.value = findLatestTasksFromMessages(result.messages);

				// Rebuild reducer routing state from historical messages so SSE
				// replay events (which arrive before run-sync) can reduce into
				// existing run states instead of being dropped or creating phantoms.
				const routing = buildRoutingFromMessages(result.messages);
				Object.assign(runStateByGroupId, routing.runStateByGroupId);
				Object.assign(groupIdByRunId, routing.groupIdByRunId);
			}
			// Set SSE cursor to skip past events already covered by historical messages.
			// This prevents duplicate messages when SSE replays in-memory events.
			if (result.nextEventId !== null && result.nextEventId !== undefined) {
				lastEventIdByThread.value[tid] = result.nextEventId - 1;
			}
			return 'applied';
		} catch {
			// Silently ignore — messages will appear if SSE delivers them
			return isCurrentHydrationRequest() ? 'applied' : 'stale';
		} finally {
			if (isCurrentHydrationRequest() && hydratingThreadId.value === tid) {
				hydratingThreadId.value = null;
			}
		}
	}

	async function loadThreadStatus(threadId?: string): Promise<void> {
		const tid = threadId ?? currentThreadId.value;
		try {
			const status = await fetchThreadStatusApi(rootStore.restApiContext, tid);
			if (currentThreadId.value !== tid) return;

			const hasActivity =
				status.hasActiveRun || status.isSuspended || status.backgroundTasks.length > 0;
			if (!hasActivity) return;

			const lastAssistant = [...messages.value].reverse().find((m) => m.role === 'assistant');
			if (!lastAssistant) return;

			if (status.hasActiveRun || status.isSuspended) {
				activeRunId.value = lastAssistant.runId ?? null;
				lastAssistant.isStreaming = status.hasActiveRun;
			}

			// Background task visibility is handled by the run-sync control frame
			// that is sent on SSE connect. No need to inject children directly here.
		} catch {
			// Silently ignore
		}
	}

	function nextHydrationToken(): number {
		const token = ++hydrationRequestSequence;
		activeHydrationRequestToken = token;
		return token;
	}

	// --- Send / cancel / amend ---

	async function sendMessage(
		message: string,
		attachments?: InstanceAiAttachment[],
		pushRef?: string,
	): Promise<void> {
		// Clear amend context on new message
		amendContext.value = null;
		pendingMessageCount.value += 1;

		// Ensure SSE is connected before sending. Vue's Suspense boundary can
		// unmount → remount InstanceAiView during layout transitions, which closes
		// the SSE connection via onUnmounted. If the user sends a message before
		// the remounted component's async connectSSE() fires, the response events
		// would be lost. Re-establish the connection here as a safety net.
		if (sseState.value === 'disconnected') {
			connectSSE();
		}
		const userMessage: InstanceAiMessage = {
			id: uuidv4(),
			role: 'user',
			createdAt: new Date().toISOString(),
			content: message,
			reasoning: '',
			isStreaming: false,
			attachments: attachments && attachments.length > 0 ? attachments : undefined,
		};
		messages.value.push(userMessage);

		try {
			await hooks.syncThread(currentThreadId.value);
		} catch {
			const idx = messages.value.indexOf(userMessage);
			if (idx !== -1) {
				messages.value.splice(idx, 1);
			}
			toast.showError(new Error('Failed to start a new thread. Try again.'), 'Send failed');
			pendingMessageCount.value = Math.max(0, pendingMessageCount.value - 1);
			return;
		}

		const isFirstMessage = messages.value.filter((m) => m.role === 'user').length === 1;
		telemetry.track('User sent builder message', {
			thread_id: currentThreadId.value,
			instance_id: rootStore.instanceId,
			is_first_message: isFirstMessage,
		});

		// 2. POST to backend — returns { runId }
		// Thread title is generated by Mastra asynchronously after the agent responds.
		// activeRunId is set by the run-start event arriving over SSE, NOT by the POST response.
		try {
			await postMessage(
				rootStore.restApiContext,
				currentThreadId.value,
				message,
				hooks.getResearchMode() || undefined,
				attachments,
				Intl.DateTimeFormat().resolvedOptions().timeZone,
				pushRef,
			);
		} catch (error: unknown) {
			const status = error instanceof ResponseError ? error.httpStatusCode : undefined;
			if (status === 409) {
				toast.showError(
					new Error('Agent is still working on your previous message'),
					'Cannot send message',
				);
			} else if (status === 400) {
				const serverMessage = error instanceof ResponseError && error.message ? error.message : '';
				toast.showError(
					new Error(serverMessage || 'The request was rejected. Please try again.'),
					'Could not send message',
				);
			} else {
				toast.showError(new Error('Failed to send message. Try again.'), 'Send failed');
			}
			// Remove the optimistic user message on failure
			const idx = messages.value.indexOf(userMessage);
			if (idx !== -1) {
				messages.value.splice(idx, 1);
			}
		} finally {
			pendingMessageCount.value = Math.max(0, pendingMessageCount.value - 1);
		}
	}

	async function cancelRun(): Promise<void> {
		if (!activeRunId.value) return;
		try {
			await postCancel(rootStore.restApiContext, currentThreadId.value);
			// Don't clear activeRunId here — wait for the run-finish event via SSE
		} catch {
			toast.showError(new Error('Failed to cancel. Try again.'), 'Cancel failed');
		}
	}

	/** Cancel a specific background task. */
	async function cancelBackgroundTask(taskId: string): Promise<void> {
		try {
			await postCancelTask(rootStore.restApiContext, currentThreadId.value, taskId);
		} catch {
			toast.showError(new Error('Failed to cancel task. Try again.'), 'Cancel failed');
		}
	}

	/** Stop an agent and prime the input for amend instructions. */
	function amendAgent(agentId: string, role: string, taskId?: string): void {
		if (taskId) {
			void cancelBackgroundTask(taskId);
		} else {
			void cancelRun();
		}
		amendContext.value = { agentId, role };
	}

	// --- Confirmations ---

	async function confirmAction(
		requestId: string,
		payload: InstanceAiConfirmRequest,
	): Promise<boolean> {
		try {
			await postConfirmation(rootStore.restApiContext, requestId, payload);
			return true;
		} catch {
			toast.showError(new Error('Failed to send confirmation. Try again.'), 'Confirmation failed');
			return false;
		}
	}

	async function confirmResourceDecision(
		requestId: string,
		decision: InstanceAiResourceDecision,
	): Promise<void> {
		resolveConfirmation(requestId, 'approved');
		await confirmAction(requestId, { kind: 'resourceDecision', resourceDecision: decision });
	}

	// --- Trace export ---

	function copyFullTrace(): string {
		return JSON.stringify(
			{
				threadId: currentThreadId.value,
				exportedAt: new Date().toISOString(),
				messages: messages.value,
				events: collapseDeltaEvents(debugEvents.value),
			},
			null,
			2,
		);
	}

	return {
		// state refs
		currentThreadId,
		messages,
		activeRunId,
		archivedWorkflowIds,
		latestTasks,
		debugEvents,
		resolvedConfirmationIds,
		pendingMessageCount,
		hydratingThreadId,
		sseState,
		lastEventIdByThread,
		amendContext,

		// computeds
		isStreaming,
		isSendingMessage,
		hasMessages,
		isHydratingThread,
		producedArtifacts,
		resourceNameIndex,
		feedbackByResponseId,
		rateableResponseId,
		currentTasks,
		contextualSuggestion,
		pendingConfirmations,
		isAwaitingConfirmation,

		// actions
		switchTo,
		resetState,
		nextHydrationToken,
		connectSSE,
		closeSSE,
		loadHistoricalMessages,
		loadThreadStatus,
		sendMessage,
		cancelRun,
		cancelBackgroundTask,
		amendAgent,
		confirmAction,
		confirmResourceDecision,
		resolveConfirmation,
		findToolCallByRequestId,
		copyFullTrace,
		submitFeedback,
	};
}
