import { computed, reactive, ref, triggerRef, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { ResponseError } from '@n8n/rest-api-client';
import {
	buildRunWorkflowSessionGrantKey,
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
	type InstanceAiHandoffContext,
	type TaskList,
	type AgentRunState,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import type { IWorkflowDb } from '@/Interface';
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
import { handleEvent as reduceEvent, createRunStateFromTree } from './instanceAi.reducer';
import { getLatestBuildResult } from './canvasPreview.utils';
import { useResourceRegistry } from './useResourceRegistry';
import { useResponseFeedback } from './useResponseFeedback';

export interface PlanEditContext {
	requestId: string;
	inputThreadId?: string;
	taskCount: number;
}

/**
 * State the editor handed off, snapshotted before its stores are torn down so
 * the artifact can seed it directly without refetching. `workflow`/`execution`
 * are omitted when the editor didn't have them loaded, leaving a fetch fallback.
 */
export interface PendingHandoff {
	workflowId: string;
	workflow?: IWorkflowDb;
	execution?: IExecutionResponse;
}

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
	/** SSE delivered a `thread-title-updated` event for the active thread. */
	onTitleUpdated: (threadId: string, title: string) => void;
	/** A run finished — refresh the thread list to pick up server-generated titles. */
	onRunFinish: () => void;
}

/** Walk an agent tree, collecting tool calls that have an active (pending) confirmation. */
function collectPendingConfirmations(
	node: InstanceAiAgentNode,
	messageId: string,
	resolved: Map<string, 'approved' | 'changes-requested' | 'denied' | 'deferred'>,
	out: PendingConfirmationItem[],
): void {
	for (const tc of node.toolCalls) {
		if (
			tc.confirmation &&
			tc.isLoading &&
			tc.confirmationStatus !== 'approved' &&
			tc.confirmationStatus !== 'denied' &&
			!resolved.has(tc.confirmation.requestId) &&
			// Expired cards render as a terminal "this action has expired" state
			// in their inline slot; surfacing them in the floating/inline panel
			// would block the chat input on a confirmation the user can no
			// longer act on.
			!tc.confirmation.expired &&
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
 * events need to reduce into existing run state. Each message's agent tree is
 * adopted (not copied) into its run state, so replayed/live events mutate the
 * exact nodes the message renders.
 *
 * - `runStateByGroupId`: run state per message group id, adopting `msg.agentTree`
 * - `groupIdByRunId`: every runId in the group → its group id, so late events
 *   from older runs in a merged A→B→C chain still route to the right message
 */
export function buildRoutingFromMessages(messages: InstanceAiMessage[]): {
	runStateByGroupId: Map<string, AgentRunState>;
	groupIdByRunId: Map<string, string>;
} {
	const runStateByGroupId = new Map<string, AgentRunState>();
	const groupIdByRunId = new Map<string, string>();

	for (const msg of messages) {
		if (msg.role !== 'assistant' || !msg.agentTree) continue;
		const groupId = msg.messageGroupId ?? msg.runId;
		if (!groupId || !isSafeObjectKey(groupId)) continue;
		const rebuiltRunState = createRunStateFromTree(msg.agentTree);
		if (!rebuiltRunState) continue;
		runStateByGroupId.set(groupId, rebuiltRunState);
		if (msg.runIds) {
			for (const rid of msg.runIds) {
				if (!isSafeObjectKey(rid)) continue;
				groupIdByRunId.set(rid, groupId);
			}
		}
		if (msg.runId && isSafeObjectKey(msg.runId)) groupIdByRunId.set(msg.runId, groupId);
	}

	return { runStateByGroupId, groupIdByRunId };
}

export type ThreadRuntime = ReturnType<typeof createThreadRuntime>;

/**
 * Owns state for exactly one thread: messages, SSE, reducer state, hydration,
 * feedback and resource registries.
 */
export function createThreadRuntime(
	threadId: string,
	hooks: ThreadRuntimeHooks,
	initialProjectId?: string,
) {
	const rootStore = useRootStore();
	const workflowsListStore = useWorkflowsListStore();
	const toast = useToast();
	const telemetry = useTelemetry();

	// --- Reactive state ---
	const messages = ref<InstanceAiMessage[]>([]);
	const projectId = ref<string | undefined>(initialProjectId);
	const activeRunId = ref<string | null>(null);
	const archivedWorkflowIds = ref<Set<string>>(new Set());
	const latestTasks = ref<TaskList | null>(null);
	const debugEvents = ref<Array<{ timestamp: string; event: InstanceAiEvent }>>([]);
	const resolvedConfirmationIds = reactive(
		new Map<string, 'approved' | 'changes-requested' | 'denied' | 'deferred'>(),
	);
	const pendingMessageCount = ref(0);
	const hydrationStatus = ref<'idle' | 'hydrating' | 'ready'>('idle');
	const sseState = ref<InstanceAiSSEConnectionState>('disconnected');
	const lastEventId = ref<number | undefined>(undefined);
	const amendContext = ref<{ agentId: string; role: string } | null>(null);
	const activePlanEdit = ref<PlanEditContext | null>(null);
	const updatingPlanRequestIds = reactive(new Set<string>());

	// Workflow + execution the editor was showing at hand-off, to load once when
	// the artifact first opens. Transient (never persisted): set by the editor
	// hand-off right before navigation and consumed by the workflow preview on
	// mount, so it applies only on the redirect — not on reload, and it never
	// pins the canvas afterwards. Carries the snapshotted payloads (taken before
	// the editor's stores are torn down) so the artifact seeds them with no refetch.
	const pendingHandoff = ref<PendingHandoff | null>(null);
	function setPendingHandoff(value: PendingHandoff): void {
		pendingHandoff.value = value;
	}
	function consumePendingHandoff(
		workflowId: string,
	): Omit<PendingHandoff, 'workflowId'> | undefined {
		const pending = pendingHandoff.value;
		if (pending?.workflowId !== workflowId) return undefined;
		pendingHandoff.value = null;
		return { workflow: pending.workflow, execution: pending.execution };
	}

	// --- Reducer routing state ---
	// Plain Maps: the routing tables themselves are never rendered. The run
	// STATES they hold are reactive (created via `createRunState*` in the
	// reducer) — that's where rendering reactivity lives, since `msg.agentTree`
	// is the run state's own root node.
	const runStateByGroupId = new Map<string, AgentRunState>();
	const groupIdByRunId = new Map<string, string>();
	let eventSource: EventSource | null = null;
	let sseGeneration = 0;
	let hydrationGeneration = 0;
	let hydrationPromise: Promise<HistoricalHydrationStatus> | null = null;

	// --- Computeds ---
	const isStreaming = computed(() => activeRunId.value !== null);
	const isSendingMessage = computed(() => pendingMessageCount.value > 0);
	const hasMessages = computed(() => messages.value.length > 0);
	const isHydratingThread = computed(() => hydrationStatus.value === 'hydrating');

	const { producedArtifacts, resourceNameIndex } = useResourceRegistry(
		() => messages.value,
		(id) => workflowsListStore.getWorkflowById(id)?.name,
		() => archivedWorkflowIds.value,
	);

	const { feedbackByResponseId, rateableResponseId, submitFeedback, resetFeedback } =
		useResponseFeedback({
			messages,
			threadId,
			telemetry,
			postFeedback: async (tid, responseId, payload) =>
				await postFeedback(rootStore.restApiContext, tid, responseId, payload),
		});

	/** The latest task list, preferring explicit tasks-update events over tree snapshots. */
	const currentTasks = computed(
		() => latestTasks.value ?? findLatestTasksFromMessages(messages.value),
	);

	// --- Telemetry: 'User viewed new builder workflow' ---
	// FE counterpart of the backend 'Builder created workflow' event, which carries
	// no session id and so can't filter PostHog session recordings — this FE-sent
	// event does. It fires the moment the builder produces a workflow, i.e. when the
	// canvas preview opens: `latestBuildResult.toolCallId` changes only on a live
	// build, so re-hydrating past messages or rebuilding the same workflow won't
	// re-fire. Emitted once per workflow id for this runtime.
	const latestBuildResult = computed(() => {
		for (let i = messages.value.length - 1; i >= 0; i--) {
			const tree = messages.value[i].agentTree;
			if (tree) {
				const result = getLatestBuildResult(tree);
				if (result) return result;
			}
		}
		return null;
	});
	const reportedBuiltWorkflowIds = new Set<string>();

	watch(
		() => latestBuildResult.value?.toolCallId,
		(toolCallId) => {
			// `flush: 'sync'` mirrors useCanvasPreview: hydration assigns messages and
			// flips hydrationStatus to 'ready' within the same tick, so only a
			// synchronous callback still sees the hydrating flag and skips past builds.
			if (!toolCallId || isHydratingThread.value) return;
			const workflowId = latestBuildResult.value?.workflowId;
			if (!workflowId || reportedBuiltWorkflowIds.has(workflowId)) return;
			reportedBuiltWorkflowIds.add(workflowId);
			telemetry.track('User viewed new builder workflow', {
				thread_id: threadId,
				instance_id: rootStore.instanceId,
				workflow_id: workflowId,
			});
		},
		{ flush: 'sync' },
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

		return null;
	});

	/** All pending confirmations across all messages, for the top-level panel. */
	const pendingConfirmations = computed((): PendingConfirmationItem[] => {
		const items: PendingConfirmationItem[] = [];
		for (const msg of messages.value) {
			if (msg.role !== 'assistant' || !msg.agentTree) continue;
			collectPendingConfirmations(msg.agentTree, msg.id, resolvedConfirmationIds, items);
		}
		return items;
	});

	/** True while the run is paused awaiting the user to resolve a confirmation. */
	const isAwaitingConfirmation = computed(() => pendingConfirmations.value.length > 0);

	function resolveConfirmation(
		requestId: string,
		action: 'approved' | 'changes-requested' | 'denied' | 'deferred',
	): void {
		resolvedConfirmationIds.set(requestId, action);
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

	// --- Session "Always allow" ---
	// Thread-scoped: cleared by `resetState()` so grants don't leak when the
	// runtime is disposed and recreated. Key: `${toolName}:${args.action ?? ''}`
	// for most tools; `submit-workflow` is keyed on `workflowId` presence so a
	// create grant doesn't silently auto-approve later updates (the backend
	// distinguishes createWorkflow vs updateWorkflow by that field).
	const sessionAlwaysAllowKeys = ref<Set<string>>(new Set());

	function buildAlwaysAllowKey(toolName: string, args: Record<string, unknown>): string {
		if (toolName === 'submit-workflow') {
			const isUpdate = typeof args.workflowId === 'string' && args.workflowId.length > 0;
			return `submit-workflow:${isUpdate ? 'update' : 'create'}`;
		}
		const action = typeof args.action === 'string' ? args.action : '';
		// Running a workflow grants "always allow" per workflow, so the grant applies only to the
		// workflow the user approved.
		if (toolName === 'executions' && action === 'run') {
			const workflowId = typeof args.workflowId === 'string' ? args.workflowId : '';
			return buildRunWorkflowSessionGrantKey(workflowId);
		}
		return `${toolName}:${action}`;
	}

	function addAlwaysAllowKey(toolName: string, args: Record<string, unknown>): void {
		const next = new Set(sessionAlwaysAllowKeys.value);
		next.add(buildAlwaysAllowKey(toolName, args));
		sessionAlwaysAllowKeys.value = next;
	}

	function isGenericApprovalEligible(item: PendingConfirmationItem): boolean {
		const conf = item.toolCall.confirmation;
		if (conf.severity === 'destructive') return false;
		if (conf.domainAccess) return false;
		if (conf.inputType) return false;
		if (conf.setupRequests?.length) return false;
		if (conf.credentialRequests?.length) return false;
		if (conf.questions?.length) return false;
		return true;
	}

	// In-flight guard for the auto-approve watcher. We can't rely on
	// `resolvedConfirmationIds` to skip duplicates here because we only mark
	// resolved *after* `confirmAction` succeeds — otherwise a failed request
	// would hide the card while the backend still waits for approval.
	const autoApproveInFlight = new Set<string>();

	watch(
		pendingConfirmations,
		async (items) => {
			if (sessionAlwaysAllowKeys.value.size === 0) return;
			for (const item of items) {
				const conf = item.toolCall.confirmation;
				if (resolvedConfirmationIds.has(conf.requestId)) continue;
				if (autoApproveInFlight.has(conf.requestId)) continue;
				if (!isGenericApprovalEligible(item)) continue;
				const key = buildAlwaysAllowKey(item.toolCall.toolName, item.toolCall.args ?? {});
				if (!sessionAlwaysAllowKeys.value.has(key)) continue;

				autoApproveInFlight.add(conf.requestId);
				try {
					const ok = await confirmAction(conf.requestId, { kind: 'approval', approved: true });
					if (!ok) continue;
					resolveConfirmation(conf.requestId, 'approved');
					telemetry.track('User finished providing input', {
						thread_id: threadId,
						input_thread_id: conf.inputThreadId ?? '',
						instance_id: rootStore.instanceId,
						type: 'approval',
						provided_inputs: [
							{
								label: conf.message,
								options: ['approve', 'deny', 'approve_always'],
								option_chosen: 'approve_auto',
							},
						],
						skipped_inputs: [],
						auto_resolved: true,
					});
				} finally {
					autoApproveInFlight.delete(conf.requestId);
				}
			}
		},
		{ deep: true },
	);

	// --- SSE lifecycle ---

	function onSSEMessage(sseEvent: MessageEvent): void {
		// Track last event ID for this thread (for reconnection)
		if (sseEvent.lastEventId) {
			lastEventId.value = Number(sseEvent.lastEventId);
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
				hooks.onTitleUpdated(threadId, parsed.data.payload.title);
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
			// When a run finishes, refresh thread list to pick up auto-generated titles
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
			// Adopts the snapshot tree's nodes — `msg.agentTree` below points at the
			// same objects, so subsequent live events mutate what's rendered.
			const rebuiltRunState = createRunStateFromTree(data.agentTree);
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
			runStateByGroupId.set(groupId, rebuiltRunState);

			// Restore runId → groupId mappings for ALL runs in the group.
			// This ensures late events from older follow-up runs still route
			// to this message after reconnect.
			if (data.runIds) {
				for (const rid of data.runIds) {
					if (!isSafeObjectKey(rid)) continue;
					groupIdByRunId.set(rid, groupId);
				}
			}
			// Always register the current runId
			groupIdByRunId.set(data.runId, groupId);
		} catch {
			// Malformed run-sync — skip
		}
	}

	function connectSSE(): void {
		if (eventSource) {
			closeSSE();
		}
		sseState.value = 'connecting';

		// Increment generation — stale EventSource handlers will check this
		const gen = ++sseGeneration;

		const cursor = lastEventId.value;
		const baseUrl = rootStore.restApiContext.baseUrl;
		const url =
			cursor !== null && cursor !== undefined
				? `${baseUrl}/instance-ai/events/${threadId}?lastEventId=${String(cursor)}`
				: `${baseUrl}/instance-ai/events/${threadId}`;

		eventSource = new EventSource(url, { withCredentials: true });

		eventSource.onopen = () => {
			if (gen !== sseGeneration) return;
			sseState.value = 'connected';
		};

		eventSource.onmessage = (ev: MessageEvent) => {
			// Guard: discard events from stale connections.
			if (gen !== sseGeneration) return;
			onSSEMessage(ev);
		};

		// Listen for run-sync control frames (named SSE event, no id: field)
		eventSource.addEventListener('run-sync', (ev: MessageEvent) => {
			if (gen !== sseGeneration) return;
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

	/** Reset all state owned by this runtime. */
	function resetState(): void {
		hydrationGeneration += 1;
		hydrationPromise = null;
		hydrationStatus.value = 'idle';
		messages.value = [];
		archivedWorkflowIds.value = new Set();
		latestTasks.value = null;
		activeRunId.value = null;
		debugEvents.value = [];
		resetFeedback();
		resolvedConfirmationIds.clear();
		sessionAlwaysAllowKeys.value = new Set();
		runStateByGroupId.clear();
		groupIdByRunId.clear();
		lastEventId.value = undefined;
	}

	function dispose(): void {
		closeSSE();
		resetState();
	}

	async function loadHistoricalMessages(): Promise<HistoricalHydrationStatus> {
		if (hydrationPromise) return await hydrationPromise;

		if (messages.value.length > 0 || hydrationStatus.value === 'ready') {
			hydrationStatus.value = 'ready';
			return 'skipped';
		}

		const capturedHydrationGeneration = ++hydrationGeneration;
		hydrationStatus.value = 'hydrating';

		const promise = (async (): Promise<HistoricalHydrationStatus> => {
			try {
				const result = await fetchThreadMessagesApi(rootStore.restApiContext, threadId, 100);
				if (capturedHydrationGeneration !== hydrationGeneration) return 'stale';
				// Only hydrate if SSE hasn't delivered messages while the request was in flight.
				if (messages.value.length > 0) return 'skipped';
				// Backend now returns InstanceAiMessage[] directly — no conversion needed.
				if (result.messages.length > 0) {
					messages.value = result.messages;
					latestTasks.value = findLatestTasksFromMessages(result.messages);

					// Rebuild reducer routing state from historical messages so SSE
					// replay events (which arrive before run-sync) can reduce into
					// existing run states instead of being dropped or creating phantoms.
					const routing = buildRoutingFromMessages(messages.value);
					routing.runStateByGroupId.forEach((value, key) => runStateByGroupId.set(key, value));
					routing.groupIdByRunId.forEach((value, key) => groupIdByRunId.set(key, value));
				}
				// Set SSE cursor to skip past events already covered by historical messages.
				// This prevents duplicate messages when SSE replays in-memory events.
				if (result.nextEventId !== null && result.nextEventId !== undefined) {
					lastEventId.value = result.nextEventId - 1;
				}
				if (result.projectId) projectId.value = result.projectId;
				return 'applied';
			} catch {
				// Silently ignore — messages will appear if SSE delivers them.
				return capturedHydrationGeneration === hydrationGeneration ? 'applied' : 'stale';
			} finally {
				if (capturedHydrationGeneration === hydrationGeneration) {
					hydrationStatus.value = 'ready';
					hydrationPromise = null;
				}
			}
		})();

		hydrationPromise = promise;
		return await promise;
	}

	async function loadThreadStatus(): Promise<void> {
		try {
			const status = await fetchThreadStatusApi(rootStore.restApiContext, threadId);

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

	// --- Send / cancel / amend ---

	function ensureSSEConnected(): void {
		// Vue's Suspense boundary can unmount → remount InstanceAiView during
		// layout transitions, which closes the SSE connection via onUnmounted.
		// If the user sends a message before the remounted component's async
		// connectSSE() fires, the response events would be lost. Re-establish
		// the connection here as a safety net.
		if (sseState.value === 'disconnected') {
			connectSSE();
		}
	}

	function pushOptimisticUserMessage(
		message: string,
		attachments?: InstanceAiAttachment[],
	): InstanceAiMessage {
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
		return userMessage;
	}

	function removeOptimisticMessage(message: InstanceAiMessage): void {
		const idx = messages.value.indexOf(message);
		if (idx !== -1) {
			messages.value.splice(idx, 1);
		}
	}

	function trackUserMessageSent(isFirstMessage: boolean): void {
		telemetry.track('User sent builder message', {
			thread_id: threadId,
			instance_id: rootStore.instanceId,
			is_first_message: isFirstMessage,
		});
	}

	async function dispatchUserMessage(
		message: string,
		attachments?: InstanceAiAttachment[],
		handoffContext?: InstanceAiHandoffContext,
		pushRef?: string,
	): Promise<boolean> {
		try {
			const { runId } = await postMessage(
				rootStore.restApiContext,
				threadId,
				message,
				attachments,
				handoffContext,
				Intl.DateTimeFormat().resolvedOptions().timeZone,
				pushRef,
			);

			if (runId) {
				activeRunId.value = runId;
			}
			return true;
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
			return false;
		}
	}

	async function sendMessage(
		message: string,
		attachments?: InstanceAiAttachment[],
		pushRef?: string,
		handoffContext?: InstanceAiHandoffContext,
	): Promise<void> {
		amendContext.value = null;
		pendingMessageCount.value += 1;
		try {
			ensureSSEConnected();
			const isFirstMessage = !messages.value.some((m) => m.role === 'user');
			const optimistic = pushOptimisticUserMessage(message, attachments);
			trackUserMessageSent(isFirstMessage);

			if (!(await dispatchUserMessage(message, attachments, handoffContext, pushRef))) {
				removeOptimisticMessage(optimistic);
			}
		} finally {
			pendingMessageCount.value = Math.max(0, pendingMessageCount.value - 1);
		}
	}

	async function cancelRun(): Promise<void> {
		if (!activeRunId.value) return;
		try {
			await postCancel(rootStore.restApiContext, threadId);
			// Don't clear activeRunId here — wait for the run-finish event via SSE
		} catch {
			toast.showError(new Error('Failed to cancel. Try again.'), 'Cancel failed');
		}
	}

	/** Cancel a specific background task. */
	async function cancelBackgroundTask(taskId: string): Promise<void> {
		try {
			await postCancelTask(rootStore.restApiContext, threadId, taskId);
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

	// --- Plan edit mode ---

	function startPlanEdit(context: PlanEditContext): void {
		activePlanEdit.value = context;
	}

	function cancelPlanEdit(): void {
		activePlanEdit.value = null;
	}

	function markPlanUpdatePending(requestId: string): void {
		updatingPlanRequestIds.add(requestId);
	}

	function clearPlanUpdatePending(requestId: string): void {
		updatingPlanRequestIds.delete(requestId);
	}

	// Defensive cleanup: if a stream ends without a matching clear, drop the
	// pending markers so we don't leave a card stuck in "Updating plan…".
	watch(isStreaming, (streaming) => {
		if (!streaming && updatingPlanRequestIds.size > 0) {
			updatingPlanRequestIds.clear();
		}
	});

	// --- Confirmations ---

	async function confirmAction(
		requestId: string,
		payload: InstanceAiConfirmRequest,
	): Promise<boolean> {
		try {
			await postConfirmation(rootStore.restApiContext, requestId, payload);
			return true;
		} catch (error: unknown) {
			// Surface the server's UserError text when present (e.g. "This
			// confirmation was lost when the assistant restarted") so the user
			// sees the actual reason instead of a generic "Try again". UserError
			// from `n8n-workflow` is mapped to a 400 with the message in the
			// response body — `ResponseError.message` exposes that here.
			const status = error instanceof ResponseError ? error.httpStatusCode : undefined;
			if (status === 400) {
				const serverMessage = error instanceof ResponseError && error.message ? error.message : '';
				toast.showError(
					new Error(serverMessage || 'The confirmation could not be processed.'),
					'Confirmation failed',
				);
			} else {
				toast.showError(
					new Error('Failed to send confirmation. Try again.'),
					'Confirmation failed',
				);
			}
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
				threadId,
				exportedAt: new Date().toISOString(),
				messages: messages.value,
				events: collapseDeltaEvents(debugEvents.value),
			},
			null,
			2,
		);
	}

	return reactive({
		id: threadId,

		// state refs
		messages,
		projectId,
		activeRunId,
		archivedWorkflowIds,
		latestTasks,
		debugEvents,
		resolvedConfirmationIds,
		sessionAlwaysAllowKeys,
		pendingMessageCount,
		hydrationStatus,
		sseState,
		lastEventId,
		amendContext,
		activePlanEdit,
		updatingPlanRequestIds,

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
		setPendingHandoff,
		consumePendingHandoff,
		resetState,
		dispose,
		connectSSE,
		closeSSE,
		loadHistoricalMessages,
		loadThreadStatus,
		sendMessage,
		cancelRun,
		cancelBackgroundTask,
		amendAgent,
		startPlanEdit,
		cancelPlanEdit,
		markPlanUpdatePending,
		clearPlanUpdatePending,
		confirmAction,
		confirmResourceDecision,
		resolveConfirmation,
		addAlwaysAllowKey,
		findToolCallByRequestId,
		copyFullTrace,
		submitFeedback,
	});
}
