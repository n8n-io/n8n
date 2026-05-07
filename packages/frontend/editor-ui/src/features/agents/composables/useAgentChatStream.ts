import { ref, reactive, computed, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	AgentBuilderOpenSuspension,
	AgentPersistedMessageDto,
	AgentSseEvent,
} from '@n8n/api-types';
import { useToast } from '@/app/composables/useToast';
import {
	getBuilderMessages,
	clearBuilderMessages,
	getChatMessages,
	getTestChatMessages,
	clearTestChatMessages,
} from './useAgentApi';

import {
	applyOpenSuspensions,
	convertDbMessages,
	rebuildInteractiveFromHistory,
	type ChatMessage,
	type ToolCall,
} from './agentChatMessages';
import { CHAT_MESSAGE_STATUS, TOOL_CALL_STATE } from '../constants';
import { summariseInteractiveOutput } from '../utils/interactive-summary';

export interface FatalAgentError {
	message: string;
	missing: string[];
}

export interface UseAgentChatStreamParams {
	projectId: Ref<string>;
	agentId: Ref<string>;
	endpoint: Ref<'build' | 'chat'>;
	/**
	 * When provided, chat mode runs in session-continuation: history is fetched
	 * per-thread and the id is propagated to the backend so further messages
	 * extend the same session.
	 */
	continueSessionId?: Ref<string | undefined>;
	onCodeUpdated?: () => void;
	onCodeDelta?: (delta: string) => void;
	onConfigUpdated?: () => void;
	onHistoryLoaded?: (count: number) => void;
}

export function useAgentChatStream(params: UseAgentChatStreamParams) {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showError } = useToast();

	const messages = ref<ChatMessage[]>([]);
	const isStreaming = ref(false);
	const abortController = ref<AbortController | null>(null);
	const historyLoaded = ref(false);
	/**
	 * Set when the backend rejects the stream because the agent itself is
	 * misconfigured (missing instructions / model / credential). Cleared on the
	 * next send so users can fix the config and retry without a manual dismiss.
	 */
	const fatalError = ref<FatalAgentError | null>(null);

	const messagingState = computed<'idle' | 'waitingFirstChunk' | 'receiving'>(() => {
		if (!isStreaming.value) return 'idle';
		const lastMsg = messages.value[messages.value.length - 1];
		if (!lastMsg || lastMsg.role === 'user') return 'waitingFirstChunk';
		return 'receiving';
	});

	async function loadHistory(): Promise<void> {
		if (historyLoaded.value) return;
		const continueId = params.continueSessionId?.value;
		try {
			let dbMessages: AgentPersistedMessageDto[];
			let openSuspensions: AgentBuilderOpenSuspension[] = [];
			if (params.endpoint.value === 'build') {
				const envelope = await getBuilderMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
				);
				dbMessages = envelope.messages;
				openSuspensions = envelope.openSuspensions;
			} else if (continueId) {
				dbMessages = await getChatMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
					continueId,
				);
			} else {
				dbMessages = await getTestChatMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
				);
			}
			if (dbMessages.length > 0) {
				messages.value = applyOpenSuspensions(convertDbMessages(dbMessages), openSuspensions);
			}
			params.onHistoryLoaded?.(messages.value.length);
		} catch (error) {
			// Treat 404 as "no thread yet" rather than surfacing an error —
			// covers stale continue URLs and any lingering race where the
			// thread hasn't been persisted on the backend.
			const status = (error as { httpStatusCode?: number } | null)?.httpStatusCode;
			if (status === 404) {
				params.onHistoryLoaded?.(0);
			} else {
				showError(error, locale.baseText('agents.chat.loadHistory.error'));
			}
		} finally {
			historyLoaded.value = true;
		}
	}

	async function clearHistory(): Promise<void> {
		const clearRemote =
			params.endpoint.value === 'build' ? clearBuilderMessages : clearTestChatMessages;
		try {
			await clearRemote(rootStore.restApiContext, params.projectId.value, params.agentId.value);
			messages.value = [];
		} catch (error) {
			showError(error, locale.baseText('agents.chat.clearHistory.error'));
		}
	}

	// -------------------------------------------------------------------------
	// SSE handler — typed AgentSseEvent dispatch
	// -------------------------------------------------------------------------

	interface StreamSession {
		builderMutated: boolean;
		/**
		 * Set when the stream emitted an `error` event. Callers (notably
		 * `resume`) inspect this so they can roll back optimistic UI state
		 * that was applied before the round-trip.
		 */
		errorEmitted: boolean;
		/**
		 * Cursor pointing at the ChatMessage currently being filled by
		 * text/reasoning/tool-input events. `start-step` / `finish-step`
		 * boundaries clear it; the next text/tool event lazily mints a fresh
		 * ChatMessage.
		 */
		current?: ChatMessage;
		/** Tracks any messages we minted so we can flip `streaming → success` on done. */
		minted: Set<ChatMessage>;
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
			thinking: '',
			toolCalls: [],
			status: CHAT_MESSAGE_STATUS.STREAMING,
		});
		messages.value.push(msg);
		session.current = msg;
		session.minted.add(msg);
		return msg;
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
			case 'reasoning-start':
			case 'reasoning-end':
				break;
			case 'text-delta': {
				const msg = ensureCurrent(session);
				msg.content += event.delta;
				break;
			}
			case 'reasoning-delta': {
				const msg = ensureCurrent(session);
				msg.thinking = (msg.thinking ?? '') + event.delta;
				break;
			}
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
				// Streaming tool input — `code-delta` handles the build-tool case.
				// No ToolCall state mutation here.
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
					});
				} else {
					existing.input = event.input;
					if (
						existing.state !== TOOL_CALL_STATE.RUNNING &&
						existing.state !== TOOL_CALL_STATE.DONE
					) {
						existing.state = TOOL_CALL_STATE.PENDING;
					}
				}
				break;
			}
			case 'tool-execution-start': {
				const found = findToolCallById(event.toolCallId);
				if (
					found &&
					found.tc.state !== TOOL_CALL_STATE.DONE &&
					found.tc.state !== TOOL_CALL_STATE.ERROR
				) {
					found.tc.state = TOOL_CALL_STATE.RUNNING;
				}
				break;
			}
			case 'tool-result': {
				const found = findToolCallById(event.toolCallId);
				if (found) {
					found.tc.output = event.output;
					found.tc.state = event.isError ? TOOL_CALL_STATE.ERROR : TOOL_CALL_STATE.DONE;
					found.tc.displaySummary = summariseInteractiveOutput(
						found.tc.tool,
						event.output,
						found.tc.input,
					);
					// If this was an interactive tool call, the result IS the user's
					// resume payload — refresh the card so it flips to its resolved
					// (disabled) state immediately. No separate "resumed" event needed.
					if (found.msg.interactive) {
						const updated = rebuildInteractiveFromHistory(found.tc);
						if (updated) found.msg.interactive = updated;
					}
					if (found.msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER)
						found.msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
				}
				break;
			}
			case 'tool-call-suspended': {
				const { payload } = event;
				const found = findToolCallById(payload.toolCallId);
				let msg: ChatMessage;
				let tc: ToolCall;
				if (found) {
					msg = found.msg;
					tc = found.tc;
					tc.state = TOOL_CALL_STATE.SUSPENDED;
					tc.input = payload.input;
				} else {
					msg = ensureCurrent(session);
					tc = {
						tool: payload.toolName,
						toolCallId: payload.toolCallId,
						input: payload.input,
						state: TOOL_CALL_STATE.SUSPENDED,
					};
					msg.toolCalls = [...(msg.toolCalls ?? []), tc];
				}
				const interactive = rebuildInteractiveFromHistory({
					...tc,
					output: undefined,
				});
				if (interactive) {
					interactive.runId = payload.runId;
					msg.interactive = interactive;
					msg.status = CHAT_MESSAGE_STATUS.AWAITING_USER;
				}
				break;
			}
			case 'message':
				// Custom (sub-agent / app-defined) message envelope. Reserved
				// for future use; nothing renders today.
				break;
			case 'working-memory-update': {
				const msg = ensureCurrent(session);
				msg.toolCalls = msg.toolCalls ?? [];
				msg.toolCalls.push({
					tool: event.toolName,
					toolCallId: crypto.randomUUID(),
					state: TOOL_CALL_STATE.DONE,
				});
				break;
			}
			case 'code-delta': {
				params.onCodeDelta?.(event.delta);
				break;
			}
			case 'config-updated':
			case 'tool-updated': {
				session.builderMutated = true;
				params.onConfigUpdated?.();
				break;
			}
			case 'error': {
				session.errorEmitted = true;
				if (event.errorCode === 'agent_misconfigured') {
					// Misconfiguration is a distinct class of error: the agent
					// can't run until its config is fixed. Surface it via the
					// banner (`fatalError`) rather than an inline error bubble
					// so the user sees what's missing and can act on it.
					// Drop any orphan empty assistant bubble we minted before
					// the error arrived so the banner is the only surface.
					fatalError.value = {
						message: event.message,
						missing: event.missing ?? [],
					};
					for (const msg of session.minted) {
						if (!msg.content && (msg.toolCalls?.length ?? 0) === 0) {
							messages.value = messages.value.filter((m) => m !== msg);
							session.minted.delete(msg);
						}
					}
					break;
				}
				const lastMsg = messages.value[messages.value.length - 1];
				if (lastMsg) {
					lastMsg.content += `\n\nError: ${event.message}`;
					lastMsg.status = 'error';
				}
				break;
			}
			case 'done':
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
					if (result?.done) break readerLoop;
				}
			}
		} finally {
			reader.releaseLock();
		}
	}

	// -------------------------------------------------------------------------
	// Run a request against a build/chat/resume endpoint
	// -------------------------------------------------------------------------

	function finalizeStream(session: StreamSession): void {
		for (const msg of session.minted) {
			if (msg.status === CHAT_MESSAGE_STATUS.STREAMING) msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
		}
		if (params.endpoint.value === 'build' && session.builderMutated) {
			params.onConfigUpdated?.();
		}
	}

	async function postAndConsume(
		url: string,
		body: Record<string, unknown>,
	): Promise<{ ok: boolean }> {
		const session: StreamSession = {
			builderMutated: false,
			errorEmitted: false,
			minted: new Set(),
		};

		isStreaming.value = true;
		const controller = new AbortController();
		abortController.value = controller;
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
				return { ok: false };
			}

			await consumeStream(response, session);
			finalizeStream(session);
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				finalizeStream(session);
				// User-initiated abort — surface as a failure so optimistic
				// callers (resume) restore their pre-flight state instead of
				// leaving the UI half-committed.
				return { ok: false };
			}
			transportFailed = true;
			const text = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
			messages.value.push({
				id: crypto.randomUUID(),
				role: 'assistant',
				content: text,
				status: 'error',
			});
		} finally {
			abortController.value = null;
			isStreaming.value = false;
		}

		return { ok: !transportFailed && !session.errorEmitted };
	}

	async function streamFromEndpoint(endpoint: 'build' | 'chat', message: string): Promise<void> {
		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/${endpoint}`;
		const body: Record<string, unknown> = { message };
		if (endpoint === 'chat' && params.continueSessionId?.value) {
			body.sessionId = params.continueSessionId.value;
		}
		await postAndConsume(url, body);
	}

	/**
	 * Resume a suspended build interaction. Posts to the build/resume endpoint
	 * and re-enters the same SSE handler. The `runId` is required — it comes
	 * from the original `tool-call-suspended` chunk (live) or from the
	 * `openSuspensions` sidecar applied during history reload.
	 */
	async function resume(payload: {
		runId: string;
		toolCallId: string;
		resumeData: unknown;
	}): Promise<void> {
		// Optimistic update — the backend emits a matching `tool-result` on the
		// resume stream, but that arrives only after round-trip. Flipping state
		// here stops the spinner/clock indicator and disables the card so the
		// user sees immediate feedback on submit.
		//
		// Snapshot the pre-flight state so we can roll back if the resume POST
		// or the SSE stream fails. Otherwise a transport/expired-checkpoint
		// error would leave the card permanently disabled and the user with
		// no way to retry.
		const found = findToolCallById(payload.toolCallId);
		const snapshot = found
			? {
					tc: found.tc,
					prevState: found.tc.state,
					prevOutput: found.tc.output,
					prevSummary: found.tc.displaySummary,
					msg: found.msg,
					prevStatus: found.msg.status,
					prevInteractive: found.msg.interactive,
				}
			: null;

		if (found) {
			found.tc.state = TOOL_CALL_STATE.DONE;
			found.tc.output = payload.resumeData;
			found.tc.displaySummary = summariseInteractiveOutput(
				found.tc.tool,
				payload.resumeData,
				found.tc.input,
			);
			const updated = rebuildInteractiveFromHistory(found.tc);
			if (updated) found.msg.interactive = updated;
			if (found.msg.status === CHAT_MESSAGE_STATUS.AWAITING_USER)
				found.msg.status = CHAT_MESSAGE_STATUS.SUCCESS;
		}

		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/build/resume`;
		const { ok } = await postAndConsume(url, payload);
		if (!ok && snapshot) {
			snapshot.tc.state = snapshot.prevState;
			snapshot.tc.output = snapshot.prevOutput;
			snapshot.tc.displaySummary = snapshot.prevSummary;
			snapshot.msg.status = snapshot.prevStatus;
			snapshot.msg.interactive = snapshot.prevInteractive;
		}
	}

	async function sendMessage(text: string): Promise<void> {
		const trimmed = text.trim();
		if (!trimmed || isStreaming.value) return;
		// Any new send invalidates a prior misconfig banner — the user is retrying.
		fatalError.value = null;
		messages.value.push({
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmed,
			status: 'success',
		});
		await streamFromEndpoint(params.endpoint.value, trimmed);
	}

	function dismissFatalError(): void {
		fatalError.value = null;
	}

	function stopGenerating(): void {
		abortController.value?.abort();
	}

	return {
		messages,
		isStreaming,
		messagingState,
		fatalError,
		loadHistory,
		clearHistory,
		sendMessage,
		stopGenerating,
		resume,
		dismissFatalError,
	};
}
