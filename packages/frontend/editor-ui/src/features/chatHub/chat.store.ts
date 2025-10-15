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
	ChatHubConversationDto,
	ChatMessageId,
	ChatSessionId,
	ChatHubMessageDto,
} from '@n8n/api-types';
import type { StructuredChunk, CredentialsMap } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const ongoingStreaming = ref<{ messageId: ChatMessageId; replyToMessageId: ChatMessageId }>();
	const isResponding = computed(() => ongoingStreaming.value !== undefined);

	const conversationsBySession = ref<Map<ChatSessionId, ChatHubConversationDto>>(new Map());
	const sessions = ref<ChatHubSessionDto[]>([]);

	const getConversation = (sessionId: ChatSessionId): ChatHubConversationDto | undefined =>
		conversationsBySession.value.get(sessionId);

	const getActiveMessages = (sessionId: ChatSessionId): ChatHubMessageDto[] => {
		const conversation = getConversation(sessionId);
		if (!conversation) return [];

		return conversation.activeMessageChain.map((id) => conversation.messages[id]).filter(Boolean);
	};

	function ensureConversation(sessionId: ChatSessionId): ChatHubConversationDto {
		if (!conversationsBySession.value.has(sessionId)) {
			conversationsBySession.value.set(sessionId, {
				messages: {},
				rootIds: [],
				activeMessageChain: [],
			});
		}

		const conversation = conversationsBySession.value.get(sessionId);
		if (!conversation) {
			throw new Error(`Conversation for session ID ${sessionId} not found`);
		}

		return conversation;
	}

	function computeActiveChain(
		conversation: ChatHubConversationDto,
		lastMessageId: ChatMessageId | null,
	) {
		const messages = conversation.messages;
		const chain: ChatMessageId[] = [];

		if (!lastMessageId) {
			return chain;
		}
		const visited = new Set<ChatMessageId>();

		let current: ChatMessageId | null = lastMessageId;

		while (current && !visited.has(current)) {
			chain.unshift(current);
			visited.add(current);
			current = messages[current]?.previousMessageId ?? null;
		}

		return chain;
	}

	function addMessage(sessionId: ChatSessionId, message: ChatHubMessageDto) {
		const conversation = ensureConversation(sessionId);
		conversation.messages[message.id] = message;

		if (message.previousMessageId) {
			if (!conversation.messages[message.previousMessageId].responseIds.includes(message.id)) {
				conversation.messages[message.previousMessageId].responseIds.push(message.id);
			}
		}

		if (message.retryOfMessageId) {
			if (!conversation.messages[message.retryOfMessageId].retryIds.includes(message.id)) {
				conversation.messages[message.retryOfMessageId].retryIds.push(message.id);
			}
		}

		if (message.revisionOfMessageId) {
			if (!conversation.messages[message.revisionOfMessageId].revisionIds.includes(message.id)) {
				conversation.messages[message.revisionOfMessageId].revisionIds.push(message.id);
			}
		}

		conversation.activeMessageChain = computeActiveChain(conversation, message.id);
	}

	function appendMessage(sessionId: ChatSessionId, messageId: ChatMessageId, chunk: string) {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];
		if (!message) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		message.content += chunk;
	}

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

		conversationsBySession.value.set(sessionId, conversation);
	}

	function onBeginMessage(
		sessionId: string,
		messageId: string,
		replyToMessageId: string,
		retryOfMessageId: string | null,
		_nodeId: string,
		_runIndex?: number,
	) {
		ongoingStreaming.value = { messageId, replyToMessageId };
		// addAiMessage(sessionId, '', messageId, `${messageId}-${nodeId}-${runIndex ?? 0}`);
		addMessage(sessionId, {
			id: messageId,
			sessionId,
			type: 'ai',
			name: 'AI',
			content: '',
			provider: null,
			model: null,
			workflowId: null,
			executionId: null,
			state: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId: replyToMessageId,
			turnId: null,
			retryOfMessageId,
			revisionOfMessageId: null,
			runIndex: 0,
			responseIds: [],
			retryIds: [],
			revisionIds: [],
		});
	}

	function onChunk(
		sessionId: string,
		messageId: string,
		chunk: string,
		nodeId?: string,
		runIndex?: number,
	) {
		// appendMessage(sessionId, chunk, `${messageId}-${nodeId}-${runIndex ?? 0}`);
		appendMessage(sessionId, messageId, chunk);
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
		retryOfMessageId: string | null,
	) {
		const nodeId = message.metadata?.nodeId || 'unknown';
		const runIndex = message.metadata?.runIndex;

		switch (message.type) {
			case 'begin':
				onBeginMessage(sessionId, messageId, replyToMessageId, retryOfMessageId, nodeId, runIndex);
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
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.activeMessageChain.length
			? conversation.activeMessageChain[conversation.activeMessageChain.length - 1]
			: null;

		addMessage(sessionId, {
			id: messageId,
			sessionId,
			type: 'human',
			name: 'User',
			content: message,
			provider: null,
			model: null,
			workflowId: null,
			executionId: null,
			state: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			turnId: null,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			runIndex: 0,
			responseIds: [],
			retryIds: [],
			revisionIds: [],
		});

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
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, messageId, null),
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

		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[editId]?.previousMessageId ?? null;

		addMessage(sessionId, {
			id: messageId,
			sessionId,
			type: 'human',
			name: 'User',
			content: message,
			provider: null,
			model: null,
			workflowId: null,
			executionId: null,
			state: 'active',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			turnId: null,
			retryOfMessageId: null,
			revisionOfMessageId: editId,
			runIndex: 0,
			responseIds: [],
			retryIds: [],
			revisionIds: [],
		});

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
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, messageId, null),
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
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[retryId]?.previousMessageId ?? null;

		if (!previousMessageId) {
			throw new Error('No previous message to base regeneration on');
		}

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
			(chunk: StructuredChunk) =>
				onStreamMessage(sessionId, chunk, replyId, previousMessageId, retryId),
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
		isResponding,
		ongoingStreaming,
		sessions,
		fetchChatModels,
		sendMessage,
		editMessage,
		regenerateMessage,
		fetchSessions,
		fetchMessages,
		renameSession,
		deleteSession,
		getConversation,
		getActiveMessages,
	};
});
