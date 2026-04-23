import { ref, reactive, computed, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import {
	getBuilderMessages,
	clearBuilderMessages,
	getChatMessages,
	getTestChatMessages,
	clearTestChatMessages,
} from './useAgentApi';
import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages, type ChatMessage, type ToolCall } from './agentChatMessages';

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
			if (params.endpoint.value === 'build') {
				dbMessages = await getBuilderMessages(
					rootStore.restApiContext,
					params.projectId.value,
					params.agentId.value,
				);
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
				messages.value = convertDbMessages(dbMessages);
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

	async function streamFromEndpoint(endpoint: 'build' | 'chat', message: string): Promise<void> {
		isStreaming.value = true;
		let builderMutated = false;
		const assistantMsg = reactive<ChatMessage>({
			id: crypto.randomUUID(),
			role: 'assistant',
			content: '',
			thinking: '',
			toolCalls: [],
			status: 'streaming',
		});
		let msgAdded = false;

		const ensureMsg = () => {
			if (!msgAdded) {
				messages.value.push(assistantMsg);
				msgAdded = true;
			}
		};

		const controller = new AbortController();
		abortController.value = controller;

		try {
			const { baseUrl } = rootStore.restApiContext;
			const browserId = localStorage.getItem('n8n-browserId') ?? '';
			const url = `${baseUrl}/projects/${params.projectId.value}/agents/v2/${params.agentId.value}/${endpoint}`;
			const body: Record<string, unknown> = { message };
			if (endpoint === 'chat' && params.continueSessionId?.value) {
				body.sessionId = params.continueSessionId.value;
			}
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'browser-id': browserId,
				},
				credentials: 'include',
				body: JSON.stringify(body),
				signal: controller.signal,
			});

			if (!response.ok || !response.body) {
				assistantMsg.content = `Error: ${response.statusText || 'Failed to reach agent'}`;
				assistantMsg.status = 'error';
				messages.value.push(assistantMsg);
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue;
					const raw = line.slice(6);

					let data: Record<string, unknown>;
					try {
						data = JSON.parse(raw) as Record<string, unknown>;
					} catch {
						continue;
					}

					if (data.done) continue;

					if (typeof data.text === 'string') {
						ensureMsg();
						assistantMsg.content += data.text;
					}

					if (typeof data.thinking === 'string') {
						ensureMsg();
						assistantMsg.thinking = (assistantMsg.thinking ?? '') + data.thinking;
					}

					if (typeof data.codeDelta === 'string') {
						params.onCodeDelta?.(data.codeDelta);
					}

					if (typeof data.code === 'string') {
						params.onCodeUpdated?.();
					}

					if (data.configUpdated !== undefined || data.toolUpdated !== undefined) {
						builderMutated = true;
						params.onConfigUpdated?.();
					}

					if (data.toolCall && typeof data.toolCall === 'object') {
						ensureMsg();
						if (assistantMsg.content && !assistantMsg.content.endsWith('\n')) {
							assistantMsg.content += '\n';
						}
						const tc = data.toolCall as {
							tool: string;
							toolCallId?: string;
							input?: unknown;
						};
						assistantMsg.toolCalls = assistantMsg.toolCalls ?? [];
						const already = tc.toolCallId
							? assistantMsg.toolCalls.find((t: ToolCall) => t.toolCallId === tc.toolCallId)
							: undefined;
						if (already) {
							if (tc.input !== undefined) already.input = tc.input;
						} else {
							assistantMsg.toolCalls.push({
								tool: tc.tool,
								toolCallId: tc.toolCallId,
								input: tc.input,
								status: 'pending',
							});
						}
					}

					if (data.toolCallInput && typeof data.toolCallInput === 'object') {
						const tci = data.toolCallInput as { toolCallId?: string; input?: unknown };
						if (tci.toolCallId) {
							const existing = assistantMsg.toolCalls?.find(
								(t: ToolCall) => t.toolCallId === tci.toolCallId,
							);
							if (existing) existing.input = tci.input;
						}
					}

					if (data.toolCallExecuting && typeof data.toolCallExecuting === 'object') {
						const tce = data.toolCallExecuting as { toolCallId?: string; tool?: string };
						const existing =
							(tce.toolCallId
								? assistantMsg.toolCalls?.find((t: ToolCall) => t.toolCallId === tce.toolCallId)
								: undefined) ??
							(tce.tool
								? assistantMsg.toolCalls?.find(
										(t: ToolCall) => t.tool === tce.tool && t.status !== 'done',
									)
								: undefined);
						if (existing) {
							if (existing.status !== 'done') existing.status = 'running';
						}
					}

					if (data.toolResult && typeof data.toolResult === 'object') {
						const tr = data.toolResult as {
							tool: string;
							toolCallId?: string;
							output?: unknown;
						};
						const existing =
							(tr.toolCallId
								? assistantMsg.toolCalls?.find((t: ToolCall) => t.toolCallId === tr.toolCallId)
								: undefined) ??
							assistantMsg.toolCalls?.find(
								(t: ToolCall) => t.tool === tr.tool && t.output === undefined,
							);
						if (existing) {
							existing.output = tr.output;
							existing.status = 'done';
						}
						if (assistantMsg.content && !assistantMsg.content.endsWith('\n')) {
							assistantMsg.content += '\n';
						}
					}

					if (typeof data.error === 'string') {
						if (data.errorCode === 'agent_misconfigured') {
							// Misconfiguration is a distinct class of error: the agent can't
							// run until its config is fixed. Surface it via the banner path
							// rather than as an inline error bubble so the user sees what's
							// missing and can act on it.
							fatalError.value = {
								message: data.error,
								missing: Array.isArray(data.missing)
									? (data.missing as string[]).filter((m): m is string => typeof m === 'string')
									: [],
							};
							if (msgAdded) {
								// We already pushed an empty assistant bubble before the error
								// arrived — drop it so the banner is the only surface.
								messages.value = messages.value.filter((m) => m.id !== assistantMsg.id);
								msgAdded = false;
							}
						} else {
							ensureMsg();
							assistantMsg.content += `\n\nError: ${data.error}`;
							assistantMsg.status = 'error';
						}
					}
				}
			}

			assistantMsg.status = 'success';
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') {
				assistantMsg.status = 'success';
			} else {
				if (!msgAdded) {
					messages.value.push(assistantMsg);
				}
				const errorText = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
				assistantMsg.content = assistantMsg.content
					? `${assistantMsg.content}\n\n${errorText}`
					: errorText;
				assistantMsg.status = 'error';
			}
		} finally {
			abortController.value = null;
			isStreaming.value = false;
			if (endpoint === 'build' && builderMutated) {
				params.onConfigUpdated?.();
			}
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
		dismissFatalError,
	};
}
