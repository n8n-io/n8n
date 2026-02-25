import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useRootStore } from '@n8n/stores/useRootStore';
import { sendInstanceAiMessage } from './instanceAi.api';
import type { InstanceAiChatMessage, InstanceAiStreamChunk } from './instanceAi.types';

export const useInstanceAiStore = defineStore('instanceAi', () => {
	const rootStore = useRootStore();

	const currentThreadId = ref<string>(uuidv4());
	const messages = ref<InstanceAiChatMessage[]>([]);
	const isStreaming = ref(false);
	const abortController = ref<AbortController | null>(null);

	const threads = ref<Array<{ id: string; title: string; createdAt: string }>>([]);

	const hasMessages = computed(() => messages.value.length > 0);

	function newThread() {
		currentThreadId.value = uuidv4();
		messages.value = [];

		threads.value.unshift({
			id: currentThreadId.value,
			title: 'New conversation',
			createdAt: new Date().toISOString(),
		});
	}

	function switchThread(threadId: string) {
		currentThreadId.value = threadId;
		// For v1, messages are in-memory only per session.
		// Thread persistence via Mastra memory happens on the backend.
		messages.value = [];
	}

	async function sendMessage(message: string) {
		// Add user message
		const userMessage: InstanceAiChatMessage = {
			id: uuidv4(),
			role: 'user',
			content: message,
			toolCalls: [],
			reasoning: '',
			isStreaming: false,
			createdAt: new Date().toISOString(),
		};
		messages.value.push(userMessage);

		// Update thread title from first message
		const thread = threads.value.find((t) => t.id === currentThreadId.value);
		if (thread && thread.title === 'New conversation') {
			thread.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
		}

		// Create assistant message stub for streaming
		const assistantMessage: InstanceAiChatMessage = {
			id: uuidv4(),
			role: 'assistant',
			content: '',
			toolCalls: [],
			reasoning: '',
			isStreaming: true,
			createdAt: new Date().toISOString(),
		};
		messages.value.push(assistantMessage);

		isStreaming.value = true;
		const controller = new AbortController();
		abortController.value = controller;

		try {
			await sendInstanceAiMessage(
				rootStore.restApiContext,
				currentThreadId.value,
				message,
				(chunk: InstanceAiStreamChunk) => handleChunk(assistantMessage.id, chunk),
				() => {
					assistantMessage.isStreaming = false;
					isStreaming.value = false;
					abortController.value = null;
				},
				(error: Error) => {
					if (error.name !== 'AbortError') {
						assistantMessage.content += '\n\n*Error: Failed to get response.*';
					}
					assistantMessage.isStreaming = false;
					isStreaming.value = false;
					abortController.value = null;
				},
				controller.signal,
			);
		} catch {
			assistantMessage.isStreaming = false;
			isStreaming.value = false;
			abortController.value = null;
		}
	}

	function handleChunk(messageId: string, chunk: InstanceAiStreamChunk) {
		const msg = messages.value.find((m) => m.id === messageId);
		if (!msg) return;

		const payload = chunk.payload as Record<string, unknown> | undefined;

		switch (chunk.type) {
			case 'text-delta':
				if (payload?.text) {
					msg.content += payload.text as string;
				}
				break;

			case 'reasoning-delta':
				if (payload?.text) {
					msg.reasoning += payload.text as string;
				}
				break;

			case 'tool-call':
				if (payload) {
					msg.toolCalls.push({
						toolCallId: (payload.toolCallId as string) ?? '',
						toolName: (payload.toolName as string) ?? '',
						args: (payload.args as Record<string, unknown>) ?? {},
						isLoading: true,
					});
				}
				break;

			case 'tool-result':
				if (payload) {
					const tc = msg.toolCalls.find((t) => t.toolCallId === (payload.toolCallId as string));
					if (tc) {
						tc.result = payload.result;
						tc.isError = (payload.isError as boolean) ?? false;
						tc.isLoading = false;
					}
				}
				break;

			case 'tool-error':
				if (payload) {
					const tc = msg.toolCalls.find((t) => t.toolCallId === (payload.toolCallId as string));
					if (tc) {
						tc.result = payload.error ?? 'Tool execution failed';
						tc.isError = true;
						tc.isLoading = false;
					}
				}
				break;

			case 'error':
				msg.content += '\n\n*Error occurred during generation.*';
				break;

			case 'done':
			case 'finish':
				msg.isStreaming = false;
				break;
		}
	}

	function stopStreaming() {
		abortController.value?.abort();
		abortController.value = null;
		isStreaming.value = false;

		// Mark the last assistant message as done
		const lastMsg = messages.value[messages.value.length - 1];
		if (lastMsg?.role === 'assistant') {
			lastMsg.isStreaming = false;
		}
	}

	return {
		currentThreadId,
		messages,
		isStreaming,
		threads,
		hasMessages,
		newThread,
		switchThread,
		sendMessage,
		stopStreaming,
	};
});
