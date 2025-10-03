import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { fetchChatModelsApi, messageChatApi } from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { StreamChunk, StreamOutput, ChatMessage } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const models = ref<string[]>([]);
	const loadingModels = ref(false);

	const isStreaming = ref(false);
	const chatMessages = ref<ChatMessage[]>([]);
	const assistantMessages = computed(() =>
		chatMessages.value.filter((msg) => msg.role === 'assistant'),
	);
	const usersMessages = computed(() => chatMessages.value.filter((msg) => msg.role === 'user'));

	const rootStore = useRootStore();

	function setModels(newModels: string[]) {
		models.value = newModels;
	}

	async function fetchChatModels() {
		loadingModels.value = true;
		models.value = await fetchChatModelsApi(rootStore.restApiContext, 'openai');
		loadingModels.value = false;
	}

	function addUserMessage(content: string, id: string) {
		chatMessages.value.push({
			id,
			role: 'user',
			type: 'message',
			text: content,
		});
	}

	function addAssistantMessages(newMessages: StreamChunk[]) {
		for (const msg of newMessages) {
			if (msg.type === 'message') {
				const existingMessage = chatMessages.value.find((m) => m.id === msg.id);
				if (existingMessage && existingMessage.type === 'message') {
					existingMessage.text += msg.text;
					continue;
				} else {
					chatMessages.value.push(msg);
				}
			} else if (msg.type === 'error') {
				chatMessages.value = chatMessages.value.filter((m) => m.id !== msg.id);
				chatMessages.value.push(msg);
			}
		}
	}

	function onStreamMessage(response: StreamOutput) {
		addAssistantMessages(response.messages);
	}

	function onStreamDone() {
		// No-op for now
		console.log('Streaming done!');
		isStreaming.value = false;
	}

	function onStreamError(e: Error) {
		console.error('Streaming error:', e);
		isStreaming.value = false;
	}

	const initChat = (message: string) => {
		const messageId = uuidv4();
		addUserMessage(message, messageId);

		messageChatApi(
			rootStore.restApiContext,
			'openai',
			{
				model: 'gpt-4',
				messageId,
				message,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);
	};

	return {
		models,
		loadingModels,
		setModels,
		fetchChatModels,
		initChat,
		isStreaming,
		chatMessages,
		assistantMessages,
		usersMessages,
		addUserMessage,
		addAssistantMessages,
	};
});
