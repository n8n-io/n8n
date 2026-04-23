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
		/** Per-turn ChatMessage cache keyed by server-issued messageId. */
		msgsByMessageId: Map<string, ChatMessage>;
	}

	function ensureMsgFor(session: StreamSession, messageId: string): ChatMessage {
		const existing = session.msgsByMessageId.get(messageId);
		if (existing) return existing;
		const msg = reactive<ChatMessage>({
			id: messageId,
			role: 'assistant',
			content: '',
			thinking: '',
			toolCalls: [],
			status: 'streaming',
		});
		messages.value.push(msg);
		session.msgsByMessageId.set(messageId, msg);
		return msg;
	}

	function findToolCall(messageId: string, toolCallId: string, session: StreamSession) {
		// First check the message bucket the event claims to belong to.
		const msg = session.msgsByMessageId.get(messageId);
		const inOwn = msg?.toolCalls?.find((t) => t.toolCallId === toolCallId);
		if (inOwn) return { msg: msg!, tc: inOwn };
		// Tool results often arrive against the assistant turn that issued the
		// call — but we tag both events with the same messageId server-side, so
		// this fallback only catches resilience cases (e.g. a tool result whose
		// messageId was lost). Walk recent assistant messages.
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
			case 'text': {
				const msg = ensureMsgFor(session, event.messageId);
				msg.content += event.delta;
				break;
			}
			case 'reasoning': {
				const msg = ensureMsgFor(session, event.messageId);
				msg.thinking = (msg.thinking ?? '') + event.delta;
				break;
			}
			case 'toolCall': {
				const msg = ensureMsgFor(session, event.messageId);
				if (msg.content && !msg.content.endsWith('\n')) msg.content += '\n';
				msg.toolCalls = msg.toolCalls ?? [];
				const existing = msg.toolCalls.find((t) => t.toolCallId === event.toolCallId);
				if (!existing) {
					msg.toolCalls.push({
						tool: event.toolName,
						toolCallId: event.toolCallId,
						input: event.input,
						// Start as 'pending'; the runtime emits `toolExecutionStart`
						// when it actually invokes the handler.
						state: 'pending',
					});
				} else {
					existing.input = event.input;
					// Don't downgrade a call that is already running/done/etc.
					if (existing.state !== 'running' && existing.state !== 'done') {
						existing.state = 'pending';
					}
				}
				break;
			}
			case 'toolCallDelta': {
				// Streaming tool input — used for `build_custom_tool` codeDelta.
				// No state change to a ToolCall here (it may not exist yet).
				break;
			}
			case 'toolExecutionStart': {
				// Handler started running for this tool call. Flip the indicator
				// from "pending" → "running" so the FE shows mid-flight progress.
				const found = findToolCall(event.messageId, event.toolCallId, session);
				if (found && found.tc.state !== 'done' && found.tc.state !== 'error') {
					found.tc.state = 'running';
				}
				break;
			}
			case 'toolResult': {
				const found = findToolCall(event.messageId, event.toolCallId, session);
				if (found) {
					found.tc.output = event.output;
					found.tc.state = event.isError ? 'error' : 'done';
					// If this was an interactive tool call, the result IS the user's
					// resume payload — refresh the card so it flips to its resolved
					// (disabled) state immediately. No separate "resumed" event needed.
					if (found.msg.interactive) {
						const updated = rebuildInteractiveFromHistory(found.tc);
						if (updated) found.msg.interactive = updated;
					}
					if (found.msg.status === 'awaitingUser') found.msg.status = 'success';
				}
				break;
			}
			case 'toolSuspended': {
				const msg = ensureMsgFor(session, event.messageId);
				const { payload } = event;
				const tc =
					msg.toolCalls?.find((t) => t.toolCallId === payload.toolCallId) ??
					({
						tool: payload.toolName,
						toolCallId: payload.toolCallId,
						input: payload.input,
						state: 'suspended',
					} satisfies ToolCall);
				if (!msg.toolCalls?.includes(tc)) {
					msg.toolCalls = [...(msg.toolCalls ?? []), tc];
				} else {
					tc.state = 'suspended';
					tc.input = payload.input;
				}
				const interactive = rebuildInteractiveFromHistory({
					...tc,
					output: undefined,
				});
				if (interactive) {
					interactive.runId = payload.runId;
					msg.interactive = interactive;
					msg.status = 'awaitingUser';
				}
				break;
			}
			case 'codeDelta': {
				params.onCodeDelta?.(event.delta);
				break;
			}
			case 'configUpdated':
			case 'toolUpdated': {
				session.builderMutated = true;
				params.onConfigUpdated?.();
				break;
			}
			case 'error': {
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
			while (true) {
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
					if (result?.done) break;
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
		// Flip any still-streaming messages to success.
		for (const msg of session.msgsByMessageId.values()) {
			if (msg.status === 'streaming') msg.status = 'success';
		}
		if (params.endpoint.value === 'build' && session.builderMutated) {
			params.onConfigUpdated?.();
		}
	}

	async function postAndConsume(url: string, body: Record<string, unknown>): Promise<void> {
		const session: StreamSession = {
			builderMutated: false,
			msgsByMessageId: new Map(),
		};

		isStreaming.value = true;
		const controller = new AbortController();
		abortController.value = controller;

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
				const errorMsg: ChatMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: `Error: ${response.statusText || 'Failed to reach agent'}`,
					status: 'error',
				};
				messages.value.push(errorMsg);
				return;
			}

			await consumeStream(response, session);
			finalizeStream(session);
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				finalizeStream(session);
				return;
			}
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
		const { baseUrl } = rootStore.restApiContext;
		const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/build/resume`;
		await postAndConsume(url, payload);
	}

	async function sendMessage(text: string): Promise<void> {
		const trimmed = text.trim();
		if (!trimmed || isStreaming.value) return;
		messages.value.push({
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmed,
			status: 'success',
		});
		await streamFromEndpoint(params.endpoint.value, trimmed);
	}

	function stopGenerating(): void {
		abortController.value?.abort();
	}

	return {
		messages,
		isStreaming,
		messagingState,
		loadHistory,
		clearHistory,
		sendMessage,
		stopGenerating,
		resume,
	};
}
