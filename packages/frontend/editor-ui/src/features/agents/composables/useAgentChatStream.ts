import { ref, reactive, computed, watch, onScopeDispose, type Ref } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { TIME } from '@/app/constants/durations';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';
import type {
	AgentBuilderOpenSuspension,
	AgentPersistedMessageDto,
	AgentSseEvent,
	AgentChatAdmissionResponse,
	AgentChatQueueItem,
} from '@n8n/api-types';
import { applyForwardedChildChunk, APPROVAL_TOOL_NAME, emptyChildTrace } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import {
	cancelAgentChatRun,
	clearTestChatMessages,
	getChatMessages,
	getTestChatMessages,
	sendAgentChatMessage,
	resumeAgentChat,
	getAgentChatQueue,
	editAgentChatQueueMessage,
	removeAgentChatQueueMessage,
	stopAgentChatQueueEntry,
} from './useAgentApi';

import {
	applyOpenSuspensions,
	convertDbMessages,
	findOpenInteractive,
	findTailOpenInteractive,
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
	onHistoryLoaded?: (count: number, hasQueueEntries: boolean, queueLoadSucceeded: boolean) => void;
}

type ResumePayload = {
	runId: string;
	toolCallId: string;
	resumeData: unknown;
};

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
	const queueItems = ref<AgentChatQueueItem[]>([]);
	const queuedMessages = computed(() =>
		queueItems.value.filter(
			(item): item is Extract<AgentChatQueueItem, { kind: 'message' }> =>
				item.kind === 'message' && item.status === 'queued',
		),
	);
	const activeEntry = computed(() => queueItems.value.find((item) => item.status !== 'queued'));
	const hasPendingResponse = computed(() => queueItems.value.some((item) => item.kind === 'hitl'));
	const isStreaming = computed(() => activeEntry.value !== undefined);
	const stopping = ref(false);
	const isCancelling = computed(() => stopping.value || activeEntry.value?.status === 'cancelling');
	const requests = new Map<string, StreamSession>();
	const liveRequests = ref(new Set<string>());
	const hasLiveStream = computed(() => liveRequests.value.size > 0);
	const detachedQueueIds = new Set<string>();
	const admittedSessionId = ref<string>();
	const threadId = computed(() => params.continueSessionId?.value ?? admittedSessionId.value);
	let queueVersion = 0;
	let queueRequest = 0;
	const historyLoaded = ref(false);
	const pushStore = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	let disposed = false;
	let historyVersion = 0;
	let streamVersion = 0;
	let retryCount = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;
	const targetKey = () =>
		JSON.stringify([params.projectId.value, params.agentId.value, params.continueSessionId?.value]);
	/**
	 * Set when the backend rejects the stream because the agent itself is
	 * misconfigured (missing instructions / model / credential). Cleared on the
	 * next send so users can fix the config and retry without a manual dismiss.
	 */
	const fatalError = ref<FatalAgentError | null>(null);
	/**
	 * Non-fatal warnings emitted during a run (e.g. an MCP server that failed to
	 * connect, so its tools were skipped). The run continues; these are shown to
	 * the user as a warning callout. Visible warnings clear on the next send;
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
		const continueId = threadId.value;
		// Reject outdated session, request, and stream snapshots to preserve the current conversation.
		const target = targetKey();
		const version = ++historyVersion;
		const streamAtStart = streamVersion;
		const isCurrent = () => !disposed && target === targetKey() && version === historyVersion;
		try {
			let dbMessages: AgentPersistedMessageDto[];
			let openSuspensions: AgentBuilderOpenSuspension[] = [];
			if (continueId) {
				const envelope = await getChatMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
					continueId,
				);
				dbMessages = envelope.messages;
				openSuspensions = envelope.openSuspensions;
			} else {
				const envelope = await getTestChatMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
				);
				dbMessages = envelope.messages;
				openSuspensions = envelope.openSuspensions;
			}
			if (!isCurrent()) return false;
			retryCount = 0;
			clearTimeout(retryTimer);
			if (!hasLiveStream.value && detachedQueueIds.size === 0 && streamAtStart === streamVersion) {
				messages.value = applyOpenSuspensions(convertDbMessages(dbMessages), openSuspensions);
				applyPendingResponses();
			}
			return true;
		} catch (error) {
			if (!isCurrent()) return false;
			const status = (error as { httpStatusCode?: number } | null)?.httpStatusCode;
			if (status === 404) {
				if (
					clearOnNotFound &&
					!hasLiveStream.value &&
					detachedQueueIds.size === 0 &&
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
		const target = targetKey();
		const queueLoadSucceeded = await refreshQueue();
		if (disposed || target !== targetKey()) return;
		await refreshHistory({ clearOnNotFound: true });
		if (disposed || target !== targetKey()) return;
		historyLoaded.value = true;
		params.onHistoryLoaded?.(
			messages.value.length,
			queueItems.value.length > 0,
			queueLoadSucceeded,
		);
	}

	function applyPendingResponses(): void {
		for (const message of messages.value) {
			for (const interactive of getMessageInteractives(message)) {
				const pendingResponse =
					queueItems.value.some(
						(item) =>
							item.kind === 'hitl' &&
							item.runId === interactive.runId &&
							item.toolCallId === interactive.toolCallId,
					) ||
					[...requests.values()].some(
						({ response }) =>
							response?.runId === interactive.runId &&
							response?.toolCallId === interactive.toolCallId,
					);
				if (Boolean(interactive.pendingResponse) !== pendingResponse) {
					upsertMessageInteractive(message, { ...interactive, pendingResponse });
				}
			}
		}
	}

	function upsertQueueItem(item: AgentChatQueueItem): void {
		queueVersion++;
		const index = queueItems.value.findIndex(({ id }) => id === item.id);
		if (index >= 0) queueItems.value[index] = item;
		else queueItems.value.push(item);
		queueItems.value.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
		applyPendingResponses();
	}

	function removeQueueItem(id: string): void {
		queueVersion++;
		queueItems.value = queueItems.value.filter((item) => item.id !== id);
		detachedQueueIds.delete(id);
		applyPendingResponses();
	}

	async function refreshQueue(): Promise<boolean> {
		const currentThread = threadId.value;
		if (disposed || !currentThread) return false;
		const target = targetKey();
		const version = queueVersion;
		const request = ++queueRequest;
		try {
			const result = await getAgentChatQueue(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				currentThread,
			);
			if (disposed || target !== targetKey() || request !== queueRequest) return false;
			if (version !== queueVersion) {
				refreshHistoryFromPush();
				return false;
			}
			queueItems.value = result.items;
			for (const [requestId, session] of requests) {
				if (session.queueId && !result.items.some((item) => item.id === session.queueId)) {
					session.settled = true;
					finalizeStream(session);
					liveRequests.value.delete(requestId);
					requests.delete(requestId);
					streamVersion++;
				}
			}
			for (const id of detachedQueueIds) {
				if (!result.items.some((item) => item.id === id)) detachedQueueIds.delete(id);
			}
			applyPendingResponses();
			return true;
		} catch {
			// Keep the last queue until a later action or connection update can refresh it.
			return false;
		}
	}

	const refreshHistoryFromPush = useAgentExecutionUpdates(
		{ projectId: params.projectId, agentId: params.agentId, threadId },
		async () => {
			await refreshQueue();
			if (hasLiveStream.value || detachedQueueIds.size > 0) {
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

	function refresh() {
		retryCount = 0;
		clearTimeout(retryTimer);
		refreshHistoryFromPush();
	}

	function detachRequests(): void {
		for (const session of requests.values()) {
			settleOpenReasoning(session);
			if (session.started && !session.settled && session.queueId)
				detachedQueueIds.add(session.queueId);
		}
		requests.clear();
		liveRequests.value.clear();
		streamVersion++;
	}

	watch(
		() => pushStore.isConnected,
		(connected) => {
			if (connected) refresh();
			else detachRequests();
		},
	);
	watch(visibility, (value) => {
		if (value === 'visible') refresh();
	});
	watch(targetKey, () => {
		detachRequests();
		detachedQueueIds.clear();
		admittedSessionId.value = undefined;
		queueItems.value = [];
		messages.value = [];
		historyLoaded.value = false;
		historyVersion++;
		refresh();
	});
	onScopeDispose(() => {
		disposed = true;
		detachRequests();
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
	// Shared chat event handlers
	// -------------------------------------------------------------------------

	interface StreamSession {
		target: string;
		response?: Pick<ResumePayload, 'runId' | 'toolCallId'>;
		queueId?: string;
		executionId?: string;
		started: boolean;
		settled: boolean;
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
		const pendingResponse = queueItems.value.find((item) => item.kind === 'hitl');
		if (pendingResponse)
			return { runId: pendingResponse.runId, toolCallId: pendingResponse.toolCallId };
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
		if (msg.status !== CHAT_MESSAGE_STATUS.AWAITING_USER) return;
		const hasOpenInteractive = getMessageInteractives(msg).some(
			(payload) => payload.resolvedAt === undefined,
		);
		if (!hasOpenInteractive) msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
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
				msg.role === 'assistant' &&
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

	function handleEvent(event: AgentSseEvent, session: StreamSession): void {
		switch (event.type) {
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
				settleOpenReasoning(session);
				dropOrphanMintedBubbles(session);
				markInFlightStateFailed(session);
				if (event.errorCode === 'agent_misconfigured') {
					fatalError.value = { message: event.message, missing: event.missing ?? [] };
				} else {
					const message = reactive<ChatMessage>({
						id: crypto.randomUUID(),
						role: 'assistant',
						content: event.message,
						toolCalls: [],
						status: CHAT_MESSAGE_STATUS.ERROR,
						executionId: session.executionId,
					});
					messages.value.push(message);
					session.minted.add(message);
				}
				break;
			}
			case 'done':
				settleOpenReasoning(session);
				if (event.executionId) {
					for (const msg of session.minted) {
						msg.executionId = event.executionId;
					}
				}
				return;
			default:
				break;
		}
		return undefined;
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

	const removeChatListener = pushStore.addEventListener((push) => {
		if (push.type !== 'agentChatEvent' || disposed) return;
		const data = push.data;
		const session = requests.get(data.clientRequestId);
		if (
			!session ||
			session.target !== targetKey() ||
			data.projectId !== params.projectId.value ||
			data.agentId !== params.agentId.value ||
			(threadId.value && data.threadId !== threadId.value)
		)
			return;
		admittedSessionId.value = data.threadId;
		session.queueId = data.queueId;
		const event = data.event;
		if (event.type === 'processing') {
			if (session.started) return;
			session.started = true;
			liveRequests.value.add(data.clientRequestId);
			streamVersion++;
			upsertQueueItem(event.item);
			if (event.item.kind === 'message') {
				const message = reactive<ChatMessage>({
					id: crypto.randomUUID(),
					role: 'user',
					content: event.item.message,
					status: CHAT_MESSAGE_STATUS.SUCCESS,
					attachments: event.item.attachments.map(({ id, ...attachment }) => ({
						...attachment,
						fileId: id,
					})),
				});
				messages.value.push(message);
				session.minted.add(message);
			}
			return;
		}
		if (event.type === 'execution-started') {
			session.executionId = event.executionId;
			for (const message of session.minted) message.executionId = event.executionId;
			return;
		}
		if (
			!session.started &&
			event.type !== 'done' &&
			event.type !== 'removed' &&
			event.type !== 'cancelled'
		)
			return;
		if (event.type === 'cancelled') {
			const affected = new Set(session.minted);
			const response = session.response && findToolCallById(session.response.toolCallId);
			if (response) affected.add(response.msg);
			for (const message of affected) {
				for (const toolCall of message.toolCalls ?? []) {
					if (isToolCallInFlight(toolCall)) {
						toolCall.state = TOOL_CALL_STATE.CANCELLED;
						toolCall.canceled = true;
						const interactive = getMessageInteractive(message, toolCall.toolCallId);
						if (interactive && interactive.resolvedAt === undefined) {
							upsertMessageInteractive(message, {
								...interactive,
								cancelled: true,
								resolvedAt: Date.now(),
							});
						}
					}
				}
				markMessageSuccessIfSettled(message);
			}
		} else if (event.type !== 'removed') handleEvent(event, session);
		if (event.type === 'done' || event.type === 'removed' || event.type === 'cancelled') {
			session.settled = true;
			finalizeStream(session);
			liveRequests.value.delete(data.clientRequestId);
			requests.delete(data.clientRequestId);
			removeQueueItem(data.queueId);
			streamVersion++;
			refresh();
		}
	});
	onScopeDispose(removeChatListener);

	async function admit(
		post: (clientRequestId: string) => Promise<AgentChatAdmissionResponse>,
		pendingResponse?: Pick<ResumePayload, 'runId' | 'toolCallId'>,
	): Promise<boolean> {
		const clientRequestId = crypto.randomUUID();
		const session: StreamSession = {
			target: targetKey(),
			response: pendingResponse,
			started: false,
			settled: false,
			minted: new Set(),
			reasoningStartedAt: new Map(),
			openReasoning: new Map(),
		};
		requests.set(clientRequestId, session);
		try {
			const response = await post(clientRequestId);
			if (disposed || session.target !== targetKey()) return response.status === 'queued';
			if (response.status === 'agent_misconfigured') {
				requests.delete(clientRequestId);
				fatalError.value = {
					message: locale.baseText('agents.chat.send.error'),
					missing: response.missing,
				};
				return false;
			}
			admittedSessionId.value = response.sessionId;
			session.queueId = response.item.id;
			// Push events can finish the request before its admission response arrives.
			if (!session.started && !session.settled) upsertQueueItem(response.item);
			refresh();
			return true;
		} catch (error) {
			if (session.queueId) return true;
			requests.delete(clientRequestId);
			if (!disposed && session.target === targetKey()) {
				showError(error, locale.baseText('agents.chat.send.error'));
				refresh();
			}
			return false;
		}
	}

	async function sendMessage(text: string, files?: File[]): Promise<boolean> {
		const message = text.trim();
		if ((!message && !files?.length) || disposed) return false;
		const target = targetKey();
		fatalError.value = null;
		warnings.value = [];
		try {
			const attachments = files?.length
				? await Promise.all(
						files.map(async (file) => ({
							fileName: file.name,
							mimeType: file.type || 'application/octet-stream',
							data: (await convertFileToBinaryData(file)).data,
						})),
					)
				: undefined;
			if (disposed || target !== targetKey()) return false;
			return await admit(
				async (clientRequestId) =>
					await sendAgentChatMessage(
						rootStore.restApiContext,
						params.projectId.value,
						params.agentId.value,
						{ clientRequestId, message, sessionId: threadId.value, attachments },
					),
			);
		} catch (error) {
			showError(error, locale.baseText('agents.chat.send.error'));
			return false;
		}
	}

	async function resume(payload: ResumePayload): Promise<void> {
		const found = findToolCallById(payload.toolCallId);
		const interactive = found && getMessageInteractive(found.msg, payload.toolCallId);
		if (interactive?.pendingResponse || interactive?.resolvedAt || isCancelling.value) return;
		if (found && interactive)
			upsertMessageInteractive(found.msg, { ...interactive, pendingResponse: true });
		const target = targetKey();
		const version = streamVersion;
		const accepted = await admit(
			async (clientRequestId) =>
				await resumeAgentChat(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
					{ ...payload, clientRequestId },
				),
			payload,
		);
		if (disposed || target !== targetKey()) return;
		if (!accepted) {
			if (found && interactive) upsertMessageInteractive(found.msg, interactive);
			await refreshQueue();
			await refreshHistory();
			return;
		}
		if (version === streamVersion && found && found.tc.state === TOOL_CALL_STATE.SUSPENDED) {
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
			markMessageSuccessIfSettled(found.msg);
		}
	}

	async function editQueuedMessage(queueId: string, message: string): Promise<void> {
		if (!threadId.value) return;
		const target = targetKey();
		const version = queueVersion;
		try {
			const item = await editAgentChatQueueMessage(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				threadId.value,
				queueId,
				message,
			);
			if (!disposed && target === targetKey() && version === queueVersion) upsertQueueItem(item);
		} finally {
			refresh();
		}
	}

	async function removeQueuedMessage(queueId: string): Promise<void> {
		if (!threadId.value) return;
		const target = targetKey();
		try {
			await removeAgentChatQueueMessage(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				threadId.value,
				queueId,
			);
			if (!disposed && target === targetKey()) removeQueueItem(queueId);
		} finally {
			refresh();
		}
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

	async function stopGenerating(): Promise<void> {
		if (isCancelling.value) return;
		const active = activeEntry.value;
		const suspension = findOpenSuspension();
		const currentThread = threadId.value;
		if (!active && !suspension) return;
		stopping.value = true;
		try {
			if (active && currentThread) {
				await stopAgentChatQueueEntry(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
					currentThread,
					active.id,
				);
			} else if (suspension) {
				const { cancelled } = await cancelAgentChatRun(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
					suspension.runId,
				);
				if (cancelled) markRunCancelled(suspension.runId);
			}
		} catch (error) {
			if (!isRecord(error) || error.httpStatusCode !== 404)
				showError(error, locale.baseText('agents.chat.stop.error'));
		} finally {
			await refreshQueue();
			stopping.value = false;
			refresh();
		}
	}

	return {
		messages,
		hasPendingResponse,
		isStreaming,
		isCancelling,
		messagingState,
		fatalError,
		warnings,
		loadHistory,
		refresh,
		clearHistory,
		sendMessage,
		stopGenerating,
		resume,
		queuedMessages,
		editQueuedMessage,
		removeQueuedMessage,
		dismissFatalError,
		dismissWarning,
	};
}
