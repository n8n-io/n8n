import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref, shallowRef } from 'vue';
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
} from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	type ChatMessageId,
	type ChatSessionId,
	type ChatHubMessageDto,
} from '@n8n/api-types';
import type { StructuredChunk, CredentialsMap, ChatMessage, ChatConversation } from './chat.types';
import { createCredentials, createModelOrCredentialsMissingError } from './chat.utils';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const streamingMessageId = ref<string>();
	const sessions = ref<ChatHubSessionDto[]>([]);
	const lastError = shallowRef<{
		sessionId: ChatSessionId;
		promptId: ChatMessageId;
		replyId: ChatMessageId;
		error: Error;
	} | null>(null);

	const isResponding = computed(() => streamingMessageId.value !== undefined);

	const conversationsBySession = ref<Map<ChatSessionId, ChatConversation>>(new Map());

	const getConversation = (sessionId: ChatSessionId): ChatConversation | undefined =>
		conversationsBySession.value.get(sessionId);

	const getActiveMessages = (sessionId: ChatSessionId): ChatMessage[] => {
		const conversation = getConversation(sessionId);
		if (!conversation) return [];

		const persistedMessages = conversation.activeMessageChain
			.map((id) => conversation.messages[id])
			.filter(Boolean);

		const error = lastError.value?.sessionId === sessionId ? lastError.value : undefined;

		if (!error) {
			return persistedMessages;
		}

		return persistedMessages.flatMap<ChatMessage>((message) => {
			if (message.id === error.replyId) {
				// This could happen when streaming raises error in the middle
				// TODO: maybe preserve message and append error?
				return [];
			}

			if (error.promptId === message.id) {
				return [
					message,
					{
						id: error.replyId,
						sessionId,
						type: 'ai',
						name: 'AI',
						content: `**ERROR:** ${error.error.message}`,
						provider: null,
						model: null,
						workflowId: null,
						executionId: null,
						state: 'active',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
						previousMessageId: message.id,
						turnId: null,
						retryOfMessageId: null,
						revisionOfMessageId: null,
						runIndex: 0,
						responses: [],
						alternatives: [],
					},
				];
			}

			return [message];
		});
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
			// TODO: Do we even need runIndex at all?
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

		// TODO: Do we need 'state' column at all?
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
		streamingMessageId.value = undefined;
		await fetchSessions(); // update the conversation list
	}

	function onStreamError(
		sessionId: ChatSessionId,
		replyId: ChatMessageId,
		promptId: ChatMessageId,
		error: Error,
	) {
		streamingMessageId.value = undefined;
		lastError.value = { sessionId, replyId, promptId, error };
	}

	function sendMessage(
		sessionId: ChatSessionId,
		message: string,
		model: ChatHubConversationModel | null,
		credentialsMap: CredentialsMap,
	) {
		const promptId = uuidv4();
		const replyId = uuidv4();
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.activeMessageChain.length
			? conversation.activeMessageChain[conversation.activeMessageChain.length - 1]
			: null;
		const credentialsId = model?.provider ? credentialsMap[model.provider] : null;

		addMessage(sessionId, {
			id: promptId,
			sessionId,
			type: 'human',
			name: 'User',
			content: message,
			provider: null,
			model: model?.model ?? null,
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

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId,
				promptId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		sendMessageApi(
			rootStore.restApiContext,
			{
				model,
				messageId: promptId,
				sessionId,
				replyId,
				message,
				credentials: createCredentials(model, credentialsId),
				previousMessageId,
			},
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, promptId, null),
			onStreamDone,
			(error) => onStreamError(sessionId, replyId, promptId, error),
		);
	}

	function editMessage(
		sessionId: ChatSessionId,
		editId: ChatMessageId,
		message: string,
		model: ChatHubConversationModel | null,
		credentialsMap: CredentialsMap,
	) {
		const promptId = uuidv4();
		const replyId = uuidv4();

		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[editId]?.previousMessageId ?? null;
		const credentialsId = model?.provider ? credentialsMap[model.provider] : null;

		addMessage(sessionId, {
			id: promptId,
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

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId,
				promptId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		editMessageApi(
			rootStore.restApiContext,
			{
				model,
				messageId: promptId,
				sessionId,
				replyId,
				editId,
				message,
				credentials: createCredentials(model, credentialsId),
			},
			(chunk: StructuredChunk) => onStreamMessage(sessionId, chunk, replyId, promptId, null),
			onStreamDone,
			(error) => onStreamError(sessionId, replyId, promptId, error),
		);
	}

	function regenerateMessage(
		sessionId: ChatSessionId,
		retryId: ChatMessageId,
		model: ChatHubConversationModel | null,
		credentialsMap: CredentialsMap,
	) {
		const replyId = uuidv4();
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[retryId]?.previousMessageId ?? null;
		const credentialsId = model?.provider ? credentialsMap[model.provider] : null;

		if (!previousMessageId) {
			throw new Error('No previous message to base regeneration on');
		}

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId,
				promptId: previousMessageId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		regenerateMessageApi(
			rootStore.restApiContext,
			{
				model,
				sessionId,
				retryId,
				replyId,
				credentials: createCredentials(model, credentialsId),
			},
			(chunk: StructuredChunk) =>
				onStreamMessage(sessionId, chunk, replyId, previousMessageId, retryId),
			onStreamDone,
			(error) => onStreamError(sessionId, replyId, previousMessageId, error),
		);
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
		lastError,
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
