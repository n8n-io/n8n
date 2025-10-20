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
import type {
	StructuredChunk,
	CredentialsMap,
	ChatMessage,
	ChatConversation,
	ChatMessageGenerationError,
} from './chat.types';
import {
	createCredentials,
	createModelOrCredentialsMissingError,
	mergeErrorIntoChain,
} from './chat.utils';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const streamingMessageId = ref<string>();
	const sessions = ref<ChatHubSessionDto[]>([]);
	const lastError = shallowRef<ChatMessageGenerationError | null>(null);

	const isResponding = computed(() => streamingMessageId.value !== undefined);

	const conversationsBySession = ref<Map<ChatSessionId, ChatConversation>>(new Map());

	const getConversation = (sessionId: ChatSessionId): ChatConversation | undefined =>
		conversationsBySession.value.get(sessionId);

	const getActiveMessages = (sessionId: ChatSessionId): ChatMessage[] => {
		const conversation = getConversation(sessionId);
		if (!conversation) return [];

		const messagesFromChain = conversation.activeMessageChain
			.map((id) => conversation.messages[id])
			.filter(Boolean);

		return mergeErrorIntoChain(sessionId, messagesFromChain, lastError.value);
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
		model: ChatHubConversationModel,
		messageId: string,
		replyToMessageId: string,
		retryOfMessageId: string | null,
		_nodeId: string,
		_runIndex?: number,
	) {
		lastError.value = null;
		streamingMessageId.value = messageId;

		addMessage(sessionId, {
			id: messageId,
			sessionId,
			type: 'ai',
			name: 'AI',
			content: '',
			provider: model.provider,
			model: model.model,
			workflowId: null,
			executionId: null,
			state: 'success',
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

	function onEndMessage(
		sessionId: ChatSessionId,
		model: ChatHubConversationModel,
		promptId: ChatMessageId,
		replyId: ChatMessageId,
		_nodeId: string,
		_runIndex?: number,
		error?: Error,
	) {
		if (error) {
			lastError.value = {
				sessionId,
				model,
				promptId,
				replyId,
				error,
			};
		}
		streamingMessageId.value = undefined;
	}

	function onStreamMessage(
		sessionId: string,
		model: ChatHubConversationModel,
		message: StructuredChunk,
		messageId: string,
		replyToMessageId: string,
		retryOfMessageId: string | null,
		onBegin: () => void,
	) {
		const nodeId = message.metadata?.nodeId || 'unknown';
		const runIndex = message.metadata?.runIndex;

		switch (message.type) {
			case 'begin':
				onBeginMessage(
					sessionId,
					model,
					messageId,
					replyToMessageId,
					retryOfMessageId,
					nodeId,
					runIndex,
				);
				onBegin();
				break;
			case 'item':
				onChunk(sessionId, messageId, message.content ?? '', nodeId, runIndex);
				break;
			case 'end':
				onEndMessage(sessionId, model, replyToMessageId, messageId, nodeId, runIndex);
				break;
			case 'error':
				onEndMessage(
					sessionId,
					model,
					replyToMessageId,
					messageId,
					nodeId,
					runIndex,
					Error(message.content ?? 'Unknown error'),
				);
				break;
		}
	}

	async function onStreamDone() {
		streamingMessageId.value = undefined;
		await fetchSessions(); // update the conversation list
	}

	function onStreamError(
		sessionId: ChatSessionId,
		model: ChatHubConversationModel,
		replyId: ChatMessageId,
		promptId: ChatMessageId,
		error: Error,
	) {
		streamingMessageId.value = undefined;
		lastError.value = { sessionId, model, replyId, promptId, error };
	}

	async function resendMessage(
		prompt: ChatMessage,
		replyId: string,
		model: ChatHubConversationModel | null,
		credentialsMap: CredentialsMap,
	) {
		const promptId = prompt.id;
		const previousMessageId = prompt.previousMessageId;
		const credentialsId = model?.provider ? credentialsMap[model.provider] : null;

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId: prompt.sessionId,
				model,
				promptId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

		sendMessageApi(
			rootStore.restApiContext,
			{
				model,
				messageId: promptId,
				sessionId: prompt.sessionId,
				replyId,
				message: prompt.content,
				credentials: createCredentials(model, credentialsId),
				previousMessageId,
			},
			(chunk: StructuredChunk) =>
				onStreamMessage(prompt.sessionId, model, chunk, replyId, promptId, null, resolve),
			onStreamDone,
			(error) => onStreamError(prompt.sessionId, model, replyId, promptId, error),
		);

		return await promise;
	}

	async function sendMessage(
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
			state: 'success',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			responses: [],
			alternatives: [],
		});

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId,
				model,
				promptId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

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
			(chunk: StructuredChunk) =>
				onStreamMessage(sessionId, model, chunk, replyId, promptId, null, resolve),
			onStreamDone,
			(error) => onStreamError(sessionId, model, replyId, promptId, error),
		);

		return await promise;
	}

	async function editMessage(
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
			state: 'success',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			retryOfMessageId: null,
			revisionOfMessageId: editId,
			responses: [],
			alternatives: [],
		});

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId,
				model,
				promptId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

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
			(chunk: StructuredChunk) =>
				onStreamMessage(sessionId, model, chunk, replyId, promptId, null, resolve),
			onStreamDone,
			(error) => onStreamError(sessionId, model, replyId, promptId, error),
		);

		return await promise;
	}

	async function regenerateMessage(
		sessionId: ChatSessionId,
		retryId: ChatMessageId,
		model: ChatHubConversationModel | null,
		credentialsMap: CredentialsMap,
	) {
		const replyId = uuidv4();
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[retryId]?.previousMessageId ?? null;
		const credentialsId = model?.provider ? credentialsMap[model.provider] : null;

		if (lastError.value?.replyId === retryId && !conversation.messages[retryId]) {
			// Retrying a message that isn't sent out yet
			const prompt = conversation.messages[lastError.value.promptId];

			return await resendMessage(prompt, lastError.value.replyId, model, credentialsMap);
		}

		if (!previousMessageId) {
			throw new Error('No previous message to base regeneration on');
		}

		if (!model || !credentialsId) {
			lastError.value = {
				sessionId,
				model,
				promptId: previousMessageId,
				replyId,
				error: createModelOrCredentialsMissingError(model),
			};

			return;
		}

		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

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
				onStreamMessage(sessionId, model, chunk, replyId, previousMessageId, retryId, resolve),
			onStreamDone,
			(error) => onStreamError(sessionId, model, replyId, previousMessageId, error),
		);

		return await promise;
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
