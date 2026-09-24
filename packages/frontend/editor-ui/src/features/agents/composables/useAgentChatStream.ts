import { ref, reactive, computed, watch, onScopeDispose, type Ref } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { TIME } from '@/app/constants/durations';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';
import type {
	AgentBuilderOpenSuspension,
	AgentChatQueueItem,
	AgentPersistedMessageDto,
	AgentSseEvent,
	CancellationResumeData,
} from '@n8n/api-types';
import { applyForwardedChildChunk, APPROVAL_TOOL_NAME, emptyChildTrace } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { convertFileToBinaryData, resolveFileMimeType } from '@/app/utils/fileUtils';
import {
	cancelAgentChatExecution,
	cancelAgentChatRun,
	clearTestChatMessages,
	getChatMessages,
	getAgentChatQueue,
	removeAgentQueuedMessage,
	getTestChatMessages,
} from './useAgentApi';

import {
	applyOpenSuspensions,
	convertDbMessages,
	findOpenInteractive,
	findTailOpenInteractive,
	findTailSteerableInteractive,
	getMessageInteractive,
	getMessageInteractives,
	isApprovalSuspendInput,
	rebuildInteractiveFromHistory,
	setMessageInteractives,
	upsertMessageInteractive,
} from '@/features/ai/shared/agentsChat/messageMappers';
import { getMessageThinkingSegments } from '@/features/ai/shared/agentsChat/thinking';
import type { ChatMessage, ThinkingSegment, ToolCall } from '@/features/ai/shared/agentsChat/types';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';
import { summariseToolCall } from '@/features/ai/shared/agentsChat/interactiveSummary';
import { isFailedDelegateOutput } from '../utils/delegate-tool';
import { useAgentExecutionUpdates } from './useAgentExecutionUpdates';

export interface FatalAgentError {
	message: string;
	missing: string[];
}

interface AgentChatWarning {
	message: string;
	server?: string;
	code?: string;
}

export interface UseAgentChatStreamParams {
	projectId: Ref<string>;
	agentId: Ref<string>;
	/**
	 * When provided, chat mode runs in session-continuation: history is fetched
	 * per-thread and the id is propagated to the backend so further messages
	 * extend the same session.
	 */
	continueSessionId?: Ref<string | undefined>;
	newSession?: Ref<boolean>;
	onHistoryLoaded?: (count: number) => void;
	onSessionCreated?: (sessionId: string) => void;
}

type ResumePayload =
	| {
			runId: string;
			toolCallId: string;
			resumeData: unknown;
	  }
	| {
			runId: string;
			toolCallId: string;
			cancelled: true;
			text: string;
	  };

const STOP_ACCEPTANCE_TIMEOUT_MS = 30 * TIME.SECOND;
const MAX_WAITING_STREAMS = 2;

function getApprovalDecision(value: unknown): boolean | undefined {
	if (!isRecord(value) || typeof value.approved !== 'boolean') return undefined;
	return value.approved;
}

function warningKey(warning: AgentChatWarning): string {
	return JSON.stringify([warning.code ?? '', warning.server ?? '', warning.message]);
}

export function useAgentChatStream(params: UseAgentChatStreamParams) {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showError } = useToast();

	const messages = ref<ChatMessage[]>([]);
	const isStreamOpen = ref(false);
	const isSubmitting = ref(false);
	const queuedMessages = ref<AgentChatQueueItem[]>([]);
	const removingQueueIds = ref(new Set<string>());
	const streams = new Map<AbortController, StreamSession>();
	let queueVersion = 0;
	let submissionVersion = 0;
	const activeExecutionId = ref<string | null>(null);
	const acceptedSessionId = ref<string>();
	const isRecovering = ref(false);
	const isStreaming = computed(
		() => isStreamOpen.value || activeExecutionId.value !== null || isRecovering.value,
	);
	const isCancelling = ref(false);
	let stopTargetId: string | undefined;
	const abortController = ref<AbortController | null>(null);
	const streamSettlements = new WeakMap<AbortController, Promise<void>>();
	const historyLoaded = ref(false);
	const isLoadingHistory = computed(() => isRecovering.value && !historyLoaded.value);
	const pushStore = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	let disposed = false;
	let historyVersion = 0;
	let streamVersion = 0;
	let refreshAfterStream = false;
	let retryCount = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;
	let stopAcceptanceTimer: ReturnType<typeof setTimeout> | undefined;
	let acknowledgedSessionId: string | undefined;
	const targetKey = () =>
		JSON.stringify([params.projectId.value, params.agentId.value, params.continueSessionId?.value]);
	function acknowledgeSessionCreation(sessionId = params.continueSessionId?.value): void {
		if (
			!sessionId ||
			params.newSession?.value !== true ||
			sessionId !== params.continueSessionId?.value ||
			sessionId === acknowledgedSessionId
		) {
			return;
		}
		acknowledgedSessionId = sessionId;
		params.onSessionCreated?.(sessionId);
	}
	/**
	 * Set when the backend rejects the stream because the agent itself is
	 * misconfigured (missing instructions / model / credential). Cleared when the
	 * next execution starts so users can retry without a manual dismiss.
	 */
	const fatalError = ref<FatalAgentError | null>(null);
	/**
	 * Non-fatal warnings emitted during a run (e.g. an MCP server that failed to
	 * connect, so its tools were skipped). The run continues; these are shown to
	 * the user as a warning callout. Visible warnings clear when the next execution starts;
	 * explicitly dismissed warnings stay hidden for this composable instance.
	 */
	const warnings = ref<AgentChatWarning[]>([]);
	const dismissedWarningKeys = new Set<string>();

	const messagingState = computed<'idle' | 'waitingFirstChunk' | 'receiving'>(() => {
		if (!isStreaming.value) return 'idle';
		const lastMsg = messages.value[messages.value.length - 1];
		if (!lastMsg || lastMsg.role === 'user') return 'waitingFirstChunk';
		return 'receiving';
	});

	async function refreshHistory({
		clearOnNotFound = false,
		silent = false,
	}: {
		clearOnNotFound?: boolean;
		silent?: boolean;
	} = {}): Promise<boolean> {
		if (disposed) return false;
		const continueId = params.continueSessionId?.value ?? acceptedSessionId.value;
		// Reject outdated session, request, and stream snapshots to preserve the current conversation.
		const target = targetKey();
		const version = ++historyVersion;
		const streamAtStart = streamVersion;
		const isCurrent = () => !disposed && target === targetKey() && version === historyVersion;
		try {
			let dbMessages: AgentPersistedMessageDto[];
			let openSuspensions: AgentBuilderOpenSuspension[] = [];
			let runningExecutionId: string | null | undefined;
			if (continueId) {
				const envelope = await getChatMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
					continueId,
				);
				dbMessages = envelope.messages;
				openSuspensions = envelope.openSuspensions;
				runningExecutionId = envelope.activeExecutionId;
			} else {
				const envelope = await getTestChatMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
				);
				dbMessages = envelope.messages;
				openSuspensions = envelope.openSuspensions;
				runningExecutionId = envelope.activeExecutionId;
			}
			if (!isCurrent()) return false;
			if (continueId) acknowledgeSessionCreation(continueId);
			retryCount = 0;
			clearTimeout(retryTimer);
			if (!isStreamOpen.value && streamAtStart === streamVersion) {
				messages.value = applyOpenSuspensions(convertDbMessages(dbMessages), openSuspensions);
				isRecovering.value = false;
				if (runningExecutionId !== undefined) activeExecutionId.value = runningExecutionId;
				if (isCancelling.value) reconcileStop();
			} else if (isStreamOpen.value) {
				refreshAfterStream = true;
			} else {
				refreshHistoryFromPush();
			}
			return true;
		} catch (error) {
			if (!isCurrent()) return false;
			const status = (error as { httpStatusCode?: number } | null)?.httpStatusCode;
			if (status === 404) {
				if (!isStreamOpen.value && streamAtStart === streamVersion && !activeExecutionId.value) {
					isRecovering.value = false;
					isCancelling.value = false;
				}
				if (
					clearOnNotFound &&
					!activeExecutionId.value &&
					!isStreamOpen.value &&
					streamAtStart === streamVersion
				) {
					messages.value = [];
				}
				return clearOnNotFound;
			} else if (!silent) {
				showError(error, locale.baseText('agents.chat.loadHistory.error'));
			}
			// Keep the current transcript and retry twice before waiting for another update or recovery event.
			if (retryCount < 2) {
				clearTimeout(retryTimer);
				retryTimer = setTimeout(() => refreshHistoryFromPush(), TIME.SECOND * 2 ** retryCount++);
			}
			return false;
		}
	}

	async function loadHistory(): Promise<void> {
		if (historyLoaded.value) return;
		isRecovering.value = true;
		const queue = refreshQueue();
		const loaded = await refreshHistory({ clearOnNotFound: true });
		await queue;
		historyLoaded.value = true;
		// A running resume can have no messages yet. Keep its session selected.
		if (loaded && (messages.value.length > 0 || !isStreaming.value)) {
			params.onHistoryLoaded?.(messages.value.length);
		}
	}

	// A turn can complete with no stream attached — a Wait node finishing wakes the
	// run server-side, long after this chat's SSE stream closed.
	const refreshHistoryFromPush = useAgentExecutionUpdates(
		{
			projectId: params.projectId,
			agentId: params.agentId,
			// A continued session is pinned to one thread; the default test chat has
			// only one, so any update for this agent is the chat being shown.
			...(params.continueSessionId ? { threadId: params.continueSessionId } : {}),
		},
		async () => {
			await refreshQueue();
			// Defer history refreshes until the local stream ends to preserve streamed text.
			if (isStreamOpen.value) {
				refreshAfterStream = true;
				return;
			}
			await refreshHistory({ silent: true });
		},
		() => {
			historyVersion++;
			retryCount = 0;
			clearTimeout(retryTimer);
		},
	);

	async function refreshQueue(): Promise<void> {
		const threadId = params.continueSessionId?.value ?? acceptedSessionId.value;
		if (!threadId || disposed) return;
		const target = targetKey();
		const version = ++queueVersion;
		try {
			const result = await getAgentChatQueue(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				threadId,
			);
			if (!disposed && target === targetKey() && version === queueVersion)
				queuedMessages.value = result.items;
		} catch (error) {
			if (!disposed && target === targetKey() && version === queueVersion) {
				showError(error, locale.baseText('agents.chat.queue.loadError'));
			}
		}
	}

	async function removeQueuedMessage(queueId: string): Promise<void> {
		const threadId = params.continueSessionId?.value ?? acceptedSessionId.value;
		if (!threadId || removingQueueIds.value.has(queueId)) return;
		const target = targetKey();
		removingQueueIds.value.add(queueId);
		try {
			await removeAgentQueuedMessage(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				threadId,
				queueId,
			);
			if (disposed || target !== targetKey()) return;
			queueVersion++;
			queuedMessages.value = queuedMessages.value.filter((item) => item.id !== queueId);
			for (const [controller, session] of streams) {
				if (session.queueId === queueId && !session.executionId) controller.abort();
			}
		} catch (error) {
			if (!disposed && target === targetKey())
				showError(error, locale.baseText('agents.chat.queue.removeError'));
		} finally {
			if (target === targetKey()) {
				removingQueueIds.value.delete(queueId);
				refreshHistoryFromPush();
			}
		}
	}

	const removeQueueListener = pushStore.addEventListener((event) => {
		if (
			event.type === 'agentMessageQueueUpdated' &&
			event.data.projectId === params.projectId.value &&
			event.data.agentId === params.agentId.value &&
			event.data.threadId === (params.continueSessionId?.value ?? acceptedSessionId.value)
		) {
			queueVersion++;
			refreshHistoryFromPush();
		}
	});

	// Recover missed updates when the preview reopens, reconnects, becomes visible, or changes session.
	function refresh() {
		retryCount = 0;
		clearTimeout(retryTimer);
		refreshHistoryFromPush();
	}
	watch(
		() => pushStore.isConnected,
		(connected) => {
			if (connected) refresh();
		},
	);
	watch(visibility, (value) => {
		if (value === 'visible') refresh();
	});
	watch(targetKey, () => {
		detachStream();
		messages.value = [];
		queuedMessages.value = [];
		removingQueueIds.value.clear();
		queueVersion++;
		activeExecutionId.value = null;
		acceptedSessionId.value = undefined;
		isRecovering.value = true;
		isCancelling.value = false;
		stopTargetId = undefined;
		historyVersion++;
		streamVersion++;
		refresh();
	});
	// Clear retry timers and ignore late responses when this chat closes.
	onScopeDispose(() => {
		disposed = true;
		removeQueueListener();
		detachStream();
		clearTimeout(retryTimer);
	});

	async function clearHistory(): Promise<void> {
		try {
			await clearTestChatMessages(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
			);
			messages.value = [];
		} catch (error) {
			showError(error, locale.baseText('agents.chat.clearHistory.error'));
		}
	}

	// -------------------------------------------------------------------------
	// SSE handler — typed AgentSseEvent dispatch
	// -------------------------------------------------------------------------

	interface StreamSession {
		target: string;
		controller: AbortController;
		queueId?: string;
		userMessage?: ChatMessage;
		executionId?: string;
		busy?: boolean;
		onAccepted?: () => void;
		/**
		 * Set when the stream emitted an `error` event. Callers (notably
		 * `resume`) inspect this so they can roll back optimistic UI state
		 * that was applied before the round-trip.
		 */
		errorEmitted: boolean;
		/** Set when the stream reaches a valid terminal event. */
		terminalEventReceived: boolean;
		/**
		 * Cursor pointing at the ChatMessage currently being filled by
		 * text/reasoning/tool-input events. `start-step` / `finish-step`
		 * boundaries clear it; the next text/tool event lazily mints a fresh
		 * ChatMessage.
		 */
		current?: ChatMessage;
		/** Tracks any messages we minted so we can flip `streaming → success` on done. */
		minted: Set<ChatMessage>;
		reasoningStartedAt: Map<string, number>;
		openReasoning: Map<string, ThinkingSegment>;
	}

	/**
	 * Lazily mint a ChatMessage when the next text/reasoning/tool event needs
	 * one. The id is FE-issued (used as a v-for key) — the wire format no
	 * longer carries a server-minted messageId.
	 */
	function ensureCurrent(session: StreamSession): ChatMessage {
		if (session.current) return session.current;
		const msg = reactive<ChatMessage>({
			id: crypto.randomUUID(),
			role: 'assistant',
			content: '',
			toolCalls: [],
			status: CHAT_MESSAGE_STATUS.STREAMING,
			executionId: session.executionId,
		});
		messages.value.push(msg);
		session.current = msg;
		session.minted.add(msg);
		return msg;
	}

	function ensureReasoningSegment(session: StreamSession, id: string): ThinkingSegment {
		const existing = session.openReasoning.get(id);
		if (existing) return existing;

		const msg = ensureCurrent(session);
		const segment = reactive<ThinkingSegment>({
			id,
			content: '',
			startTime: session.reasoningStartedAt.get(id) ?? Date.now(),
		});
		msg.thinkingSegments = [...(msg.thinkingSegments ?? []), segment];
		session.openReasoning.set(id, segment);
		return segment;
	}

	function settleReasoning(session: StreamSession, id: string, endTime = Date.now()): void {
		const segment = session.openReasoning.get(id);
		if (segment) segment.endTime = endTime;
		session.openReasoning.delete(id);
		session.reasoningStartedAt.delete(id);
	}

	function settleOpenReasoning(session: StreamSession): void {
		const endTime = Date.now();
		for (const id of session.openReasoning.keys()) settleReasoning(session, id, endTime);
		session.reasoningStartedAt.clear();
	}

	/**
	 * Find a ToolCall by its `toolCallId`, walking from the latest ChatMessage
	 * backwards. Tool results / execution-start events arrive in fresh LLM
	 * iterations after the tool-call message has been closed by `finish-step`,
	 * so we cannot rely on the cursor — only the natural id.
	 */
	function findToolCallById(toolCallId: string): { msg: ChatMessage; tc: ToolCall } | null {
		for (let i = messages.value.length - 1; i >= 0; i--) {
			const m = messages.value[i];
			const found = m.toolCalls?.find((t) => t.toolCallId === toolCallId);
			if (found) return { msg: m, tc: found };
		}
		return null;
	}

	function findOpenSuspension(): { runId: string; toolCallId: string } | undefined {
		// Prefer the current turn's card over one abandoned by an earlier turn.
		const interactive =
			findTailOpenInteractive(messages.value) ?? findOpenInteractive(messages.value);
		if (interactive?.runId) {
			return { runId: interactive.runId, toolCallId: interactive.toolCallId };
		}

		for (const message of messages.value) {
			const toolCall = message.toolCalls?.find(
				(tc) => tc.state === TOOL_CALL_STATE.SUSPENDED && tc.runId,
			);
			if (toolCall?.runId) return { runId: toolCall.runId, toolCallId: toolCall.toolCallId };
		}
		return undefined;
	}

	function markMessageSuccessIfSettled(msg: ChatMessage): void {
		if (
			msg.status !== CHAT_MESSAGE_STATUS.AWAITING_USER &&
			msg.status !== CHAT_MESSAGE_STATUS.STREAMING
		)
			return;
		const hasOpenInteractive = getMessageInteractives(msg).some(
			(payload) => payload.resolvedAt === undefined,
		);
		if (!hasOpenInteractive && !msg.toolCalls?.some(isToolCallInFlight))
			msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
	}

	function isToolCallInFlight(toolCall: ToolCall): boolean {
		return (
			toolCall.state === TOOL_CALL_STATE.PENDING ||
			toolCall.state === TOOL_CALL_STATE.RUNNING ||
			toolCall.state === TOOL_CALL_STATE.SUSPENDED
		);
	}

	function markRunCancelled(runId: string): void {
		for (const message of messages.value) {
			const belongsToRun = message.toolCalls?.some((toolCall) => toolCall.runId === runId);
			if (!belongsToRun) continue;

			let changed = false;
			for (const toolCall of message.toolCalls ?? []) {
				if (toolCall.runId !== runId && !isToolCallInFlight(toolCall)) continue;
				toolCall.state = TOOL_CALL_STATE.CANCELLED;
				toolCall.canceled = true;
				changed = true;

				const interactive = getMessageInteractive(message, toolCall.toolCallId);
				if (interactive) {
					upsertMessageInteractive(message, {
						...interactive,
						resolvedAt: Date.now(),
						cancelled: true,
					});
				}
			}
			if (changed) markMessageSuccessIfSettled(message);
		}
	}

	function dropOrphanMintedBubbles(session: StreamSession): void {
		for (const msg of session.minted) {
			if (
				!msg.content &&
				(msg.toolCalls?.length ?? 0) === 0 &&
				getMessageThinkingSegments(msg).length === 0
			) {
				messages.value = messages.value.filter((m) => m !== msg);
				session.minted.delete(msg);
			}
		}
	}

	function markInFlightStateFailed(session: StreamSession): void {
		for (const msg of session.minted) {
			if (
				msg.status === CHAT_MESSAGE_STATUS.STREAMING ||
				msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER
			) {
				msg.status = CHAT_MESSAGE_STATUS.ERROR;
			}
			for (const toolCall of msg.toolCalls ?? []) {
				if (isToolCallInFlight(toolCall)) {
					toolCall.state = TOOL_CALL_STATE.ERROR;
				}
			}
			setMessageInteractives(
				msg,
				getMessageInteractives(msg).filter((interactive) => interactive.resolvedAt !== undefined),
			);
		}
	}

	/**
	 * Settle tool calls left `pending`/`running` after the stream ended (their
	 * terminal events never arrived). Used by `stopGenerating` to recover the
	 * desync where the chat is idle and responsive but tool steps keep pulsing.
	 * Suspended tools are left untouched — they have a `runId` and are still
	 * resolvable through the normal resume/cancel flow.
	 */
	function settleStaleInFlightToolCalls(): void {
		for (const message of messages.value) {
			let changed = false;
			for (const toolCall of message.toolCalls ?? []) {
				if (
					toolCall.state === TOOL_CALL_STATE.PENDING ||
					toolCall.state === TOOL_CALL_STATE.RUNNING
				) {
					toolCall.state = TOOL_CALL_STATE.CANCELLED;
					toolCall.canceled = true;
					changed = true;
				}
			}
			if (changed) markMessageSuccessIfSettled(message);
		}
	}

	function handleEvent(
		event: AgentSseEvent,
		session: StreamSession,
	): { done?: boolean } | undefined {
		if (session.controller.signal.aborted) return { done: true };
		if (session.executionId && abortController.value !== session.controller) {
			finalizeStream(session);
			return { done: true };
		}
		// Controller validation failures only emit `error`. Any other event proves
		// that the backend admitted and persisted this turn.
		if (event.type !== 'error') acknowledgeSessionCreation();
		switch (event.type) {
			case 'message-queued':
				session.queueId = event.queueId;
				acceptedSessionId.value = event.sessionId;
				detachExcessWaitingStreams();
				session.onAccepted?.();
				session.onAccepted = undefined;
				queueVersion++;
				refreshHistoryFromPush();
				break;
			case 'execution-started':
				if (session.userMessage) {
					// Local messages enter FIFO order. An earlier request cannot own a later turn.
					for (const [controller, earlier] of streams) {
						if (controller === session.controller) break;
						if (earlier.userMessage) controller.abort();
					}
				}
				abortController.value = session.controller;
				isStreamOpen.value = true;
				streamVersion++;
				fatalError.value = null;
				warnings.value = [];
				if (session.userMessage) {
					if (
						!messages.value.some(
							(message) => message.role === 'user' && message.executionId === event.executionId,
						)
					) {
						messages.value.push({ ...session.userMessage, executionId: event.executionId });
					}
				}
				queueVersion++;
				queuedMessages.value = queuedMessages.value.filter((item) => item.id !== session.queueId);
				void refreshQueue();
				clearTimeout(stopAcceptanceTimer);
				session.executionId = event.executionId;
				activeExecutionId.value = event.executionId;
				acceptedSessionId.value = event.sessionId;
				session.onAccepted?.();
				session.onAccepted = undefined;
				if (isCancelling.value) reconcileStop();
				break;
			case 'start-step':
			case 'finish-step':
				// LLM iteration boundary — the next text/tool event mints a
				// fresh ChatMessage. We don't flip status here; `done` is what
				// finalizes the message at the end of the stream.
				session.current = undefined;
				break;
			case 'text-start':
			case 'text-end':
				break;
			case 'reasoning-start':
				session.reasoningStartedAt.set(event.id, Date.now());
				break;
			case 'text-delta': {
				const msg = ensureCurrent(session);
				msg.content += event.delta;
				break;
			}
			case 'reasoning-delta': {
				const msg = ensureCurrent(session);
				const segment = ensureReasoningSegment(session, event.id);
				segment.content += event.delta;
				msg.thinking = (msg.thinking ?? '') + event.delta;
				break;
			}
			case 'reasoning-end':
				settleReasoning(session, event.id);
				break;
			case 'tool-input-start': {
				const msg = ensureCurrent(session);
				if (msg.content && !msg.content.endsWith('\n')) msg.content += '\n';
				msg.toolCalls = msg.toolCalls ?? [];
				const existing = msg.toolCalls.find((t) => t.toolCallId === event.toolCallId);
				if (!existing) {
					msg.toolCalls.push({
						tool: event.toolName,
						toolCallId: event.toolCallId,
						state: TOOL_CALL_STATE.PENDING,
					});
				}
				break;
			}
			case 'tool-input-delta':
				// Streaming tool input isn't rendered incrementally; the full
				// input arrives on `tool-call`. No ToolCall state mutation here.
				break;
			case 'tool-call': {
				// LLM finalized the call. Update input on the existing entry,
				// or push one if `tool-input-start` was missing.
				const msg = ensureCurrent(session);
				msg.toolCalls = msg.toolCalls ?? [];
				const existing = msg.toolCalls.find((t) => t.toolCallId === event.toolCallId);
				if (!existing) {
					msg.toolCalls.push({
						tool: event.toolName,
						toolCallId: event.toolCallId,
						input: event.input,
						state: TOOL_CALL_STATE.PENDING,
						displaySummary: summariseToolCall(event.toolName, undefined, event.input),
					});
				} else {
					existing.input = event.input;
					existing.displaySummary = summariseToolCall(
						existing.tool,
						existing.output,
						existing.input,
					);
					if (
						existing.state !== TOOL_CALL_STATE.RUNNING &&
						existing.state !== TOOL_CALL_STATE.DONE &&
						existing.state !== TOOL_CALL_STATE.CANCELLED
					) {
						existing.state = TOOL_CALL_STATE.PENDING;
					}
				}
				break;
			}
			case 'tool-execution-start': {
				// Timing is server-measured: store the backend `startTime` verbatim
				// (no client clock) so the live duration matches the persisted one.
				const found = findToolCallById(event.toolCallId);
				if (found) {
					found.tc.startTime = event.startTime;
					if (
						found.tc.state !== TOOL_CALL_STATE.DONE &&
						found.tc.state !== TOOL_CALL_STATE.ERROR &&
						found.tc.state !== TOOL_CALL_STATE.CANCELLED
					) {
						found.tc.state = TOOL_CALL_STATE.RUNNING;
					}
				}
				break;
			}
			case 'tool-execution-end': {
				// Per-tool completion bridged from the runtime event bus. Flips a
				// concurrent tool call to its terminal state the moment it settles,
				// rather than waiting for the batched `tool-result` events. The later
				// `tool-result` still fills in the output/summary. `endTime` is the
				// server-measured settle time (no client clock).
				const found = findToolCallById(event.toolCallId);
				if (found) {
					if (
						found.tc.state !== TOOL_CALL_STATE.DONE &&
						found.tc.state !== TOOL_CALL_STATE.ERROR &&
						found.tc.state !== TOOL_CALL_STATE.SUSPENDED
					) {
						found.tc.state = event.isError ? TOOL_CALL_STATE.ERROR : TOOL_CALL_STATE.DONE;
					}
					found.tc.endTime = event.endTime;
				}
				break;
			}
			case 'tool-result': {
				const found = findToolCallById(event.toolCallId);
				if (found) {
					const toolResultEvent = event as typeof event & { canceled?: boolean };
					found.tc.output = event.output;
					const failed = event.isError || isFailedDelegateOutput(found.tc.tool, event.output);
					found.tc.state = failed
						? TOOL_CALL_STATE.ERROR
						: toolResultEvent.canceled === true
							? TOOL_CALL_STATE.CANCELLED
							: TOOL_CALL_STATE.DONE;
					found.tc.canceled = toolResultEvent.canceled === true;
					found.tc.displaySummary = summariseToolCall(found.tc.tool, event.output, found.tc.input);
					const currentInteractive = getMessageInteractive(found.msg, event.toolCallId);
					const updated = rebuildInteractiveFromHistory(found.tc);
					if (updated && currentInteractive?.resolvedAt === undefined) {
						upsertMessageInteractive(found.msg, updated);
					}
					markMessageSuccessIfSettled(found.msg);
				}
				break;
			}
			case 'tool-call-suspended': {
				const { payload } = event;
				const found = findToolCallById(payload.toolCallId);
				// Keep the model-authored tool input intact. A delegated tool can
				// suspend with a nested approval payload that renders a different tool.
				const suspendIsRenderableInput = isApprovalSuspendInput(payload.input);
				let msg: ChatMessage;
				let tc: ToolCall;
				if (found) {
					msg = found.msg;
					tc = found.tc;
					tc.state = TOOL_CALL_STATE.SUSPENDED;
					tc.canceled = false;
					tc.output = undefined;
					tc.endTime = undefined;
					tc.displaySummary = undefined;
					tc.runId = payload.runId;
					tc.suspendPayload = payload.input;
				} else {
					msg = ensureCurrent(session);
					tc = {
						tool: payload.toolName,
						toolCallId: payload.toolCallId,
						state: TOOL_CALL_STATE.SUSPENDED,
						runId: payload.runId,
						...(suspendIsRenderableInput
							? { input: payload.input }
							: { suspendPayload: payload.input }),
					};
					msg.toolCalls = [...(msg.toolCalls ?? []), tc];
				}
				const interactive = rebuildInteractiveFromHistory({
					...tc,
					output: undefined,
				});
				if (interactive) {
					interactive.runId = payload.runId;
					upsertMessageInteractive(msg, interactive);
					msg.status = CHAT_MESSAGE_STATUS.AWAITING_USER;
				}
				session.terminalEventReceived = true;
				break;
			}
			case 'subagent-chunk': {
				const found = findToolCallById(event.parentToolCallId);
				if (!found) break;
				found.tc.childProgress ??= emptyChildTrace();
				applyForwardedChildChunk(found.tc.childProgress, event.chunk);
				break;
			}
			case 'message':
				// Custom (sub-agent / app-defined) message envelope. Reserved
				// for future use; nothing renders today.
				break;
			case 'warning': {
				// Non-fatal run warning (e.g. an MCP server was unavailable, so its
				// tools were skipped). The run continues; surfaced as a callout.
				const warning: AgentChatWarning = {
					message: event.message,
					...(event.server !== undefined && { server: event.server }),
					...(event.code !== undefined && { code: event.code }),
				};
				if (!dismissedWarningKeys.has(warningKey(warning))) {
					warnings.value.push(warning);
				}
				break;
			}
			case 'error': {
				session.errorEmitted = true;
				if (event.errorCode === 'turn_already_running') {
					session.busy = true;
					isCancelling.value = false;
					stopTargetId = undefined;
					isRecovering.value = true;
					return { done: true };
				}
				settleOpenReasoning(session);
				dropOrphanMintedBubbles(session);
				markInFlightStateFailed(session);
				if (event.errorCode === 'agent_misconfigured') {
					fatalError.value = { message: event.message, missing: event.missing ?? [] };
				} else if (session.userMessage && !session.executionId) {
					showError(new Error(event.message), locale.baseText('agents.chat.queue.sendError'));
				} else {
					messages.value.push(
						reactive<ChatMessage>({
							id: crypto.randomUUID(),
							role: 'assistant',
							content: event.message,
							toolCalls: [],
							status: CHAT_MESSAGE_STATUS.ERROR,
						}),
					);
				}
				session.terminalEventReceived = true;
				break;
			}
			case 'done':
				if (event.executionId === activeExecutionId.value) activeExecutionId.value = null;
				settleOpenReasoning(session);
				if (event.executionId) {
					for (const msg of session.minted) {
						msg.executionId = event.executionId;
					}
				}
				session.terminalEventReceived = true;
				return { done: true };
			default:
				break;
		}
		return undefined;
	}

	function detachExcessWaitingStreams(): void {
		let waiting = 0;
		for (const [controller, session] of streams) {
			if (!session.queueId || session.executionId || controller.signal.aborted) continue;
			// Leave HTTP/1.1 connections available for controls and history recovery.
			if (++waiting > MAX_WAITING_STREAMS) controller.abort();
		}
	}

	async function consumeStream(
		response: Response,
		session: StreamSession,
		signal: AbortSignal,
	): Promise<void> {
		if (!response.body) return;
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			readerLoop: while (true) {
				const { done, value } = await reader.read();
				if (done || signal.aborted || disposed || session.target !== targetKey()) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const raw = line.slice(6);
					let event: AgentSseEvent;
					try {
						event = JSON.parse(raw) as AgentSseEvent;
					} catch {
						continue;
					}
					const result = handleEvent(event, session);
					if (result?.done) {
						break readerLoop;
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	function finalizeStream(session: StreamSession): void {
		settleOpenReasoning(session);
		for (const msg of session.minted) {
			if (msg.status === CHAT_MESSAGE_STATUS.STREAMING) msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
			// Defensive: if the stream completed (`done`) while tool calls are
			// still `pending`/`running`, their terminal events never arrived
			// (e.g. backend emitted `done` before per-tool `tool-execution-end`,
			// or the events were dropped). Settle them so the UI stops pulsing
			// and Stop hides — the run is over and the agent is responsive.
			for (const toolCall of msg.toolCalls ?? []) {
				if (isToolCallInFlight(toolCall) && toolCall.state !== TOOL_CALL_STATE.SUSPENDED) {
					toolCall.state = TOOL_CALL_STATE.DONE;
				}
			}
		}
	}

	type StreamOutcome = 'completed' | 'failed' | 'aborted' | 'busy' | 'detached';

	async function postAndConsume(
		url: string,
		body: Record<string, unknown>,
		onAccepted?: () => void,
		userMessage?: ChatMessage,
	): Promise<{ outcome: StreamOutcome }> {
		const controller = new AbortController();
		const session: StreamSession = {
			controller,
			userMessage,
			target: targetKey(),
			onAccepted,
			errorEmitted: false,
			terminalEventReceived: false,
			minted: new Set(),
			reasoningStartedAt: new Map(),
			openReasoning: new Map(),
		};
		streams.set(controller, session);
		if (!userMessage) {
			isStreamOpen.value = true;
			streamVersion++;
			abortController.value = controller;
		}
		let settleStream: (() => void) | undefined;
		streamSettlements.set(
			controller,
			new Promise<void>((resolve) => {
				settleStream = resolve;
			}),
		);
		const isCurrent = () => !disposed && session.target === targetKey();

		try {
			const browserId = localStorage.getItem('n8n-browserId') ?? '';
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'browser-id': browserId },
				credentials: 'include',
				body: JSON.stringify(body),
				signal: controller.signal,
			});
			if (!isCurrent() || controller.signal.aborted) return { outcome: 'aborted' };
			if (!response.ok || !response.body) {
				handleEvent(
					{ type: 'error', message: response.statusText || 'Failed to reach agent' },
					session,
				);
				return { outcome: 'failed' };
			}
			await consumeStream(response, session, controller.signal);
			if (!isCurrent() || controller.signal.aborted) return { outcome: 'aborted' };
			if (session.busy) return { outcome: 'busy' };
			if (!session.terminalEventReceived) {
				if (session.userMessage && !session.queueId && !session.executionId)
					showError(
						new Error('Stream closed before acceptance'),
						locale.baseText('agents.chat.queue.sendError'),
					);
				if (abortController.value === controller) isRecovering.value = true;
				return { outcome: 'detached' };
			}
			finalizeStream(session);
			if (!session.errorEmitted) session.onAccepted?.();
			return { outcome: session.errorEmitted ? 'failed' : 'completed' };
		} catch (error) {
			if (!isCurrent() || controller.signal.aborted) return { outcome: 'aborted' };
			if (session.errorEmitted) return { outcome: 'failed' };
			if (session.userMessage && !session.queueId && !session.executionId)
				showError(error, locale.baseText('agents.chat.queue.sendError'));
			// A lost response cannot tell us whether the server accepted or finished the turn.
			if (abortController.value === controller) isRecovering.value = true;
			return { outcome: 'detached' };
		} finally {
			streams.delete(controller);
			if (abortController.value === controller) {
				if (session.terminalEventReceived && session.executionId === activeExecutionId.value)
					activeExecutionId.value = null;
				clearTimeout(stopAcceptanceTimer);
				abortController.value = null;
				isStreamOpen.value = false;
			}
			streamSettlements.delete(controller);
			settleStream?.();
			if (isCurrent()) {
				if (session.executionId) streamVersion++;
				if (
					session.userMessage ||
					session.executionId ||
					refreshAfterStream ||
					isRecovering.value
				) {
					refreshAfterStream = false;
					refreshHistoryFromPush();
				} else if (isCancelling.value && !activeExecutionId.value) {
					isCancelling.value = false;
				}
			}
		}
	}

	async function streamChat(
		message: string,
		files?: File[],
		onAccepted?: () => void,
		userMessage?: ChatMessage,
	) {
		const target = targetKey();
		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/chat`;
		const body: Record<string, unknown> = { message };
		const sessionId = params.continueSessionId?.value ?? acceptedSessionId.value;
		const newSession = params.newSession?.value === true && sessionId !== acknowledgedSessionId;
		if (sessionId) {
			body.sessionId = sessionId;
			if (newSession) body.newSession = true;
		}
		if (files?.length) {
			body.attachments = await Promise.all(
				files.map(async (file) => {
					const encoded = await convertFileToBinaryData(file);
					// Browsers report an empty type for unrecognized extensions; the
					// backend requires a non-empty mime type and sniffs the real one.
					return {
						fileName: file.name,
						mimeType: encoded.mimeType || 'application/octet-stream',
						data: encoded.data,
					};
				}),
			);
		}
		if (disposed || target !== targetKey()) return { outcome: 'aborted' };
		const result = await postAndConsume(url, body, onAccepted, userMessage);
		if (
			newSession &&
			params.newSession?.value === true &&
			sessionId &&
			sessionId === params.continueSessionId?.value &&
			sessionId !== acknowledgedSessionId
		) {
			await refreshHistory({ silent: true });
		}
		return result;
	}

	/**
	 * Resume a suspended interaction via `chat/resume`, re-entering the same
	 * SSE handler. The `runId` is required — it comes from the original
	 * `tool-call-suspended` chunk (live) or from the `openSuspensions` sidecar
	 * applied during history reload.
	 *
	 * The UI updates optimistically, then reconciles with persisted history if
	 * the resume fails, falling back to the previous card state if history is unavailable.
	 */
	async function resume(payload: ResumePayload, onAccepted?: () => void): Promise<'sent' | 'busy'> {
		if (isStreaming.value || isCancelling.value) return 'busy';

		const isCancellation = 'cancelled' in payload;
		const text = isCancellation ? payload.text.trim() : '';
		if (isCancellation && !text) return 'busy';

		const found = findToolCallById(payload.toolCallId);
		const snapshot = found
			? {
					tc: found.tc,
					prevState: found.tc.state,
					prevOutput: found.tc.output,
					prevCanceled: found.tc.canceled,
					prevSummary: found.tc.displaySummary,
					msg: found.msg,
					prevStatus: found.msg.status,
					prevInteractive: found.msg.interactive,
					prevInteractives: found.msg.interactives ? [...found.msg.interactives] : undefined,
				}
			: null;
		let optimisticUserMessageId: string | undefined;

		if (found) {
			if (isCancellation) {
				found.tc.state = TOOL_CALL_STATE.CANCELLED;
				found.tc.canceled = true;
				const interactive = getMessageInteractive(found.msg, payload.toolCallId);
				if (interactive) {
					upsertMessageInteractive(found.msg, {
						...interactive,
						resolvedAt: Date.now(),
						cancelled: true,
					});
				}
			} else {
				found.tc.state = TOOL_CALL_STATE.DONE;
				found.tc.canceled = false;
				found.tc.output = payload.resumeData;
				found.tc.displaySummary = summariseToolCall(
					found.tc.tool,
					payload.resumeData,
					found.tc.input,
				);
				const updated = rebuildInteractiveFromHistory(found.tc);
				if (updated?.toolName === APPROVAL_TOOL_NAME) {
					const approved = getApprovalDecision(payload.resumeData);
					if (approved !== undefined) updated.resolvedValue = { approved };
				}
				if (updated) upsertMessageInteractive(found.msg, updated);
			}
			markMessageSuccessIfSettled(found.msg);
		}

		const resumeData: unknown = isCancellation
			? ({
					_type: 'agent.cancellation',
					message: text,
				} satisfies CancellationResumeData)
			: payload.resumeData;

		if (isCancellation) {
			optimisticUserMessageId = crypto.randomUUID();
			fatalError.value = null;
			messages.value.push({
				id: optimisticUserMessageId,
				role: 'user',
				content: text,
				status: 'success',
				createdAt: Date.now(),
			});
		}

		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/chat/resume`;
		const { outcome } = await postAndConsume(
			url,
			{ runId: payload.runId, toolCallId: payload.toolCallId, resumeData },
			onAccepted,
		);
		let reconciled = false;
		if (outcome === 'failed' || outcome === 'busy') {
			reconciled = await refreshHistory();
		}
		if (
			(outcome === 'failed' || outcome === 'busy') &&
			!reconciled &&
			!activeExecutionId.value &&
			snapshot
		) {
			snapshot.tc.state = snapshot.prevState;
			snapshot.tc.output = snapshot.prevOutput;
			snapshot.tc.canceled = snapshot.prevCanceled;
			snapshot.tc.displaySummary = snapshot.prevSummary;
			snapshot.msg.status = snapshot.prevStatus;
			if (snapshot.prevInteractives) {
				setMessageInteractives(snapshot.msg, snapshot.prevInteractives);
			} else if (snapshot.prevInteractive) {
				setMessageInteractives(snapshot.msg, [snapshot.prevInteractive]);
			} else {
				setMessageInteractives(snapshot.msg, []);
			}
		}
		if (
			optimisticUserMessageId &&
			(outcome === 'busy' || (outcome === 'failed' && !reconciled && !activeExecutionId.value))
		) {
			messages.value = messages.value.filter((m) => m.id !== optimisticUserMessageId);
		}
		return outcome === 'busy' ? 'busy' : 'sent';
	}

	async function cancelAndSteer(text: string, onAccepted?: () => void): Promise<'sent' | 'busy'> {
		// Steering answers the card the user is looking at — the one on the current
		// turn, and never a waiting card, which only the workflow or a deliberate
		// click may end. The chat input gates this too, but the rule belongs with
		// the resume it would send.
		const openInteractive = findTailSteerableInteractive(messages.value);
		if (!openInteractive?.runId) return 'busy';

		return await resume(
			{
				runId: openInteractive.runId,
				toolCallId: openInteractive.toolCallId,
				cancelled: true,
				text,
			},
			onAccepted,
		);
	}

	async function sendMessage(
		text: string,
		files?: File[],
		onAccepted?: () => void,
	): Promise<'sent' | 'busy'> {
		const trimmed = text.trim();
		if ((!trimmed && !files?.length) || isSubmitting.value || isLoadingHistory.value) return 'busy';
		isSubmitting.value = true;
		const submission = ++submissionVersion;
		const target = targetKey();
		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmed,
			status: 'success',
			createdAt: Date.now(),
			attachments: files?.map((file) => ({
				fileName: file.name,
				mimeType: resolveFileMimeType(file.name, file.type) || 'application/octet-stream',
				sizeBytes: file.size,
				file,
			})),
		};
		return await new Promise<'sent' | 'busy'>((resolve) => {
			let released = false;
			const release = (outcome: 'sent' | 'busy' = 'sent') => {
				if (released) return;
				released = true;
				if (submission === submissionVersion) isSubmitting.value = false;
				resolve(outcome);
			};
			void streamChat(
				trimmed,
				files,
				() => {
					onAccepted?.();
					release();
				},
				userMessage,
			)
				.then(({ outcome }) => {
					release(outcome === 'busy' ? 'busy' : 'sent');
				})
				.catch((error: unknown) => {
					if (!disposed && target === targetKey())
						showError(error, locale.baseText('agents.chat.queue.sendError'));
				})
				.finally(release);
		});
	}

	function dismissFatalError(): void {
		fatalError.value = null;
	}

	function dismissWarning(index: number): void {
		const warning = warnings.value[index];
		if (!warning) return;
		const dismissedKey = warningKey(warning);
		dismissedWarningKeys.add(dismissedKey);
		warnings.value = warnings.value.filter((item) => warningKey(item) !== dismissedKey);
	}

	function detachStream(): void {
		clearTimeout(stopAcceptanceTimer);
		abortController.value = null;
		isStreamOpen.value = false;
		isSubmitting.value = false;
		submissionVersion++;
		for (const controller of streams.keys()) controller.abort();
	}

	function retainStopUntilAcceptance(): void {
		isCancelling.value = true;
		const controller = abortController.value;
		if (!controller) return;
		stopAcceptanceTimer = setTimeout(() => {
			if (controller !== abortController.value || !isCancelling.value || activeExecutionId.value)
				return;
			isRecovering.value = true;
			detachStream();
		}, STOP_ACCEPTANCE_TIMEOUT_MS);
	}

	function reconcileStop(): void {
		const executionId = activeExecutionId.value;
		if (!executionId || (stopTargetId && stopTargetId !== executionId)) {
			isCancelling.value = false;
			stopTargetId = undefined;
			return;
		}
		const threadId = params.continueSessionId?.value ?? acceptedSessionId.value;
		if (threadId) void requestExecutionStop(executionId, threadId);
	}

	async function requestExecutionStop(executionId: string, threadId: string): Promise<void> {
		if (stopTargetId === executionId) return;
		stopTargetId = executionId;
		const target = targetKey();
		try {
			const { cancelRequested } = await cancelAgentChatExecution(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				threadId,
				executionId,
			);
			if (!cancelRequested && target === targetKey() && stopTargetId === executionId) {
				isCancelling.value = false;
				stopTargetId = undefined;
			}
		} catch (error) {
			if (!disposed && target === targetKey() && stopTargetId === executionId) {
				isCancelling.value = false;
				stopTargetId = undefined;
				showError(error, locale.baseText('agents.chat.stop.error'));
			}
		} finally {
			if (!disposed && target === targetKey()) refreshHistoryFromPush();
		}
	}

	async function stopGenerating(): Promise<void> {
		if (isCancelling.value) return;
		const executionId = activeExecutionId.value;
		const threadId = params.continueSessionId?.value ?? acceptedSessionId.value;
		if (executionId && threadId) {
			isCancelling.value = true;
			await requestExecutionStop(executionId, threadId);
			return;
		}

		const openSuspension = findOpenSuspension();
		if (!openSuspension) {
			if (isStreaming.value) retainStopUntilAcceptance();
			else settleStaleInFlightToolCalls();
			return;
		}

		isCancelling.value = true;
		const controller = abortController.value;
		const settlement = controller ? streamSettlements.get(controller) : undefined;
		try {
			const { cancelled } = await cancelAgentChatRun(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				openSuspension.runId,
			);
			if (cancelled) markRunCancelled(openSuspension.runId);
			else await refreshHistory();
		} catch (error) {
			await refreshHistory();
			showError(error, locale.baseText('agents.chat.stop.error'));
		} finally {
			controller?.abort();
			await settlement;
			isCancelling.value = false;
		}
	}

	return {
		queuedMessages,
		removingQueueIds,
		removeQueuedMessage,
		isSubmitting,
		isLoadingHistory,
		messages,
		isStreaming,
		activeExecutionId,
		isCancelling,
		messagingState,
		fatalError,
		warnings,
		loadHistory,
		refresh,
		clearHistory,
		sendMessage,
		stopGenerating,
		detachStream,
		resume,
		cancelAndSteer,
		dismissFatalError,
		dismissWarning,
	};
}
