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
	ChatHubMessageDto,
} from '@n8n/api-types';
import type { StructuredChunk, CredentialsMap, ChatMessage, ChatConversation } from './chat.types';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const ongoingStreaming = ref<{ messageId: ChatMessageId; replyToMessageId: ChatMessageId }>();
	const isResponding = computed(() => ongoingStreaming.value !== undefined);

	const conversationsBySession = ref<Map<ChatSessionId, ChatConversation>>(new Map());
	const sessions = ref<ChatHubSessionDto[]>([]);

	const getConversation = (sessionId: ChatSessionId): ChatConversation | undefined =>
		conversationsBySession.value.get(sessionId);

	const getActiveMessages = (sessionId: ChatSessionId): ChatMessage[] => {
		const conversation = getConversation(sessionId);
		if (!conversation) return [];

		return conversation.activeMessageChain.map((id) => conversation.messages[id]).filter(Boolean);
	};

	function ensureConversation(sessionId: ChatSessionId): ChatConversation {
		if (!conversationsBySession.value.has(sessionId)) {
			conversationsBySession.value.set(sessionId, {
				messages: {},
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
		messages: Record<ChatMessageId, ChatMessage>,
		messageId: ChatMessageId | null,
	) {
		const chain: ChatMessageId[] = [];

		if (!messageId) {
			return chain;
		}

		let id: ChatMessageId | undefined;

		// Find the most recent descendant message starting from messageId...
		const stack = [messageId];
		let latest: ChatMessageId | null = null;

		while ((id = stack.pop())) {
			const message: ChatMessage = messages[id];
			if (!latest || message.createdAt > messages[latest].createdAt) {
				latest = id;
			}

			for (const responseId of message.responses) {
				stack.push(responseId);
			}
		}

		// ...then from there, traverse down the most recent responses
		if (!latest) {
			return chain;
		}

		let current: ChatMessageId | null = latest;
		const visited = new Set<ChatMessageId>();

		// Traverse from the selected message back to the root...
		while (current && !visited.has(current)) {
			chain.unshift(current);
			visited.add(current);
			current = messages[current]?.previousMessageId ?? null;
		}

		return chain;
	}

	function linkMessages(messages: ChatHubMessageDto[]) {
		const messagesGraph: Record<ChatMessageId, ChatMessage> = {};

		for (const message of messages) {
			messagesGraph[message.id] = {
				...message,
				responses: [],
				alternatives: [],
			};
		}

		for (const node of Object.values(messagesGraph)) {
			if (node.previousMessageId && messagesGraph[node.previousMessageId]) {
				messagesGraph[node.previousMessageId].responses.push(node.id);
			}
			if (node.retryOfMessageId && messagesGraph[node.retryOfMessageId]) {
				messagesGraph[node.retryOfMessageId].alternatives.push(node.id);
			}
			if (node.revisionOfMessageId && messagesGraph[node.revisionOfMessageId]) {
				messagesGraph[node.revisionOfMessageId].alternatives.push(node.id);
			}
		}

		const sortByRunThenTime = (first: ChatMessageId, second: ChatMessageId) => {
			const a = messagesGraph[first];
			const b = messagesGraph[second];

			// TODO: Disabled for now, messages retried don't get this at the FE before reload
			// if (a.runIndex !== b.runIndex) {
			// 	return a.runIndex - b.runIndex;
			// }

			if (a.createdAt !== b.createdAt) {
				return a.createdAt < b.createdAt ? -1 : 1;
			}

			return a.id < b.id ? -1 : 1;
		};

		// Second pass: Add cross-links for alternatives
		for (const node of Object.values(messagesGraph)) {
			if (!node.alternatives.includes(node.id)) {
				node.alternatives.push(node.id);
			}

			if (node.retryOfMessageId && messagesGraph[node.retryOfMessageId]) {
				node.alternatives.push(node.retryOfMessageId);
				for (const other of messagesGraph[node.retryOfMessageId].alternatives) {
					if (other !== node.id && !node.alternatives.includes(other)) {
						node.alternatives.push(other);
					}
				}
			}

			if (node.revisionOfMessageId && messagesGraph[node.revisionOfMessageId]) {
				node.alternatives.push(node.revisionOfMessageId);
				for (const other of messagesGraph[node.revisionOfMessageId].alternatives) {
					if (other !== node.id && !node.alternatives.includes(other)) {
						node.alternatives.push(other);
					}
				}
			}

			node.responses.sort(sortByRunThenTime);
			node.alternatives.sort(sortByRunThenTime);
		}

		return messagesGraph;
	}

	function addMessage(sessionId: ChatSessionId, message: ChatMessage) {
		const conversation = ensureConversation(sessionId);

		conversation.messages[message.id] = message;

		// TODO: Recomputing the entire graph shouldn't be needed here
		conversation.messages = linkMessages(Object.values(conversation.messages));
		conversation.activeMessageChain = computeActiveChain(conversation.messages, message.id);
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

		const messages = linkMessages(Object.values(conversation.messages));
		const latestMessage = Object.values(messages)
			.filter((m) => m.state === 'active')
			.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
			.pop();

		conversationsBySession.value.set(sessionId, {
			messages,
			activeMessageChain: computeActiveChain(messages, latestMessage?.id ?? null),
		});
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
			responses: [],
			alternatives: [],
		});
	}

	function onChunk(
		sessionId: string,
		messageId: string,
		chunk: string,
		_nodeId?: string,
		_runIndex?: number,
	) {
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
			model: model.model,
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
			responses: [],
			alternatives: [],
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
			responses: [],
			alternatives: [],
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

	function switchAlternative(sessionId: ChatSessionId, messageId: ChatMessageId) {
		const conversation = getConversation(sessionId);
		if (!conversation?.messages[messageId]) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		const message: ChatMessage = conversation.messages[messageId];

		// TODO: Do we want to persist this change to the backend?

		for (const alternativeId of message.alternatives) {
			const alternative = conversation.messages[alternativeId];
			if (alternative) {
				alternative.state = alternative.id === messageId ? 'active' : 'replaced';
			}
		}

		conversation.activeMessageChain = computeActiveChain(conversation.messages, messageId);
	}

	return {
		models,
		sessions,
		conversationsBySession,
		loadingModels,
		isResponding,
		ongoingStreaming,
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
		switchAlternative,
	};
});
