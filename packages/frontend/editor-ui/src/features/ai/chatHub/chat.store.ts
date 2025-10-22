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
	updateConversationTitleApi,
	deleteConversationApi,
	stopGenerationApi,
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
import type { CredentialsMap, ChatMessage, ChatConversation } from './chat.types';
import type { StructuredChunk } from 'n8n-workflow';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const streamingMessageId = ref<string>();
	const sessions = ref<ChatHubSessionDto[]>([]);

	const isResponding = computed(() => streamingMessageId.value !== undefined);

	const conversationsBySession = ref<Map<ChatSessionId, ChatConversation>>(new Map());

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

		if (!latest) {
			return chain;
		}

		// ...and then walk back to the root following previousMessageId links
		let current: ChatMessageId | null = latest;
		const visited = new Set<ChatMessageId>();

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
			// TOOD: Do we even need runIndex at all?
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

	function replaceMessageContent(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		content: string,
	) {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];
		if (!message) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		message.content = content;
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

		// TOOD: Do we need 'state' column at all?
		const latestMessage = Object.values(messages)
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
		streamingMessageId.value = messageId;

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
			status: 'success',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId: replyToMessageId,
			retryOfMessageId,
			revisionOfMessageId: null,
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

	function onEndMessage() {
		streamingMessageId.value = undefined;
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
				onEndMessage();
				break;
			case 'error':
				if (streamingMessageId.value === messageId) {
					onChunk(
						sessionId,
						messageId,
						`Error: ${message.content ?? 'Unknown error'}`,
						nodeId,
						runIndex,
					);
					onEndMessage();
				}
				break;
		}
	}

	async function onStreamDone() {
		streamingMessageId.value = undefined;
		await fetchSessions(); // update the conversation list
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onStreamError(_e: Error) {
		streamingMessageId.value = undefined;
	}

	function sendMessage(
		sessionId: ChatSessionId,
		message: string,
		model: ChatHubConversationModel | null,
		credentials: ChatHubSendMessageRequest['credentials'] | null,
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
			model: model?.model ?? null,
			workflowId: null,
			executionId: null,
			status: 'success',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			responses: [],
			alternatives: [],
		});

		if (!model || !credentials) {
			addMessage(sessionId, {
				id: replyId,
				sessionId,
				type: 'ai',
				name: 'AI',
				content: '**ERROR:** Select a model to start a conversation.',
				provider: null,
				model: null,
				workflowId: null,
				executionId: null,
				status: 'error',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				previousMessageId: messageId,
				retryOfMessageId: null,
				revisionOfMessageId: null,
				responses: [],
				alternatives: [],
			});
			return;
		}

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
		content: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const messageId = uuidv4();
		const replyId = uuidv4();

		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[editId];
		const previousMessageId = message?.previousMessageId ?? null;

		if (message?.type === 'human') {
			addMessage(sessionId, {
				id: messageId,
				sessionId,
				type: 'human',
				name: message.name ?? 'User',
				content,
				provider: null,
				model: null,
				workflowId: null,
				executionId: null,
				status: 'success',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				previousMessageId,
				retryOfMessageId: null,
				revisionOfMessageId: editId,
				responses: [],
				alternatives: [],
			});
		} else if (message?.type === 'ai') {
			replaceMessageContent(sessionId, editId, content);
		}

		editMessageApi(
			rootStore.restApiContext,
			sessionId,
			editId,
			{
				model,
				messageId,
				replyId,
				message: content,
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
			sessionId,
			retryId,
			{
				model,
				replyId,
				credentials,
			},
			(chunk: StructuredChunk) =>
				onStreamMessage(sessionId, chunk, replyId, previousMessageId, retryId),
			onStreamDone,
			onStreamError,
		);
	}

	async function stopStreamingMessage(sessionId: ChatSessionId) {
		if (streamingMessageId.value) {
			const messageId = streamingMessageId.value;
			onEndMessage();
			await stopGenerationApi(rootStore.restApiContext, sessionId, messageId);
		}
	}

	async function renameSession(sessionId: ChatSessionId, title: string) {
		const updated = await updateConversationTitleApi(rootStore.restApiContext, sessionId, title);

		sessions.value = sessions.value.map((session) =>
			session.id === sessionId ? updated.session : session,
		);
	}

	async function deleteSession(sessionId: ChatSessionId) {
		await deleteConversationApi(rootStore.restApiContext, sessionId);

		sessions.value = sessions.value.filter((session) => session.id !== sessionId);
	}

	function switchAlternative(sessionId: ChatSessionId, messageId: ChatMessageId) {
		const conversation = getConversation(sessionId);
		if (!conversation?.messages[messageId]) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		// All we need to do is to switch active chain to one that includes the selected message.
		// Rest of the messages that possibly follow that message will be automatically chosen
		// from the branch that contains the latest message among messages descending from the selected one.
		conversation.activeMessageChain = computeActiveChain(conversation.messages, messageId);
	}

	return {
		models,
		sessions,
		conversationsBySession,
		loadingModels,
		isResponding,
		streamingMessageId,
		fetchChatModels,
		sendMessage,
		editMessage,
		regenerateMessage,
		stopStreamingMessage,
		fetchSessions,
		fetchMessages,
		renameSession,
		deleteSession,
		getConversation,
		getActiveMessages,
		switchAlternative,
	};
});
