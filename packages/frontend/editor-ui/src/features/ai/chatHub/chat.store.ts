import { defineStore } from 'pinia';
import { CHAT_STORE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
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
	fetchChatSettingsApi,
	fetchChatProviderSettingsApi,
	updateChatSettingsApi,
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
import {
	buildUiMessages,
	createSessionFromStreamingState,
	isLlmProviderModel,
	isMatchedAgent,
} from './chat.utils';
import { createAiMessageFromStreamingState, flattenModel } from './chat.utils';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { deepCopy, type INode } from 'n8n-workflow';
import type { AgentIconOrEmoji, ChatHubLLMProvider, ChatProviderSettingsDto } from '@n8n/api-types';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import { ResponseError } from '@n8n/rest-api-client';

export const useChatStore = defineStore(CHAT_STORE, () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const i18n = useI18n();

	const agents = ref<ChatModelsResponse>();
	const customAgents = ref<Partial<Record<string, ChatHubAgentDto>>>({});
	const sessions = ref<{
		byId: Partial<Record<string, ChatHubSessionDto>>;
		ids: string[] | null;
		hasMore: boolean;
		nextCursor: string | null;
	}>({ byId: {}, ids: null, hasMore: false, nextCursor: null });
	const sessionsLoadingMore = ref(false);

	const streaming = ref<ChatStreamingState>();
	const settingsLoading = ref(false);
	const settings = ref<Record<ChatHubLLMProvider, ChatProviderSettingsDto> | null>(null);
	const conversationsBySession = ref<Map<ChatSessionId, ChatConversation>>(new Map());

	const getConversation = (sessionId: ChatSessionId): ChatConversation | undefined =>
		conversationsBySession.value.get(sessionId);

	const getActiveMessages = (sessionId: ChatSessionId): ChatMessage[] => {
		const conversation = getConversation(sessionId);
		if (!conversation) return [];

		return buildUiMessages(sessionId, conversation, streaming.value);
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
		content?: string,
	) {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];
		if (!message) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		message.status = status;
		if (content) {
			message.content = content;
		}
		message.updatedAt = new Date().toISOString();
	}

	async function fetchAgents(credentialMap: CredentialsMap) {
		agents.value = await fetchChatModelsApi(rootStore.restApiContext, {
			credentials: credentialMap,
		});
		return agents.value;
	}

	async function fetchSessions(reset: boolean) {
		if (sessionsLoadingMore.value) {
			return;
		}

		if (
			!reset &&
			sessions.value &&
			!sessions.value.hasMore &&
			(sessions.value.ids ?? []).length > 0
		) {
			return;
		}

		if (!reset) {
			sessionsLoadingMore.value = true;
		}

		try {
			const cursor = reset ? undefined : (sessions.value?.nextCursor ?? undefined);
			const [response] = await Promise.all([
				fetchSessionsApi(rootStore.restApiContext, 40, cursor),
				new Promise((resolve) => setTimeout(resolve, 500)),
			]);

			if (reset || sessions.value.ids === null) {
				sessions.value.ids = [];
			}

			sessions.value.hasMore = response.hasMore;
			sessions.value.nextCursor = response.nextCursor;

			for (const session of response.data) {
				sessions.value.ids.push(session.id);
				sessions.value.byId[session.id] = session;
			}
		} finally {
			sessionsLoadingMore.value = false;
		}
	}

	async function fetchMoreSessions() {
		if (sessions.value?.hasMore && !sessionsLoadingMore.value) {
			await fetchSessions(false);
		}
	}

	async function fetchMessages(sessionId: string) {
		const { conversation, session } = await fetchMessagesApi(rootStore.restApiContext, sessionId);

		const messages = linkMessages(Object.values(conversation.messages));

		const latestMessage = Object.values(messages)
			.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
			.pop();

		conversationsBySession.value.set(sessionId, {
			messages,
			activeMessageChain: computeActiveChain(messages, latestMessage?.id ?? null),
		});
		sessions.value.byId[sessionId] = session;
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

				updateMessage(sessionId, chunk.metadata.messageId, 'error', chunk.content);
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

		// update the conversation list to reflect the new title
		await fetchSessions(true);
	}

	function getErrorMessageByStatusCode(
		statusCode: number | undefined,
		message: string | undefined,
	): string {
		const errorMessages: Record<number, string> = {
			[413]: i18n.baseText('chatHub.error.payloadTooLarge'),
			[400]: message ?? i18n.baseText('chatHub.error.badRequest'),
			[403]: i18n.baseText('chatHub.error.forbidden'),
			[500]: message
				? i18n.baseText('chatHub.error.serverErrorWithReason', {
						interpolate: { error: message },
					})
				: i18n.baseText('chatHub.error.serverError'),
		};

		return (
			(statusCode && errorMessages[statusCode]) || message || i18n.baseText('chatHub.error.unknown')
		);
	}

	function onStreamError(error: Error) {
		if (!streaming.value) {
			return;
		}

		const cause =
			error instanceof ResponseError
				? new Error(getErrorMessageByStatusCode(error.httpStatusCode, error.message))
				: error.message.includes('Failed to fetch')
					? new Error(i18n.baseText('chatHub.error.noConnection'))
					: error;

		toast.showError(cause, i18n.baseText('chatHub.error.sendMessageFailed'));

		streaming.value = undefined;
	}

	async function sendMessage(
		sessionId: ChatSessionId,
		message: string,
		agent: ChatModelDto,
		credentials: ChatHubSendMessageRequest['credentials'],
		tools: INode[],
		files: File[] = [],
	) {
		const messageId = uuidv4();
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.activeMessageChain.length
			? conversation.activeMessageChain[conversation.activeMessageChain.length - 1]
			: null;

		const binaryData = await Promise.all(files.map(convertFileToBinaryData));
		const attachments = binaryData.map((attachment) => ({
			fileName: attachment.fileName ?? 'unnamed file',
			mimeType: attachment.mimeType,
			data: attachment.data,
		}));

		addMessage(sessionId, {
			id: messageId,
			sessionId,
			type: 'human',
			name: 'User',
			content: message,
			provider: null,
			model: isLlmProviderModel(agent.model) ? agent.model.model : null,
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
			attachments,
		});

		streaming.value = {
			promptId: messageId,
			sessionId,
			retryOfMessageId: null,
			tools,
			agent,
		};

		if (!sessions.value.byId[sessionId]) {
			sessions.value.byId[sessionId] = createSessionFromStreamingState(streaming.value);
			if (!sessions.value.ids) {
				sessions.value.ids = [];
			}
			sessions.value.ids.unshift(sessionId);
		}

		sendMessageApi(
			rootStore.restApiContext,
			{
				model: agent.model,
				messageId,
				sessionId,
				message,
				credentials,
				previousMessageId,
				tools,
				attachments,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);

		telemetry.track('User sent chat hub message', {
			...flattenModel(agent.model),
			is_custom: agent.model.provider === 'custom-agent',
			chat_session_id: sessionId,
		});
	}

	function editMessage(
		sessionId: ChatSessionId,
		editId: ChatMessageId,
		content: string,
		agent: ChatModelDto,
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
				attachments: message.attachments ?? null,
			});
		} else if (message?.type === 'ai') {
			replaceMessageContent(sessionId, editId, content);
		}

		streaming.value = {
			promptId,
			sessionId,
			agent,
			retryOfMessageId: null,
			tools: [],
		};

		editMessageApi(
			rootStore.restApiContext,
			sessionId,
			editId,
			{
				model: agent.model,
				messageId: promptId,
				message: content,
				credentials,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);

		telemetry.track('User edited chat hub message', {
			...flattenModel(agent.model),
			is_custom: agent.model.provider === 'custom-agent',
			chat_session_id: sessionId,
			chat_message_id: editId,
		});
	}

	function regenerateMessage(
		sessionId: ChatSessionId,
		retryId: ChatMessageId,
		agent: ChatModelDto,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[retryId]?.previousMessageId ?? null;

		if (!previousMessageId) {
			throw new Error('No previous message to base regeneration on');
		}

		streaming.value = {
			promptId: retryId,
			sessionId,
			agent,
			retryOfMessageId: retryId,
			tools: [],
		};

		regenerateMessageApi(
			rootStore.restApiContext,
			sessionId,
			retryId,
			{
				model: agent.model,
				credentials,
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			onStreamMessage,
			onStreamDone,
			onStreamError,
		);

		telemetry.track('User regenerated chat hub message', {
			...flattenModel(agent.model),
			is_custom: agent.model.provider === 'custom-agent',
			chat_session_id: sessionId,
			chat_message_id: retryId,
		});
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
		const session = sessions.value.byId[sessionId];

		if (session) {
			sessions.value.byId[sessionId] = {
				...session,
				...toUpdate,
			};
		}
	}

	async function updateToolsInSession(sessionId: ChatSessionId, tools: INode[]) {
		const session = sessions.value?.byId[sessionId];
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

	async function updateSessionModel(
		sessionId: ChatSessionId,
		model: ChatHubConversationModel,
		agentName: string,
	) {
		await updateConversationApi(rootStore.restApiContext, sessionId, { model });
		updateSession(sessionId, { ...model, agentName });
	}

	async function deleteSession(sessionId: ChatSessionId) {
		await deleteConversationApi(rootStore.restApiContext, sessionId);

		delete sessions.value.byId[sessionId];
		sessions.value.ids = sessions.value.ids?.filter((id) => id !== sessionId) ?? null;
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

	async function fetchCustomAgent(agentId: string) {
		const customAgent = await fetchAgentApi(rootStore.restApiContext, agentId);

		customAgents.value[agentId] = customAgent;
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
		const customAgent = await createAgentApi(rootStore.restApiContext, payload);
		const baseModel = agents.value?.[customAgent.provider]?.models.find(
			(model) => model.name === customAgent.model,
		);
		const agent: ChatModelDto = {
			model: {
				provider: 'custom-agent' as const,
				agentId: customAgent.id,
			},
			name: customAgent.name,
			description: customAgent.description ?? null,
			icon: customAgent.icon,
			createdAt: customAgent.createdAt,
			updatedAt: customAgent.updatedAt,
			projectName: null,
			metadata: baseModel?.metadata ?? {
				capabilities: { functionCalling: false },
				inputModalities: [],
				available: true,
			},
		};
		agents.value?.['custom-agent'].models.push(agent);
		customAgents.value[customAgent.id] = customAgent;

		await fetchAgents(credentials);

		telemetry.track('User created agent', { ...flattenModel(payload) });

		return agent;
	}

	async function updateCustomAgent(
		agentId: string,
		payload: ChatHubUpdateAgentRequest,
		credentials: CredentialsMap,
	): Promise<ChatHubAgentDto> {
		const customAgent = await updateAgentApi(rootStore.restApiContext, agentId, payload);

		// Update the agent in models as well
		if (agents.value?.['custom-agent']) {
			agents.value['custom-agent'].models = agents.value['custom-agent'].models.map((model) =>
				'agentId' in model && model.agentId === agentId
					? { ...model, name: customAgent.name }
					: model,
			);
		}

		customAgents.value[agentId] = customAgent;

		await fetchAgents(credentials);

		return customAgent;
	}

	async function deleteCustomAgent(agentId: string, credentials: CredentialsMap) {
		await deleteAgentApi(rootStore.restApiContext, agentId);

		// Remove the agent from models as well
		if (agents.value?.['custom-agent']) {
			agents.value['custom-agent'].models = agents.value['custom-agent'].models.filter(
				(model) => !('agentId' in model) || model.agentId !== agentId,
			);
		}

		delete customAgents.value[agentId];

		await fetchAgents(credentials);
	}

	function getAgent(
		model: ChatHubConversationModel,
		fallback?: Partial<{ name: string | null; icon: AgentIconOrEmoji | null }>,
	): ChatModelDto {
		const agent = agents.value?.[model.provider]?.models.find((agent) =>
			isMatchedAgent(agent, model),
		);

		if (agent) {
			return agent;
		}

		return {
			model,
			name: fallback?.name ?? '',
			description: null,
			icon: fallback?.icon ?? null,
			createdAt: null,
			updatedAt: null,
			projectName: null,
			// Assume file attachment and tools are supported
			metadata: {
				inputModalities: ['text', 'file'],
				capabilities: {
					functionCalling: true,
				},
				available: true,
			},
		};
	}

	async function fetchAllChatSettings() {
		try {
			settingsLoading.value = true;
			settings.value = await fetchChatSettingsApi(rootStore.restApiContext);
		} finally {
			settingsLoading.value = false;
		}

		return settings.value;
	}

	async function fetchProviderSettings(provider: ChatHubLLMProvider) {
		const providerSettings = await fetchChatProviderSettingsApi(rootStore.restApiContext, provider);

		if (settings.value) {
			settings.value[provider] = deepCopy(providerSettings);
		}

		return providerSettings;
	}

	async function updateProviderSettings(updated: ChatProviderSettingsDto) {
		if (!updated.enabled) {
			updated.allowedModels = [];
		}

		const saved = await updateChatSettingsApi(rootStore.restApiContext, updated);

		if (settings.value) {
			settings.value[updated.provider] = deepCopy(saved);
		}

		return saved;
	}

	return {
		/**
		 * models and agents
		 */
		agents: computed(() => agents.value ?? emptyChatModelsResponse),
		agentsReady: computed(() => agents.value !== undefined),
		customAgents,
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
		sessions,
		sessionsReady: computed(() => sessions.value.ids !== null),
		sessionsLoading: computed(() => sessionsLoadingMore.value),
		fetchSessions,
		fetchMoreSessions,
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

		/**
		 * settings
		 */
		settings,
		settingsLoading,
		fetchAllChatSettings,
		fetchProviderSettings,
		updateProviderSettings,
	};
});
