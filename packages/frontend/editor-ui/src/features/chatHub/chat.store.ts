import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { fetchChatModelsApi, messageChatApi } from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useCredentialsStore } from '@/stores/credentials.store';
import type {
	StreamChunk,
	StreamOutput,
	ChatMessage,
	ChatHubConversationModel,
} from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const models = ref<ChatHubConversationModel[]>([]);
	const loadingModels = ref(false);

	const isResponding = ref(false);
	const chatMessages = ref<ChatMessage[]>([]);
	const assistantMessages = computed(() =>
		chatMessages.value.filter((msg) => msg.role === 'assistant'),
	);
	const usersMessages = computed(() => chatMessages.value.filter((msg) => msg.role === 'user'));

	const rootStore = useRootStore();
	const credentialsStore = useCredentialsStore();

	const availableCredentialTypes = computed(() => {
		const userCredentials = credentialsStore.allCredentials;
		return new Set(userCredentials.map((cred) => cred.type));
	});

	const availableModels = computed(() => {
		return models.value.filter((model) => availableCredentialTypes.value.has(model.credentialType));
	});

	function setModels(newModels: ChatHubConversationModel[]) {
		models.value = newModels;
	}

	async function fetchChatModels() {
		loadingModels.value = true;
		models.value = await fetchChatModelsApi(rootStore.restApiContext);
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
		isResponding.value = false;
	}

	function onStreamError(e: Error) {
		console.error('Streaming error:', e);
		isResponding.value = false;
	}

	const askAI = (message: string, sessionId: string, model: ChatHubConversationModel) => {
		const messageId = uuidv4();
		addUserMessage(message, messageId);

		if (model.provider !== 'openai') {
			throw Error('not supported');
		}

		messageChatApi(
			rootStore.restApiContext,
			model.provider,
			{
				model: model.model,
				messageId,
				sessionId,
				message,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);
	};

	return {
		models,
		availableCredentialTypes,
		availableModels,
		loadingModels,
		setModels,
		fetchChatModels,
		askAI,
		isResponding,
		chatMessages,
		assistantMessages,
		usersMessages,
		addUserMessage,
		addAssistantMessages,
	};
});
