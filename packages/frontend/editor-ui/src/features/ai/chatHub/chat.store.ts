import { defineStore } from 'pinia';
import { CHAT_SESSIONS_PAGE_SIZE } from './constants';
import { computed, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { useI18n } from '@n8n/i18n';
import {
	fetchChatModelsApi,
	sendMessageApi,
	editMessageApi,
	regenerateMessageApi,
	reconnectToSessionApi,
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
	fetchToolsApi,
	createToolApi,
	updateToolApi,
	deleteToolApi,
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
	type ChatHubMessageStatus,
	type ChatModelDto,
	type ChatHubLLMProvider,
	type ChatProviderSettingsDto,
	type AgentIconOrEmoji,
	type ChatHubEditMessageRequest,
	type ChatHubRegenerateMessageRequest,
	type ChatHubStreamBegin,
	type ChatHubStreamChunk,
	type ChatHubStreamEnd,
	type ChatHubStreamError,
	type ChatHubToolDto,
	type ChatHubExecutionBegin,
	type ChatHubExecutionEnd,
	type ChatMessageContentChunk,
} from '@n8n/api-types';
import type {
	CredentialsMap,
	ChatMessage,
	ChatConversation,
	ChatStreamingState,
	FetchOptions,
} from './chat.types';
import { retry } from '@n8n/utils/retry';
import {
	buildUiMessages,
	createSessionFromStreamingState,
	isMatchedAgent,
	createAiMessageFromStreamingState,
	flattenModel,
	unflattenModel,
	createFakeAgent,
} from './chat.utils';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { deepCopy, type INode } from 'n8n-workflow';
import { convertFileToBinaryData } from '@/app/utils/fileUtils';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores/constants';
import { appendChunkToParsedMessageItems } from '@n8n/chat-hub';

export const useChatStore = defineStore(STORES.CHAT_HUB, () => {
	const rootStore = useRootStore();
	const toast = useToast();
	const telemetry = useTelemetry();
	const i18n = useI18n();

	const agents = ref<ChatModelsResponse | null>(null);
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
	const configuredTools = ref<ChatHubToolDto[]>([]);
	const configuredToolsLoaded = ref(false);

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
		return streaming.value?.sessionId === sessionId;
	}

	function computeActiveChain(
		messages: Record<ChatMessageId, ChatMessage>,
		messageId: ChatMessageId | null,
	) {
		const chain: ChatMessageId[] = [];

		if (!messageId) {
			return chain;
		}

		// Find the most recent descendant message starting from messageId...
		let latest: ChatMessageId = messageId;

		while (true) {
			const responses: string[] = messages[latest].responses;

			if (responses.length === 0) {
				break;
			}

			// Responses are sorted by create date, so the last item is the latest
			latest = responses[responses.length - 1];
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

		message.content = [{ type: 'text', content }];
	}

	function appendMessage(sessionId: ChatSessionId, messageId: ChatMessageId, chunk: string) {
		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[messageId];
		if (!message) {
			throw new Error(`Message with ID ${messageId} not found in session ${sessionId}`);
		}

		message.content = appendChunkToParsedMessageItems(message.content, chunk);
	}

	function updateMessage(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		status: ChatHubMessageStatus,
		content?: ChatMessageContentChunk[],
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

	async function fetchConfiguredTools() {
		const tools = await fetchToolsApi(rootStore.restApiContext);
		configuredTools.value = tools;
		configuredToolsLoaded.value = true;
		return tools;
	}

	async function addConfiguredTool(tool: INode): Promise<ChatHubToolDto> {
		const created = await createToolApi(rootStore.restApiContext, tool);
		configuredTools.value = [...configuredTools.value, created];
		return created;
	}

	async function updateConfiguredTool(toolId: string, definition: INode): Promise<ChatHubToolDto> {
		const updated = await updateToolApi(rootStore.restApiContext, toolId, { definition });
		configuredTools.value = configuredTools.value.map((t) =>
			t.definition.id === toolId ? updated : t,
		);
		return updated;
	}

	async function toggleToolEnabled(toolId: string, enabled: boolean): Promise<ChatHubToolDto> {
		const updated = await updateToolApi(rootStore.restApiContext, toolId, { enabled });
		configuredTools.value = configuredTools.value.map((t) =>
			t.definition.id === toolId ? updated : t,
		);
		return updated;
	}

	async function removeConfiguredTool(toolId: string): Promise<void> {
		await deleteToolApi(rootStore.restApiContext, toolId);
		configuredTools.value = configuredTools.value.filter((t) => t.definition.id !== toolId);
	}

	async function fetchAgents(credentialMap: CredentialsMap, options: FetchOptions = {}) {
		[agents.value] = await Promise.all([
			fetchChatModelsApi(rootStore.restApiContext, {
				credentials: credentialMap,
			}),
			new Promise((r) => setTimeout(r, options.minLoadingTime ?? 0)),
		]);
		return agents.value;
	}

	async function fetchSessions(reset: boolean, options: FetchOptions = {}) {
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
				fetchSessionsApi(rootStore.restApiContext, CHAT_SESSIONS_PAGE_SIZE, cursor),
				new Promise((resolve) => setTimeout(resolve, options.minLoadingTime ?? 0)),
			]);

			if (reset || sessions.value.ids === null) {
				sessions.value.ids = [];
			}

			sessions.value.hasMore = response.hasMore;
			sessions.value.nextCursor = response.nextCursor;

			for (const session of response.data) {
				sessions.value.ids.push(session.id);
				const existing = sessions.value.byId[session.id];
				sessions.value.byId[session.id] = {
					...session,
					toolIds: existing?.toolIds ?? session.toolIds,
				};
			}
		} finally {
			sessionsLoadingMore.value = false;
		}
	}

	async function fetchMoreSessions(options: FetchOptions = {}) {
		if (sessions.value?.hasMore && !sessionsLoadingMore.value) {
			await fetchSessions(false, options);
		}
	}

	async function fetchMessages(sessionId: string) {
		const { conversation, session } = await fetchMessagesApi(rootStore.restApiContext, sessionId);

		const messages = linkMessages(Object.values(conversation.messages));

		const latestMessage = Object.values(messages)
			.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
			.pop();

		const activeMessageChain = computeActiveChain(messages, latestMessage?.id ?? null);
		conversationsBySession.value.set(sessionId, {
			messages,
			activeMessageChain,
		});
		sessions.value.byId[sessionId] = session;
	}

	async function fetchConversationTitle(sessionId: ChatSessionId) {
		const current = sessions.value.byId[sessionId];
		if (!current || current.title === 'New Chat') {
			// wait up to 10 * 2 seconds until conversation title is generated
			await retry(
				async () => {
					try {
						const session = await fetchSingleConversationApi(rootStore.restApiContext, sessionId);
						return session.session.title !== 'New Chat';
					} catch (e: unknown) {
						return false;
					}
				},
				2000,
				10,
			);
		}

		// update the conversation list to reflect the new title and lastMessageAt timestamps
		await fetchSessions(true);
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

	async function handleApiError(error: unknown) {
		if (!streaming.value) {
			return;
		}

		const cause =
			error instanceof ResponseError
				? new Error(getErrorMessageByStatusCode(error.httpStatusCode, error.message))
				: error instanceof Error && error.message.includes('Failed to fetch')
					? new Error(i18n.baseText('chatHub.error.noConnection'))
					: error;

		toast.showError(cause, i18n.baseText('chatHub.error.sendMessageFailed'));

		const { sessionId } = streaming.value;
		streaming.value = undefined;

		await fetchConversationTitle(sessionId);
	}

	async function sendMessage(
		sessionId: ChatSessionId,
		message: string,
		agent: ChatModelDto,
		credentials: ChatHubSendMessageRequest['credentials'],
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

		streaming.value = {
			promptPreviousMessageId: previousMessageId,
			promptId: messageId,
			promptText: message,
			sessionId,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			attachments,
			agent,
		};

		telemetry.track('User sent chat hub message', {
			...flattenModel(agent.model),
			is_custom: agent.model.provider === 'custom-agent',
			chat_session_id: sessionId,
		});

		const payload = {
			model: agent.model,
			messageId,
			sessionId,
			message,
			credentials,
			previousMessageId,
			attachments,
			agentName: agent.name,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};

		try {
			// Create session entry if new
			if (!sessions.value.byId[sessionId]) {
				sessions.value.byId[sessionId] = createSessionFromStreamingState(
					streaming.value,
					configuredTools.value.filter((t) => t.enabled).map((t) => t.definition.id),
				);
				sessions.value.ids ??= [];
				sessions.value.ids.unshift(sessionId);
			}

			await sendMessageApi(rootStore.restApiContext, payload);

			// Note: Actual streaming content comes via Push events using pushConnection store.
			// The push handler will call handleWebSocketStreamBegin, handleWebSocketStreamChunk, etc.
			// Human message will be created by handleHumanMessageCreated event when it has been accepted by the server
			// The messageId for the AI response will be set by handleWebSocketStreamBegin
		} catch (error) {
			await handleApiError(error);
		}
	}

	async function editMessage(
		sessionId: ChatSessionId,
		editId: ChatMessageId,
		content: string,
		agent: ChatModelDto,
		credentials: ChatHubSendMessageRequest['credentials'],
		keepAttachmentIndices: number[] = [],
		newFiles: File[] = [],
	) {
		const promptId = uuidv4();

		const conversation = ensureConversation(sessionId);
		const message = conversation.messages[editId];
		const previousMessageId = message?.previousMessageId ?? null;
		const binaryData = await Promise.all(newFiles.map(convertFileToBinaryData));
		const payload: ChatHubEditMessageRequest = {
			model: agent.model,
			messageId: promptId,
			message: content,
			credentials,
			newAttachments: binaryData.map((attachment) => ({
				fileName: attachment.fileName ?? 'unnamed file',
				mimeType: attachment.mimeType,
				data: attachment.data,
			})),
			keepAttachmentIndices,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};

		if (message?.type === 'ai') {
			replaceMessageContent(sessionId, editId, content);
		}

		// Combine kept existing attachments with new attachments for optimistic UI
		const keptExistingAttachments = keepAttachmentIndices.flatMap((index) => {
			const attachment = message?.attachments[index];
			if (!attachment) return [];
			return [
				{
					fileName: attachment.fileName ?? 'unnamed file',
					mimeType: attachment.mimeType ?? 'application/octet-stream',
					data: '', // Binary data not needed for display (accessed via download URL)
				},
			];
		});

		streaming.value = {
			promptPreviousMessageId: previousMessageId,
			promptId,
			promptText: content,
			sessionId,
			agent,
			retryOfMessageId: null,
			revisionOfMessageId: editId,
			attachments: [...keptExistingAttachments, ...binaryData],
		};

		telemetry.track('User edited chat hub message', {
			...flattenModel(agent.model),
			is_custom: agent.model.provider === 'custom-agent',
			chat_session_id: sessionId,
			chat_message_id: editId,
		});

		try {
			await editMessageApi(rootStore.restApiContext, {
				sessionId,
				editId,
				payload,
			});

			// Note: Actual streaming content comes via Push events
			// The messageId for the AI response will be set by handleWebSocketStreamBegin
		} catch (error) {
			await handleApiError(error);
		}
	}

	async function regenerateMessage(
		sessionId: ChatSessionId,
		retryId: ChatMessageId,
		agent: ChatModelDto,
		credentials: ChatHubSendMessageRequest['credentials'],
	) {
		const conversation = ensureConversation(sessionId);
		const previousMessageId = conversation.messages[retryId]?.previousMessageId ?? null;
		const payload: ChatHubRegenerateMessageRequest = {
			model: agent.model,
			credentials,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		};

		if (!previousMessageId) {
			throw new Error('No previous message to base regeneration on');
		}

		streaming.value = {
			promptPreviousMessageId: previousMessageId,
			promptId: retryId,
			promptText: '',
			sessionId,
			agent,
			retryOfMessageId: retryId,
			revisionOfMessageId: null,
			attachments: [],
		};

		telemetry.track('User regenerated chat hub message', {
			...flattenModel(agent.model),
			is_custom: agent.model.provider === 'custom-agent',
			chat_session_id: sessionId,
			chat_message_id: retryId,
		});

		try {
			await regenerateMessageApi(rootStore.restApiContext, {
				sessionId,
				retryId,
				payload,
			});

			// Note: Actual streaming content comes via Push events
			// The messageId for the AI response will be set by handleWebSocketStreamBegin
		} catch (error) {
			await handleApiError(error);
		}
	}

	async function stopStreamingMessage(sessionId: ChatSessionId) {
		const currentMessage = lastMessage(sessionId);

		if (currentMessage && currentMessage.status === 'running') {
			updateMessage(sessionId, currentMessage.id, 'cancelled');
			await stopGenerationApi(rootStore.restApiContext, sessionId, currentMessage.id);

			// Clear streaming state and fetch updated title
			if (streaming.value?.sessionId === sessionId) {
				streaming.value = undefined;
				await fetchConversationTitle(sessionId);
			}
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

	async function toggleCustomAgentTool(agentId: string, toolId: string) {
		const agent = customAgents.value[agentId];
		if (!agent) throw new Error(`Custom agent with ID ${agentId} not found`);

		const currentIds = agent.toolIds ?? [];
		const newIds = currentIds.includes(toolId)
			? currentIds.filter((id) => id !== toolId)
			: [...currentIds, toolId];

		customAgents.value[agentId] = { ...agent, toolIds: newIds };
		await updateAgentApi(rootStore.restApiContext, agentId, { toolIds: newIds });
	}

	async function toggleSessionTool(sessionId: ChatSessionId, toolId: string) {
		const session = sessions.value?.byId[sessionId];
		if (!session) {
			throw new Error(`Session with ID ${sessionId} not found`);
		}

		const currentIds = session.toolIds ?? [];
		const newIds = currentIds.includes(toolId)
			? currentIds.filter((id) => id !== toolId)
			: [...currentIds, toolId];

		const updated = await updateConversationApi(rootStore.restApiContext, sessionId, {
			toolIds: newIds,
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
		const result = await updateConversationApi(rootStore.restApiContext, sessionId, {
			agent: { model, name: agentName },
		});
		updateSession(sessionId, result.session);
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
			metadata: baseModel?.metadata ?? {
				capabilities: { functionCalling: false },
				inputModalities: [],
				available: true,
			},
			groupName: null,
			groupIcon: null,
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
		const agent = agents.value?.[model.provider]?.models.find((candidate) =>
			isMatchedAgent(candidate, model),
		);

		if (agent) {
			return agent;
		}

		return createFakeAgent(model, fallback);
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

	/**
	 * Handle the beginning of a WebSocket stream
	 */
	function handleWebSocketStreamBegin(
		data: Pick<
			ChatHubStreamBegin['data'],
			'sessionId' | 'messageId' | 'previousMessageId' | 'retryOfMessageId'
		>,
	) {
		const { sessionId, messageId, previousMessageId, retryOfMessageId } = data;

		// Update streaming state with message info (for both local and remote)
		if (streaming.value?.sessionId === sessionId) {
			streaming.value.messageId = messageId;
			streaming.value.promptPreviousMessageId = previousMessageId;
			streaming.value.retryOfMessageId = retryOfMessageId;
		}

		// Skip if we already have this message (e.g., from a previous stream begin)
		const conversation = getConversation(sessionId);
		if (conversation?.messages[messageId]) {
			return;
		}

		// If the previous message was 'waiting', mark it as 'success' now that execution is resuming
		if (previousMessageId && conversation?.messages[previousMessageId]?.status === 'waiting') {
			updateMessage(sessionId, previousMessageId, 'success');
		}

		// Create the AI message placeholder - use streaming state if available for this session
		const streamingStateForSession =
			streaming.value?.sessionId === sessionId ? streaming.value : undefined;
		const message = createAiMessageFromStreamingState(
			sessionId,
			messageId,
			streamingStateForSession,
		);

		// Always use server-provided previousMessageId and retryOfMessageId
		// This ensures correct linking even for remote streams
		message.previousMessageId = previousMessageId;
		message.retryOfMessageId = retryOfMessageId;

		addMessage(sessionId, message);
	}

	/**
	 * Handle a WebSocket stream chunk
	 */
	function handleWebSocketStreamChunk(
		data: Pick<ChatHubStreamChunk['data'], 'sessionId' | 'messageId' | 'content'>,
	) {
		const { sessionId, messageId, content } = data;

		// Append the content to the message
		const conversation = getConversation(sessionId);
		if (!conversation?.messages[messageId]) {
			// Message not found, might need to create it
			ensureMessage(sessionId, messageId);
		}

		appendMessage(sessionId, messageId, content);
	}

	/**
	 * Handle the end of a WebSocket stream (individual message stream ends, but execution may continue)
	 */
	function handleWebSocketStreamEnd(
		data: Pick<ChatHubStreamEnd['data'], 'sessionId' | 'messageId' | 'status'>,
	) {
		const { sessionId, messageId, status } = data;

		// Update the message status
		updateMessage(sessionId, messageId, status);

		// NOTE: Don't clear streaming state here - the execution may continue
		// with more messages (e.g., tool calls). Streaming state is cleared
		// by handleWebSocketExecutionEnd when the whole execution completes.
	}

	/**
	 * Handle a WebSocket stream error (individual message has an error)
	 */
	function handleWebSocketStreamError(
		data: Pick<ChatHubStreamError['data'], 'sessionId' | 'messageId' | 'error'>,
	) {
		const { sessionId, messageId, error } = data;

		// Ensure the message exists
		const message = ensureMessage(sessionId, messageId);

		// Update the message with error content and status
		if (message.content) {
			message.content = appendChunkToParsedMessageItems(message.content, '\n\n' + error);
		} else {
			message.content = [{ type: 'text', content: error }];
		}
		message.status = 'error';

		updateMessage(sessionId, messageId, 'error', message.content);
	}

	/**
	 * Handle execution begin (whole streaming session starts)
	 */
	function handleWebSocketExecutionBegin(data: Pick<ChatHubExecutionBegin['data'], 'sessionId'>) {
		const { sessionId } = data;

		// If we're already tracking this session locally, nothing to do
		if (streaming.value?.sessionId === sessionId) {
			return;
		}

		// This is a remote stream - set streaming state using session data
		const session = sessions.value.byId[sessionId];
		if (!session) {
			// Session not loaded in this client, skip
			return;
		}

		// Construct agent from session data
		const model = unflattenModel(session);
		if (!model) {
			return;
		}

		const agent = getAgent(model, {
			name: session.agentName,
			icon: session.agentIcon,
		});

		// Set minimal streaming state for remote stream
		streaming.value = {
			promptPreviousMessageId: null, // Will be set by handleWebSocketStreamBegin
			promptId: '', // Unknown until stream begin
			promptText: '', // Not needed for UI
			sessionId,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			attachments: [],
			agent,
		};
	}

	/**
	 * Handle execution end (whole streaming session ends)
	 */
	function handleWebSocketExecutionEnd(
		data: Pick<ChatHubExecutionEnd['data'], 'sessionId' | 'status'>,
	) {
		const { sessionId, status } = data;

		// Clear streaming state if this is the current session
		if (streaming.value?.sessionId === sessionId) {
			const currentSessionId = streaming.value.sessionId;

			// Update the message status if we have a messageId
			// This handles cases where streamEnd wasn't received (e.g., cancellation)
			if (streaming.value.messageId) {
				const conversation = getConversation(sessionId);
				const message = conversation?.messages[streaming.value.messageId];
				if (message && message.status === 'running') {
					updateMessage(sessionId, streaming.value.messageId, status);
				}
			}

			streaming.value = undefined;

			// Show error toast if the execution failed
			if (status === 'error') {
				toast.showError(new Error('Execution failed'), i18n.baseText('chatHub.error.unknown'));
			}

			// Fetch updated conversation title
			void fetchConversationTitle(currentSessionId);
		}
	}

	/**
	 * Reconnect to an active stream after WebSocket reconnection
	 */
	async function reconnectToStream(sessionId: ChatSessionId, lastSequenceNumber: number) {
		try {
			const response = await reconnectToSessionApi(
				rootStore.restApiContext,
				sessionId,
				lastSequenceNumber,
			);

			// Replay any pending chunks
			if (response.pendingChunks && response.pendingChunks.length > 0) {
				for (const chunk of response.pendingChunks) {
					if (response.currentMessageId) {
						appendMessage(sessionId, response.currentMessageId, chunk.content);
					}
				}
			}

			return response;
		} catch (error) {
			// Reconnection failed, but don't throw - the stream might have completed
			return null;
		}
	}

	/**
	 * Handle a human message created event
	 */
	function handleHumanMessageCreated(data: {
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		content: string;
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
		timestamp: number;
	}): void {
		const conversation = conversationsBySession.value.get(data.sessionId);
		if (!conversation) {
			// Session not loaded in this client, skip
			return;
		}

		// Skip if we already have this message (we sent it from this client)
		if (conversation.messages[data.messageId]) {
			return;
		}

		// Create and add the human message
		const message: ChatMessage = {
			id: data.messageId,
			sessionId: data.sessionId,
			type: 'human',
			name: 'User',
			content: [{ type: 'text', content: data.content }],
			previousMessageId: data.previousMessageId,
			retryOfMessageId: null,
			revisionOfMessageId: null,
			status: 'success',
			attachments: data.attachments.map((a) => ({
				fileName: a.fileName,
				mimeType: a.mimeType,
			})),
			provider: null,
			model: null,
			workflowId: null,
			agentId: null,
			executionId: null,
			createdAt: new Date(data.timestamp).toISOString(),
			updatedAt: new Date(data.timestamp).toISOString(),
			responses: [],
			alternatives: [],
		};

		addMessage(data.sessionId, message);
	}

	/**
	 * Handle a message edited event
	 */
	function handleMessageEdited(data: {
		sessionId: ChatSessionId;
		revisionOfMessageId: ChatMessageId;
		messageId: ChatMessageId;
		content: string;
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
		timestamp: number;
	}): void {
		const conversation = conversationsBySession.value.get(data.sessionId);
		if (!conversation) {
			// Session not loaded in this client, skip
			// TODO: We could probably load the session, it should be one this user can access?
			return;
		}

		// Skip if we already have this message (we sent it from this client)
		if (conversation.messages[data.messageId]) {
			return;
		}

		// Get the original message to inherit some properties
		const originalMessage = conversation.messages[data.revisionOfMessageId];

		// Create and add the edited message
		const message: ChatMessage = {
			id: data.messageId,
			sessionId: data.sessionId,
			type: 'human',
			name: originalMessage?.name ?? 'User',
			content: [{ type: 'text', content: data.content }],
			previousMessageId: originalMessage?.previousMessageId ?? null,
			retryOfMessageId: null,
			revisionOfMessageId: data.revisionOfMessageId,
			status: 'success',
			attachments: data.attachments.map((a) => ({
				fileName: a.fileName,
				mimeType: a.mimeType,
			})),
			provider: originalMessage?.provider ?? null,
			model: originalMessage?.model ?? null,
			workflowId: originalMessage?.workflowId ?? null,
			agentId: originalMessage?.agentId ?? null,
			executionId: null,
			createdAt: new Date(data.timestamp).toISOString(),
			updatedAt: new Date(data.timestamp).toISOString(),
			responses: [],
			alternatives: [],
		};

		addMessage(data.sessionId, message);
	}

	return {
		/**
		 * models and agents
		 */
		agents: computed(() => agents.value ?? emptyChatModelsResponse),
		agentsReady: computed(() => agents.value !== null),
		customAgents,
		getAgent,
		fetchAgents,
		getCustomAgent,
		fetchCustomAgent,
		createCustomAgent,
		updateCustomAgent,
		deleteCustomAgent,

		/**
		 * configured tools (tool library)
		 */
		configuredTools,
		configuredToolsLoaded,
		fetchConfiguredTools,
		addConfiguredTool,
		updateConfiguredTool,
		toggleToolEnabled,
		removeConfiguredTool,

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
		toggleSessionTool,
		toggleCustomAgentTool,
		conversationsBySession,

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

		/**
		 * WebSocket streaming handlers
		 */
		handleWebSocketExecutionBegin,
		handleWebSocketExecutionEnd,
		handleWebSocketStreamBegin,
		handleWebSocketStreamChunk,
		handleWebSocketStreamEnd,
		handleWebSocketStreamError,

		/**
		 * Stream message actions
		 */
		handleHumanMessageCreated,
		handleMessageEdited,

		/**
		 * Stream reconnection
		 */
		reconnectToStream,
	};
});
