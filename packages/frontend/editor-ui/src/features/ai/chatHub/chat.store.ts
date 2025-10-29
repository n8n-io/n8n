import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { ref } from 'vue';
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
	fetchSingleConversationApi,
	fetchAgentsApi,
	fetchAgentApi,
	createAgentApi,
	updateAgentApi,
	deleteAgentApi,
	updateConversationApi,
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
	ChatHubAgentDto,
	ChatHubCreateAgentRequest,
	ChatHubUpdateAgentRequest,
	EnrichedStructuredChunk,
	ChatHubMessageStatus,
} from '@n8n/api-types';
import type { CredentialsMap, ChatMessage, ChatConversation } from './chat.types';
import { retry } from '@n8n/utils/retry';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const models = ref<ChatModelsResponse>();
	const loadingModels = ref(false);
	const sessions = ref<ChatHubSessionDto[]>([]);
	const agents = ref<ChatHubAgentDto[]>([]);
	const currentEditingAgent = ref<ChatHubAgentDto | null>(null);

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

	function lastMessage(sessionId: ChatSessionId): ChatMessage | null {
		const conversation = getConversation(sessionId);
		if (!conversation || conversation.activeMessageChain.length === 0) {
			return null;
		}

		const messageId = conversation.activeMessageChain[conversation.activeMessageChain.length - 1];
		return conversation.messages[messageId] ?? null;
	}

	function isResponding(sessionId: ChatSessionId) {
		const last = lastMessage(sessionId);
		return last?.status === 'running';
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

		return message;
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

	function updateMessage(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		status: ChatHubMessageStatus,
	) {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];
		if (!message) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		message.status = status;
		message.updatedAt = new Date().toISOString();
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
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		previousMessageId: ChatMessageId | null,
		retryOfMessageId: ChatMessageId | null,
		status: ChatHubMessageStatus = 'running',
	) {
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
			agentId: null,
			status,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			retryOfMessageId,
			revisionOfMessageId: null,
			responses: [],
			alternatives: [],
		});
	}

	function ensureMessage(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		previousMessageId: ChatMessageId | null,
		retryOfMessageId: ChatMessageId | null,
	): ChatMessage {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];
		if (message) {
			return message;
		}

		return addMessage(sessionId, {
			id: messageId,
			sessionId,
			type: 'ai',
			name: 'AI',
			content: '',
			provider: null,
			model: null,
			workflowId: null,
			executionId: null,
			status: 'running',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			retryOfMessageId,
			revisionOfMessageId: null,
			responses: [],
			alternatives: [],
			agentId: null,
		});
	}

	function onChunk(sessionId: string, messageId: string, chunk: string) {
		appendMessage(sessionId, messageId, chunk);
	}

	function onEndMessage(sessionId: ChatSessionId, messageId: ChatMessageId) {
		updateMessage(sessionId, messageId, 'success');
	}

	function onStreamMessage(sessionId: string, chunk: EnrichedStructuredChunk) {
		const { messageId, previousMessageId, retryOfMessageId } = chunk.metadata;

		switch (chunk.type) {
			case 'begin':
				onBeginMessage(sessionId, messageId, previousMessageId, retryOfMessageId);
				break;
			case 'item':
				onChunk(sessionId, messageId, chunk.content ?? '');
				break;
			case 'end':
				onEndMessage(sessionId, messageId);
				break;
			case 'error': {
				// Ignore errors after cancellation
				const message = ensureMessage(sessionId, messageId, previousMessageId, retryOfMessageId);

				if (message.status === 'cancelled') {
					return;
				}

				updateMessage(sessionId, messageId, 'error');
				onChunk(sessionId, messageId, message.content ?? '');
				break;
			}
		}
	}

	async function onStreamDone(sessionId: ChatSessionId) {
		// wait up to 3 seconds until conversation title is generated
		await retry(
			async () => {
				const session = await fetchSingleConversationApi(rootStore.restApiContext, sessionId);

				return session.session.title !== 'New Chat';
			},
			1000,
			3,
		);

		// update the conversation list
		await fetchSessions();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function onStreamError(sessionId: ChatSessionId, _e: Error) {
		const conversation = getConversation(sessionId);
		if (!conversation) {
			return;
		}

		// TODO: Not sure if we want to mark all running messages as errored?
		for (const messageId of conversation.activeMessageChain) {
			const message = conversation.messages[messageId];
			if (message.status === 'running') {
				updateMessage(sessionId, messageId, 'error');
			}
		}
	}

	function sendMessage(
		sessionId: ChatSessionId,
		message: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const messageId = uuidv4();
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
			model: model.provider === 'n8n' || model.provider === 'custom-agent' ? null : model.model,
			workflowId: null,
			executionId: null,
			agentId: null,
			status: 'success',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			previousMessageId,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			responses: [],
			alternatives: [],
		});

		sendMessageApi(
			rootStore.restApiContext,
			{
				model,
				messageId,
				sessionId,
				message,
				credentials,
				previousMessageId,
			},
			(chunk: EnrichedStructuredChunk) => onStreamMessage(sessionId, chunk),
			async () => await onStreamDone(sessionId),
			(e) => onStreamError(sessionId, e),
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
				agentId: null,
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
				message: content,
				credentials,
			},
			(chunk: EnrichedStructuredChunk) => onStreamMessage(sessionId, chunk),
			async () => await onStreamDone(sessionId),
			(e) => onStreamError(sessionId, e),
		);
	}

	function regenerateMessage(
		sessionId: ChatSessionId,
		retryId: ChatMessageId,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
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
				credentials,
			},
			(chunk: EnrichedStructuredChunk) => onStreamMessage(sessionId, chunk),
			async () => await onStreamDone(sessionId),
			(e) => onStreamError(sessionId, e),
		);
	}

	async function stopStreamingMessage(sessionId: ChatSessionId) {
		const currentMessage = lastMessage(sessionId);

		if (currentMessage && currentMessage.status === 'running') {
			updateMessage(sessionId, currentMessage.id, 'cancelled');
			await stopGenerationApi(rootStore.restApiContext, sessionId, currentMessage.id);
		}
	}

	function updateSession(sessionId: ChatSessionId, toUpdate: Partial<ChatHubSessionDto>) {
		sessions.value = sessions.value.map((session) =>
			session.id === sessionId
				? {
						...session,
						...toUpdate,
					}
				: session,
		);
	}

	async function renameSession(sessionId: ChatSessionId, title: string) {
		const updated = await updateConversationTitleApi(rootStore.restApiContext, sessionId, title);

		updateSession(sessionId, updated.session);
	}

	async function updateSessionModel(sessionId: ChatSessionId, model: ChatHubConversationModel) {
		await updateConversationApi(rootStore.restApiContext, sessionId, model);
		updateSession(sessionId, model);
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

	async function fetchAgents() {
		agents.value = await fetchAgentsApi(rootStore.restApiContext);
	}

	async function fetchAgent(agentId: string): Promise<ChatHubAgentDto> {
		const agent = await fetchAgentApi(rootStore.restApiContext, agentId);
		currentEditingAgent.value = agent;
		return agent;
	}

	function getAgent(agentId: string) {
		return models.value?.['custom-agent'].models.find(
			(model) => 'agentId' in model && model.agentId === agentId,
		);
	}

	async function createAgent(
		payload: ChatHubCreateAgentRequest,
	): Promise<ChatHubConversationModel> {
		const agent = await createAgentApi(rootStore.restApiContext, payload);
		agents.value.push(agent);
		const agentModel = {
			model: {
				provider: 'custom-agent' as const,
				agentId: agent.id,
			},
			name: agent.name,
			description: agent.description ?? null,
		};
		models.value?.['custom-agent'].models.push(agentModel);

		return agentModel.model;
	}

	async function updateAgent(
		agentId: string,
		payload: ChatHubUpdateAgentRequest,
	): Promise<ChatHubAgentDto> {
		const agent = await updateAgentApi(rootStore.restApiContext, agentId, payload);
		agents.value = agents.value.map((a) => (a.id === agentId ? agent : a));

		// Update the agent in models as well
		if (models.value?.['custom-agent']) {
			models.value['custom-agent'].models = models.value['custom-agent'].models.map((model) =>
				'agentId' in model && model.agentId === agentId ? { ...model, name: agent.name } : model,
			);
		}

		return agent;
	}

	async function deleteAgent(agentId: string) {
		await deleteAgentApi(rootStore.restApiContext, agentId);
		agents.value = agents.value.filter((a) => a.id !== agentId);

		// Remove the agent from models as well
		if (models.value?.['custom-agent']) {
			models.value['custom-agent'].models = models.value['custom-agent'].models.filter(
				(model) => !('agentId' in model) || model.agentId !== agentId,
			);
		}
	}

	function getModel(identifier: ChatHubConversationModel) {
		if (!models.value) return;

		return models.value[identifier.provider].models.find((m) => {
			if (identifier.provider === 'n8n') {
				return m.model.provider === 'n8n' && m.model.workflowId === identifier.workflowId;
			} else if (identifier.provider === 'custom-agent') {
				return m.model.provider === 'custom-agent' && m.model.agentId === identifier.agentId;
			} else {
				return m.model.provider === identifier.provider && m.model.model === identifier.model;
			}
		});
	}

	return {
		models,
		getModel,
		sessions,
		agents,
		currentEditingAgent,
		conversationsBySession,
		loadingModels,
		isResponding,
		getAgent,
		lastMessage,
		fetchChatModels,
		updateSessionModel,
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
		fetchAgents,
		fetchAgent,
		createAgent,
		updateAgent,
		deleteAgent,
	};
});
