import { ref, reactive, computed, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	getBuilderMessages,
	clearBuilderMessages,
	getChatMessages,
	clearChatMessages,
} from './useAgentApi';
import { convertDbMessages, type ChatMessage, type ToolCall } from './agentChatMessages';

export interface UseAgentChatStreamParams {
	projectId: Ref<string>;
	agentId: Ref<string>;
	endpoint: Ref<'build' | 'chat'>;
	onCodeUpdated?: () => void;
	onCodeDelta?: (delta: string) => void;
	onConfigUpdated?: () => void;
}

export function useAgentChatStream(params: UseAgentChatStreamParams) {
	const rootStore = useRootStore();

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
		const fetchMessages = params.endpoint.value === 'build' ? getBuilderMessages : getChatMessages;
		try {
			const dbMessages = await fetchMessages(
				rootStore.restApiContext,
				params.projectId.value,
				params.agentId.value,
			);
			if (dbMessages.length > 0) {
				messages.value = convertDbMessages(dbMessages);
			}
		} catch {
			// Silently ignore — just start with empty chat
		} finally {
			historyLoaded.value = true;
		}
	}

	async function clearHistory(): Promise<void> {
		const clearRemote =
			params.endpoint.value === 'build' ? clearBuilderMessages : clearChatMessages;
		try {
			await clearRemote(rootStore.restApiContext, params.projectId.value, params.agentId.value);
			messages.value = [];
		} catch {
			// ignore
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
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'browser-id': browserId,
				},
				credentials: 'include',
				body: JSON.stringify({ message }),
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
						const tc = data.toolCall as { tool: string; input?: unknown };
						assistantMsg.toolCalls = assistantMsg.toolCalls ?? [];
						assistantMsg.toolCalls.push({ tool: tc.tool, input: tc.input });
					}

					if (data.toolResult && typeof data.toolResult === 'object') {
						const tr = data.toolResult as { tool: string; output?: unknown };
						const existing = assistantMsg.toolCalls?.find(
							(t: ToolCall) => t.tool === tr.tool && t.output === undefined,
						);
						if (existing) {
							existing.output = tr.output;
						}
						if (assistantMsg.content && !assistantMsg.content.endsWith('\n')) {
							assistantMsg.content += '\n';
						}
					}

					if (typeof data.error === 'string') {
						ensureMsg();
						assistantMsg.content += `\n\nError: ${data.error}`;
						assistantMsg.status = 'error';
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
	};
}
