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
	fetchSingleConversationApi,
	fetchAgentApi,
	createAgentApi,
	updateAgentApi,
	deleteAgentApi,
	updateConversationApi,
} from './chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	emptyChatModelsResponse,
	type ChatHubConversationModel,
	type ChatHubSendMessageRequest,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	type ChatMessageId,
	type ChatSessionId,
	type ChatHubMessageDto,
	type ChatHubAgentDto,
	type ChatHubCreateAgentRequest,
	type ChatHubUpdateAgentRequest,
	type EnrichedStructuredChunk,
	type ChatHubMessageStatus,
	type ChatModelDto,
} from '@n8n/api-types';
import type {
	CredentialsMap,
	ChatMessage,
	ChatConversation,
	ChatStreamingState,
} from './chat.types';
import { retry } from '@n8n/utils/retry';
import { isMatchedAgent } from './chat.utils';
import { createAiMessageFromStreamingState, flattenModel } from './chat.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { type INode } from 'n8n-workflow';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const telemetry = useTelemetry();
	const agents = ref<ChatModelsResponse>();
	const sessions = ref<ChatHubSessionDto[]>();
	const currentEditingAgent = ref<ChatHubAgentDto | null>(null);
	const streaming = ref<ChatStreamingState>();

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

	async function fetchAgents(credentialMap: CredentialsMap) {
		agents.value = await fetchChatModelsApi(rootStore.restApiContext, {
			credentials: credentialMap,
		});
		return agents.value;
	}

	async function fetchSessions() {
		sessions.value = await fetchSessionsApi(rootStore.restApiContext);
	}

	async function fetchMessages(sessionId: string) {
		const { conversation } = await fetchMessagesApi(rootStore.restApiContext, sessionId);

		const messages = linkMessages(Object.values(conversation.messages));

		const latestMessage = Object.values(messages)
			.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
			.pop();

		conversationsBySession.value.set(sessionId, {
			messages,
			activeMessageChain: computeActiveChain(messages, latestMessage?.id ?? null),
		});
	}

	function onBeginMessage() {
		if (!streaming.value?.messageId) {
			return;
		}

		const message = createAiMessageFromStreamingState(
			streaming.value.sessionId,
			streaming.value.messageId,
			streaming.value,
		);

		addMessage(streaming.value.sessionId, message);

		if (sessions.value?.some((session) => session.id === streaming.value?.sessionId)) {
			return;
		}

		sessions.value = [
			...(sessions.value ?? []),
			{
				id: streaming.value.sessionId,
				title: 'New Chat',
				ownerId: '',
				lastMessageAt: new Date().toISOString(),
				credentialId: null,
				agentName: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				tools: [],
				...flattenModel(streaming.value.model),
			},
		];
	}

	function ensureMessage(sessionId: ChatSessionId, messageId: ChatMessageId): ChatMessage {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];

		if (message) {
			return message;
		}

		const newMessage = createAiMessageFromStreamingState(sessionId, messageId, streaming.value);

		return addMessage(sessionId, newMessage);
	}

	function onChunk(chunk: string) {
		if (streaming.value?.messageId) {
			appendMessage(streaming.value.sessionId, streaming.value.messageId, chunk);
		}
	}

	function onEndMessage() {
		if (streaming.value?.messageId) {
			updateMessage(streaming.value.sessionId, streaming.value.messageId, 'success');
		}
	}

	function onStreamMessage(chunk: EnrichedStructuredChunk) {
		if (!streaming.value) {
			return;
		}

		const { sessionId } = streaming.value;

		streaming.value = { ...streaming.value, ...chunk.metadata };

		switch (chunk.type) {
			case 'begin':
				onBeginMessage();
				break;
			case 'item':
				onChunk(chunk.content ?? '');
				break;
			case 'end':
				onEndMessage();
				break;
			case 'error': {
				// Ignore errors after cancellation
				const message = ensureMessage(sessionId, chunk.metadata.messageId);

				if (message.status === 'cancelled') {
					return;
				}

				updateMessage(sessionId, chunk.metadata.messageId, 'error');
				onChunk(message.content ?? '');
				break;
			}
		}
	}

	async function onStreamDone() {
		if (!streaming.value) {
			return;
		}

		const { sessionId } = streaming.value;

		streaming.value = undefined;

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

	function onStreamError() {
		if (!streaming.value) {
			return;
		}

		const { sessionId } = streaming.value;

		streaming.value = undefined;

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
		tools: INode[],
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

		streaming.value = { promptId: messageId, sessionId, model };

		sendMessageApi(
			rootStore.restApiContext,
			{
				model,
				messageId,
				sessionId,
				message,
				credentials,
				previousMessageId,
				tools,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);

		telemetry.track('User sent chat hub message', {
			...flattenModel(model),
			is_custom: model.provider === 'custom-agent',
			chat_session_id: sessionId,
		});
	}

	function editMessage(
		sessionId: ChatSessionId,
		editId: ChatMessageId,
		content: string,
		model: ChatHubConversationModel,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const promptId = uuidv4();

		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[editId];
		const previousMessageId = message?.previousMessageId ?? null;

		if (message?.type === 'human') {
			addMessage(sessionId, {
				id: promptId,
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

		streaming.value = { promptId, sessionId, model };

		editMessageApi(
			rootStore.restApiContext,
			sessionId,
			editId,
			{
				model,
				messageId: promptId,
				message: content,
				credentials,
			},
			onStreamMessage,
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
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[retryId]?.previousMessageId ?? null;

		if (!previousMessageId) {
			throw new Error('No previous message to base regeneration on');
		}

		streaming.value = { promptId: retryId, sessionId, model };

		regenerateMessageApi(
			rootStore.restApiContext,
			sessionId,
			retryId,
			{
				model,
				credentials,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);
	}

	async function stopStreamingMessage(sessionId: ChatSessionId) {
		const currentMessage = lastMessage(sessionId);

		if (currentMessage && currentMessage.status === 'running') {
			updateMessage(sessionId, currentMessage.id, 'cancelled');
			await stopGenerationApi(rootStore.restApiContext, sessionId, currentMessage.id);
			streaming.value = undefined;
		}
	}

	function updateSession(sessionId: ChatSessionId, toUpdate: Partial<ChatHubSessionDto>) {
		sessions.value = sessions.value?.map((session) =>
			session.id === sessionId
				? {
						...session,
						...toUpdate,
					}
				: session,
		);
	}

	async function updateToolsInSession(sessionId: ChatSessionId, tools: INode[]) {
		const session = sessions.value?.find((s) => s.id === sessionId);
		if (!session) {
			throw new Error(`Session with ID ${sessionId} not found`);
		}

		const updated = await updateConversationApi(rootStore.restApiContext, sessionId, {
			tools,
		});

		updateSession(sessionId, updated.session);
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

		sessions.value = sessions.value?.filter((session) => session.id !== sessionId);
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

	async function fetchCustomAgent(agentId: string): Promise<ChatHubAgentDto> {
		const agent = await fetchAgentApi(rootStore.restApiContext, agentId);
		currentEditingAgent.value = agent;
		return agent;
	}

	function getCustomAgent(agentId: string) {
		return agents.value?.['custom-agent'].models.find(
			(model) => 'agentId' in model && model.agentId === agentId,
		);
	}

	async function createCustomAgent(
		payload: ChatHubCreateAgentRequest,
		credentials: CredentialsMap,
	): Promise<ChatModelDto> {
		const agent = await createAgentApi(rootStore.restApiContext, payload);
		const agentModel = {
			model: {
				provider: 'custom-agent' as const,
				agentId: agent.id,
			},
			name: agent.name,
			description: agent.description ?? null,
			createdAt: agent.createdAt,
			updatedAt: agent.updatedAt,
			tools: agent.tools,
		};
		agents.value?.['custom-agent'].models.push(agentModel);

		await fetchAgents(credentials);

		telemetry.track('User created agent', { ...flattenModel(payload) });

		return agentModel;
	}

	async function updateCustomAgent(
		agentId: string,
		payload: ChatHubUpdateAgentRequest,
		credentials: CredentialsMap,
	): Promise<ChatHubAgentDto> {
		const agent = await updateAgentApi(rootStore.restApiContext, agentId, payload);

		// Update the agent in models as well
		if (agents.value?.['custom-agent']) {
			agents.value['custom-agent'].models = agents.value['custom-agent'].models.map((model) =>
				'agentId' in model && model.agentId === agentId ? { ...model, name: agent.name } : model,
			);
		}

		await fetchAgents(credentials);

		return agent;
	}

	async function deleteCustomAgent(agentId: string, credentials: CredentialsMap) {
		await deleteAgentApi(rootStore.restApiContext, agentId);

		// Remove the agent from models as well
		if (agents.value?.['custom-agent']) {
			agents.value['custom-agent'].models = agents.value['custom-agent'].models.filter(
				(model) => !('agentId' in model) || model.agentId !== agentId,
			);
		}

		await fetchAgents(credentials);
	}

	function getAgent(model: ChatHubConversationModel) {
		if (!agents.value) return;

		const agent = agents.value[model.provider].models.find((agent) => isMatchedAgent(agent, model));

		if (!agent) {
			if (model.provider === 'custom-agent' || model.provider === 'n8n') {
				return;
			}

			// Allow custom models chosen by ID even if they are not in the fetched list
			return {
				model: {
					provider: model.provider,
					model: model.model,
				},
				name: model.model,
				description: null,
				createdAt: null,
				updatedAt: null,
			};
		}

		return agent;
	}

	return {
		/**
		 * models and agents
		 */
		agents: computed(() => agents.value ?? emptyChatModelsResponse),
		agentsReady: computed(() => agents.value !== undefined),
		currentEditingAgent,
		getAgent,
		fetchAgents,
		getCustomAgent,
		fetchCustomAgent,
		createCustomAgent,
		updateCustomAgent,
		deleteCustomAgent,

		/**
		 * conversations
		 */
		sessions: computed(() => sessions.value ?? []),
		sessionsReady: computed(() => sessions.value !== undefined),
		fetchSessions,
		renameSession,
		updateSessionModel,
		deleteSession,
		updateToolsInSession,

		/**
		 * conversation
		 */
		getConversation,
		fetchMessages,
		getActiveMessages,
		switchAlternative,
		lastMessage,

		/**
		 * messaging
		 */
		streaming,
		isResponding,
		sendMessage,
		editMessage,
		regenerateMessage,
		stopStreamingMessage,
	};
});
