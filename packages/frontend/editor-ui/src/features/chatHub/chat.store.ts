import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import {
	fetchChatModelsApi,
	sendMessageApi,
	editMessageApi,
	regenerateMessageApi,
	fetchConversationsApi as fetchSessionsApi,
	fetchSingleConversationApi as fetchMessagesApi,
} from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import type {
	ChatHubConversationModel,
	ChatHubSendMessageRequest,
	ChatModelsResponse,
	ChatHubSessionDto,
	ChatMessageId,
	ChatSessionId,
} from '@n8n/api-types';
import type { StructuredChunk, ChatMessage, CredentialsMap } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const ongoingStreaming = ref<{ messageId: string; replyToMessageId: string }>();
	const messagesBySession = ref<Partial<Record<string, ChatMessage[]>>>({});
	const sessions = ref<ChatHubSessionDto[]>([]);

	const isResponding = computed(() => ongoingStreaming.value !== undefined);

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

	function onBeginMessage(
		sessionId: string,
		messageId: string,
		replyToMessageId: string,
		nodeId: string,
		runIndex?: number,
	) {
		ongoingStreaming.value = { messageId, replyToMessageId };
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
		ongoingStreaming.value = undefined;
	}

	function onStreamMessage(
		sessionId: string,
		message: StructuredChunk,
		messageId: string,
		replyToMessageId: string,
	) {
		const nodeId = message.metadata?.nodeId || 'unknown';
		const runIndex = message.metadata?.runIndex;

		switch (message.type) {
			case 'begin':
				onBeginMessage(sessionId, messageId, replyToMessageId, nodeId, runIndex);
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

	async function onStreamDone() {
		ongoingStreaming.value = undefined;
		await fetchSessions(); // update the conversation list
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onStreamError(_e: Error) {
		ongoingStreaming.value = undefined;
	}

	function sendMessage(
		sessionId: ChatSessionId,
		message: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const messageId = uuidv4();
		const replyId = uuidv4();
		const previousMessageId = getLastMessage(sessionId)?.id ?? null;

		addUserMessage(sessionId, message, messageId);

		sendMessageApi(
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
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, messageId),
			onStreamDone,
			onStreamError,
		);
	}

	function editMessage(
		sessionId: ChatSessionId,
		editId: ChatMessageId,
		message: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const messageId = uuidv4();
		const replyId = uuidv4();

		addUserMessage(sessionId, message, messageId);

		// TODO: remove descendants of the message being edited
		// or better yet, turn the frontend chat into a graph and
		// maintain the visible active chain, and this would just switch to that branch.

		editMessageApi(
			rootStore.restApiContext,
			{
				model,
				messageId,
				sessionId,
				replyId,
				editId,
				message,
				credentials,
			},
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, messageId),
			onStreamDone,
			onStreamError,
		);
	}

	function regenerateMessage(
		sessionId: ChatSessionId,
		retryId: ChatMessageId,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const replyId = uuidv4();

		// TODO: remove descendants of the message being retried
		// or better yet, turn the frontend chat into a graph and
		// maintain the visible active chain, and this would just switch to that branch.

		regenerateMessageApi(
			rootStore.restApiContext,
			{
				model,
				sessionId,
				retryId,
				replyId,
				credentials,
			},
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, retryId),
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

	return {
		models,
		loadingModels,
		messagesBySession,
		isResponding,
		ongoingStreaming,
		sessions,
		fetchChatModels,
		sendMessage,
		editMessage,
		regenerateMessage,
		addUserMessage,
		fetchSessions,
		fetchMessages,
		renameSession,
		deleteSession,
	};
});
