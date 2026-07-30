import { ref, reactive, computed, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	AgentBuilderOpenSuspension,
	AgentPersistedMessageDto,
	AgentSseEvent,
	CancellationResumeData,
} from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import {
	cancelAgentChatRun,
	clearTestChatMessages,
	getChatMessages,
	getTestChatMessages,
} from './useAgentApi';

import {
	applyOpenSuspensions,
	convertDbMessages,
	findOpenInteractive,
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

export interface FatalAgentError {
	message: string;
	missing: string[];
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
	onHistoryLoaded?: (count: number) => void;
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

export function useAgentChatStream(params: UseAgentChatStreamParams) {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showError } = useToast();

	const messages = ref<ChatMessage[]>([]);
	const isStreaming = ref(false);
	const isCancelling = ref(false);
	const abortController = ref<AbortController | null>(null);
	const streamSettlements = new WeakMap<AbortController, Promise<void>>();
	const preserveTerminalStateOnAbort = new WeakSet<AbortController>();
	const historyLoaded = ref(false);
	/**
	 * Set when the backend rejects the stream because the agent itself is
	 * misconfigured (missing instructions / model / credential). Cleared on the
	 * next send so users can fix the config and retry without a manual dismiss.
	 */
	const fatalError = ref<FatalAgentError | null>(null);
	/**
	 * Non-fatal warnings emitted during a run (e.g. an MCP server that failed to
	 * connect, so its tools were skipped). The run continues; these are shown to
	 * the user as a warning callout. Cleared on the next send.
	 */
	const warnings = ref<Array<{ message: string; server?: string; code?: string }>>([]);

	const messagingState = computed<'idle' | 'waitingFirstChunk' | 'receiving'>(() => {
		if (!isStreaming.value) return 'idle';
		const lastMsg = messages.value[messages.value.length - 1];
		if (!lastMsg || lastMsg.role === 'user') return 'waitingFirstChunk';
		return 'receiving';
	});

	async function refreshHistory({
		clearOnNotFound = false,
	}: { clearOnNotFound?: boolean } = {}): Promise<boolean> {
		const continueId = params.continueSessionId?.value;
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
			messages.value = applyOpenSuspensions(convertDbMessages(dbMessages), openSuspensions);
			return true;
		} catch (error) {
			const status = (error as { httpStatusCode?: number } | null)?.httpStatusCode;
			if (status === 404) {
				if (clearOnNotFound) messages.value = [];
				return clearOnNotFound;
			} else {
				showError(error, locale.baseText('agents.chat.loadHistory.error'));
			}
			return false;
		}
	}

	async function loadHistory(): Promise<void> {
		if (historyLoaded.value) return;
		await refreshHistory({ clearOnNotFound: true });
		historyLoaded.value = true;
		params.onHistoryLoaded?.(messages.value.length);
	}

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
		const interactive = findOpenInteractive(messages.value);
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

	function markStreamInterrupted(session: StreamSession): void {
		settleOpenReasoning(session);
		dropOrphanMintedBubbles(session);
		markInFlightStateFailed(session);
		messages.value.push(
			reactive<ChatMessage>({
				id: crypto.randomUUID(),
				role: 'assistant',
				content: locale.baseText('agents.chat.streamInterrupted'),
				toolCalls: [],
				status: CHAT_MESSAGE_STATUS.ERROR,
			}),
		);
	}

	function handleEvent(
		event: AgentSseEvent,
		session: StreamSession,
	): { done?: boolean } | undefined {
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
					// If this was an interactive tool call, the result IS the user's
					// resume payload — refresh the matching card so it flips to its
					// resolved (disabled) state immediately. Display-only n8n chat
					// cards never suspend, so they are also born here when the tool
					// settles.
					const updated = rebuildInteractiveFromHistory(found.tc);
					if (updated) upsertMessageInteractive(found.msg, updated);
					markMessageSuccessIfSettled(found.msg);
				}
				break;
			}
			case 'tool-call-suspended': {
				const { payload } = event;
				const found = findToolCallById(payload.toolCallId);
				// The approval tool suspends with its renderable input; integration
				// actions suspend with a sidecar — keep the card-bearing tool input
				// and store the sidecar separately.
				const suspendIsRenderableInput = isApprovalSuspendInput(payload.input);
				let msg: ChatMessage;
				let tc: ToolCall;
				if (found) {
					msg = found.msg;
					tc = found.tc;
					tc.state = TOOL_CALL_STATE.SUSPENDED;
					tc.runId = payload.runId;
					if (suspendIsRenderableInput) {
						tc.input = payload.input;
					} else {
						tc.suspendPayload = payload.input;
					}
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
			case 'message':
				// Custom (sub-agent / app-defined) message envelope. Reserved
				// for future use; nothing renders today.
				break;
			case 'warning': {
				// Non-fatal run warning (e.g. an MCP server was unavailable, so its
				// tools were skipped). The run continues; surfaced as a callout.
				warnings.value.push({
					message: event.message,
					...(event.server !== undefined && { server: event.server }),
					...(event.code !== undefined && { code: event.code }),
				});
				break;
			}
			case 'error': {
				session.errorEmitted = true;
				settleOpenReasoning(session);
				dropOrphanMintedBubbles(session);
				markInFlightStateFailed(session);
				if (event.errorCode === 'agent_misconfigured') {
					fatalError.value = { message: event.message, missing: event.missing ?? [] };
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

	async function consumeStream(response: Response, session: StreamSession): Promise<void> {
		if (!response.body) return;
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			readerLoop: while (true) {
				const { done, value } = await reader.read();
				if (done) break;
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
		}
	}

	async function postAndConsume(
		url: string,
		body: Record<string, unknown>,
	): Promise<{ outcome: 'completed' | 'failed' | 'aborted' }> {
		const session: StreamSession = {
			errorEmitted: false,
			terminalEventReceived: false,
			minted: new Set(),
			reasoningStartedAt: new Map(),
			openReasoning: new Map(),
		};

		isStreaming.value = true;
		const controller = new AbortController();
		abortController.value = controller;
		let settleStream: (() => void) | undefined;
		const streamSettlement = new Promise<void>((resolve) => {
			settleStream = resolve;
		});
		streamSettlements.set(controller, streamSettlement);
		let transportFailed = false;

		try {
			const browserId = localStorage.getItem('n8n-browserId') ?? '';
			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'browser-id': browserId },
				credentials: 'include',
				body: JSON.stringify(body),
				signal: controller.signal,
			});

			if (!response.ok || !response.body) {
				transportFailed = true;
				const errorMsg: ChatMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: `Error: ${response.statusText || 'Failed to reach agent'}`,
					status: 'error',
				};
				messages.value.push(errorMsg);
				return { outcome: 'failed' };
			}

			await consumeStream(response, session);
			if (!session.terminalEventReceived) {
				transportFailed = true;
				markStreamInterrupted(session);
				return { outcome: 'failed' };
			}
			finalizeStream(session);
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				dropOrphanMintedBubbles(session);
				if (preserveTerminalStateOnAbort.has(controller) && session.terminalEventReceived) {
					finalizeStream(session);
				} else {
					markInFlightStateFailed(session);
				}
				return { outcome: 'aborted' };
			}
			if (session.terminalEventReceived) {
				finalizeStream(session);
			} else {
				transportFailed = true;
				markStreamInterrupted(session);
			}
		} finally {
			if (abortController.value === controller) {
				abortController.value = null;
				isStreaming.value = false;
			}
			preserveTerminalStateOnAbort.delete(controller);
			streamSettlements.delete(controller);
			settleStream?.();
		}

		return {
			outcome: !transportFailed && !session.errorEmitted ? 'completed' : 'failed',
		};
	}

	async function streamChat(message: string): Promise<void> {
		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/chat`;
		const body: Record<string, unknown> = { message };
		if (params.continueSessionId?.value) {
			body.sessionId = params.continueSessionId.value;
		}
		await postAndConsume(url, body);
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
	async function resume(payload: ResumePayload): Promise<void> {
		if (isCancelling.value) return;

		const isCancellation = 'cancelled' in payload;
		const text = isCancellation ? payload.text.trim() : '';
		if (isCancellation && !text) return;

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
			});
		}

		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/chat/resume`;
		const { outcome } = await postAndConsume(url, {
			runId: payload.runId,
			toolCallId: payload.toolCallId,
			resumeData,
		});
		let reconciled = false;
		if (outcome === 'failed') {
			reconciled = await refreshHistory();
		}
		if (outcome === 'failed' && !reconciled && snapshot) {
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
		if (outcome === 'failed' && !reconciled && optimisticUserMessageId) {
			messages.value = messages.value.filter((m) => m.id !== optimisticUserMessageId);
		}
	}

	async function cancelAndSteer(text: string): Promise<void> {
		const openInteractive = findOpenInteractive(messages.value);
		if (!openInteractive?.runId) return;

		await resume({
			runId: openInteractive.runId,
			toolCallId: openInteractive.toolCallId,
			cancelled: true,
			text,
		});
	}

	async function sendMessage(text: string): Promise<void> {
		const trimmed = text.trim();
		if (!trimmed || isStreaming.value || isCancelling.value) return;
		// Any new send invalidates a prior misconfig banner — the user is retrying.
		fatalError.value = null;
		warnings.value = [];
		messages.value.push({
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmed,
			status: 'success',
		});
		await streamChat(trimmed);
	}

	function dismissFatalError(): void {
		fatalError.value = null;
	}

	function dismissWarning(index: number): void {
		warnings.value = warnings.value.filter((_, i) => i !== index);
	}

	async function stopGenerating(): Promise<void> {
		if (isCancelling.value) return;

		const openSuspension = findOpenSuspension();
		const activeController = abortController.value;
		const activeStreamSettlement = activeController
			? streamSettlements.get(activeController)
			: undefined;
		if (!openSuspension) {
			activeController?.abort();
			await activeStreamSettlement;
			return;
		}

		isCancelling.value = true;
		let preserveTerminalState = false;
		try {
			const { cancelled } = await cancelAgentChatRun(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
				openSuspension.runId,
			);
			if (cancelled) {
				markRunCancelled(openSuspension.runId);
				preserveTerminalState = true;
				return;
			}

			const reconciled = await refreshHistory();
			preserveTerminalState = !reconciled;
		} catch (error) {
			const reconciled = await refreshHistory();
			preserveTerminalState = !reconciled;
			showError(error, locale.baseText('agents.chat.stop.error'));
		} finally {
			if (activeController && preserveTerminalState) {
				preserveTerminalStateOnAbort.add(activeController);
			}
			activeController?.abort();
			await activeStreamSettlement;
			isCancelling.value = false;
		}
	}

	return {
		messages,
		isStreaming,
		isCancelling,
		messagingState,
		fatalError,
		warnings,
		loadHistory,
		clearHistory,
		sendMessage,
		stopGenerating,
		resume,
		cancelAndSteer,
		dismissFatalError,
		dismissWarning,
	};
}
