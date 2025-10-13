import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import {
	fetchChatModelsApi,
	sendText,
	fetchConversationsApi as fetchSessionsApi,
	fetchConversationMessagesApi as fetchMessagesApi,
} from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	ChatHubConversationModel,
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubConversation,
} from '@n8n/api-types';
import type { StructuredChunk, ChatMessage, CredentialsMap } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const isResponding = ref(false);
	const messagesBySession = ref<Partial<Record<string, ChatMessage[]>>>({});
	const sessions = ref<ChatHubConversation[]>([]);

	async function fetchChatModels(credentialMap: CredentialsMap) {
		loadingModels.value = true;
		models.value = await fetchChatModelsApi(rootStore.restApiContext, {
			credentials: credentialMap,
		});
		loadingModels.value = false;
		return models.value;
	}

	async function fetchSessions() {
		sessions.value = await fetchSessionsApi(rootStore.restApiContext);
	}

	async function fetchMessages(sessionId: string) {
		const messages = await fetchMessagesApi(rootStore.restApiContext, sessionId);

		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: messages.map((msg) => ({
				id: msg.id,
				role: msg.role,
				type: 'message' as const,
				text: msg.content,
			})),
		};
	}

	function addUserMessage(sessionId: string, content: string, id: string) {
		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: [
				...(messagesBySession.value[sessionId] ?? []),
				{
					id,
					role: 'user',
					type: 'message',
					text: content,
				},
			],
		};
	}

	function addAiMessage(sessionId: string, content: string, id: string) {
		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: [
				...(messagesBySession.value[sessionId] ?? []),
				{
					id,
					role: 'assistant',
					type: 'message',
					text: content,
				},
			],
		};
	}

	function appendMessage(sessionId: string, content: string, id: string) {
		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: (messagesBySession.value[sessionId] ?? []).map((msg) => {
				if (msg.id === id && msg.type === 'message') {
					return {
						...msg,
						text: msg.text + content,
					};
				}
				return msg;
			}),
		};
	}

	function onBeginMessage(sessionId: string, messageId: string, nodeId: string, runIndex?: number) {
		isResponding.value = true;
		addAiMessage(sessionId, '', `${messageId}-${nodeId}-${runIndex ?? 0}`);
	}

	function onChunk(
		sessionId: string,
		messageId: string,
		chunk: string,
		nodeId?: string,
		runIndex?: number,
	) {
		appendMessage(sessionId, chunk, `${messageId}-${nodeId}-${runIndex ?? 0}`);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onEndMessage(_messageId: string, _nodeId: string, _runIndex?: number) {
		isResponding.value = false;
	}

	function onStreamMessage(sessionId: string, message: StructuredChunk, messageId: string) {
		const nodeId = message.metadata?.nodeId || 'unknown';
		const runIndex = message.metadata?.runIndex;

		switch (message.type) {
			case 'begin':
				onBeginMessage(sessionId, messageId, nodeId, runIndex);
				break;
			case 'item':
				onChunk(sessionId, messageId, message.content ?? '', nodeId, runIndex);
				break;
			case 'end':
				onEndMessage(messageId, nodeId, runIndex);
				break;
			case 'error':
				onChunk(
					sessionId,
					messageId,
					`Error: ${message.content ?? 'Unknown error'}`,
					nodeId,
					runIndex,
				);
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

	function askAI(
		sessionId: string,
		message: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const messageId = uuidv4();

		addUserMessage(sessionId, message, messageId);

		sendText(
			rootStore.restApiContext,
			{
				model,
				messageId,
				sessionId,
				message,
				credentials,
			},
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, messageId),
			onStreamDone,
			onStreamError,
		);
	}

	return {
		models,
		loadingModels,
		messagesBySession,
		isResponding,
		sessions,
		fetchChatModels,
		askAI,
		addUserMessage,
		fetchSessions,
		fetchMessages,
	};
});
