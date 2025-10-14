import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import {
	fetchChatModelsApi,
	sendText,
	fetchConversationsApi as fetchSessionsApi,
	fetchSingleConversationApi as fetchMessagesApi,
} from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	ChatHubConversationModel,
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubSessionDto,
} from '@n8n/api-types';
import type { StructuredChunk, ChatMessage, CredentialsMap } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const streamingMessageId = ref<string>();
	const messagesBySession = ref<Partial<Record<string, ChatMessage[]>>>({});
	const sessions = ref<ChatHubSessionDto[]>([]);

	const isResponding = computed(() => streamingMessageId.value !== undefined);

	const getLastMessage = (sessionId: string) => {
		const msgs = messagesBySession.value[sessionId];
		if (!msgs || msgs.length === 0) return null;
		return msgs[msgs.length - 1];
	};

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
		const { conversation } = await fetchMessagesApi(rootStore.restApiContext, sessionId);
		const { messages, activeMessageChain } = conversation;

		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: activeMessageChain.map((id) => ({
				id: messages[id].id,
				role: messages[id].type === 'ai' ? 'assistant' : 'user',
				type: 'message' as const,
				text: messages[id].content,
				key: messages[id].id,
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
					key: id,
					role: 'user',
					type: 'message',
					text: content,
				},
			],
		};
	}

	function addAiMessage(sessionId: string, content: string, id: string, key: string) {
		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: [
				...(messagesBySession.value[sessionId] ?? []),
				{
					id,
					key,
					role: 'assistant',
					type: 'message',
					text: content,
				},
			],
		};
	}

	function appendMessage(sessionId: string, content: string, key: string) {
		messagesBySession.value = {
			...messagesBySession.value,
			[sessionId]: (messagesBySession.value[sessionId] ?? []).map((msg) => {
				if (msg.key === key && msg.type === 'message') {
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
		streamingMessageId.value = messageId;
		addAiMessage(sessionId, '', messageId, `${messageId}-${nodeId}-${runIndex ?? 0}`);
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
		streamingMessageId.value = undefined;
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
		streamingMessageId.value = undefined;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onStreamError(_e: Error) {
		streamingMessageId.value = undefined;
	}

	function askAI(
		sessionId: string,
		message: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const messageId = uuidv4();
		const replyId = uuidv4();
		const previousMessageId = getLastMessage(sessionId)?.id ?? null;

		addUserMessage(sessionId, message, messageId);

		sendText(
			rootStore.restApiContext,
			{
				model,
				messageId,
				sessionId,
				replyId,
				message,
				credentials,
				previousMessageId,
			},
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId),
			onStreamDone,
			onStreamError,
		);
	}

	async function renameSession(sessionId: string, name: string) {
		// Optimistic update
		sessions.value = sessions.value.map((session) =>
			session.id === sessionId ? { ...session, title: name } : session,
		);

		// TODO: call the endpoint
	}

	async function deleteSession(sessionId: string) {
		// Optimistic update
		sessions.value = sessions.value.filter((session) => session.id !== sessionId);

		// TODO: call the endpoint
	}

	async function updateChatMessage(_sessionId: string, _messageId: string, _content: string) {
		// TODO: call the endpoint
	}

	return {
		models,
		loadingModels,
		messagesBySession,
		isResponding,
		streamingMessageId,
		sessions,
		fetchChatModels,
		askAI,
		addUserMessage,
		fetchSessions,
		fetchMessages,
		renameSession,
		deleteSession,
		updateChatMessage,
	};
});
