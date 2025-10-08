import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { fetchChatModelsApi, sendText } from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	ChatHubConversationModel,
	ChatHubSendMessageRequest,
	ChatModelsResponse,
} from '@n8n/api-types';
import type { StructuredChunk, ChatMessage, CredentialsMap } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const isResponding = ref(false);
	const chatMessages = ref<ChatMessage[]>([]);

	const assistantMessages = computed(() =>
		chatMessages.value.filter((msg) => msg.role === 'assistant'),
	);
	const usersMessages = computed(() => chatMessages.value.filter((msg) => msg.role === 'user'));

	async function fetchChatModels(credentialMap: CredentialsMap) {
		loadingModels.value = true;
		models.value = await fetchChatModelsApi(rootStore.restApiContext, {
			credentials: credentialMap,
		});
		loadingModels.value = false;
		return models.value;
	}

	function addUserMessage(content: string, id: string) {
		chatMessages.value.push({
			id,
			role: 'user',
			type: 'message',
			text: content,
		});
	}

	function addAiMessage(content: string, id: string) {
		chatMessages.value.push({
			id,
			role: 'assistant',
			type: 'message',
			text: content,
		});
	}

	function appendMessage(content: string, id: string) {
		const existingMessage = chatMessages.value.find((m) => m.id === id);
		if (existingMessage && existingMessage.type === 'message') {
			existingMessage.text += content;
			return;
		}
	}

	function onBeginMessage(messageId: string, nodeId: string, runIndex?: number) {
		isResponding.value = true;
		addAiMessage('', `${messageId}-${nodeId}-${runIndex ?? 0}`);
	}

	function onChunk(messageId: string, chunk: string, nodeId?: string, runIndex?: number) {
		appendMessage(chunk, `${messageId}-${nodeId}-${runIndex ?? 0}`);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onEndMessage(_messageId: string, _nodeId: string, _runIndex?: number) {
		isResponding.value = false;
	}

	function onStreamMessage(message: StructuredChunk, messageId: string) {
		const nodeId = message.metadata?.nodeId || 'unknown';
		const runIndex = message.metadata?.runIndex;

		switch (message.type) {
			case 'begin':
				onBeginMessage(messageId, nodeId, runIndex);
				break;
			case 'item':
				onChunk(messageId, message.content ?? '', nodeId, runIndex);
				break;
			case 'end':
				onEndMessage(messageId, nodeId, runIndex);
				break;
			case 'error':
				onChunk(messageId, `Error: ${message.content ?? 'Unknown error'}`, nodeId, runIndex);
				onEndMessage(messageId, nodeId, runIndex);
				break;
		}

		// addAssistantMessages(response.messages);
	}

	function onStreamDone() {
		isResponding.value = false;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onStreamError(_e: Error) {
		isResponding.value = false;
	}

	const askAI = (
		message: string,
		sessionId: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) => {
		const messageId = uuidv4();
		addUserMessage(message, messageId);

		sendText(
			rootStore.restApiContext,
			{
				model,
				messageId,
				sessionId,
				message,
				credentials,
			},
			(chunk: StructuredChunk) => onStreamMessage(chunk, messageId),
			onStreamDone,
			onStreamError,
		);
	};

	return {
		models,
		loadingModels,
		fetchChatModels,
		askAI,
		isResponding,
		chatMessages,
		assistantMessages,
		usersMessages,
		addUserMessage,
	};
});
