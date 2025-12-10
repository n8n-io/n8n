import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	type ChatModelDto,
	type ChatSessionId,
	type ChatMessageId,
	type ChatHubProvider,
	type ChatHubLLMProvider,
	type ChatHubInputModality,
} from '@n8n/api-types';
import type {
	ChatMessage,
	GroupedConversations,
	ChatAgentFilter,
	ChatStreamingState,
	FlattenedModel,
	ChatConversation,
} from './chat.types';
import { CHAT_VIEW } from './constants';
import { v4 as uuidv4 } from 'uuid';

export function findOneFromModelsResponse(response: ChatModelsResponse): ChatModelDto | undefined {
	for (const provider of chatHubProviderSchema.options) {
		if (response[provider].models.length > 0) {
			return response[provider].models[0];
		}
	}

	return undefined;
}

export function getRelativeDate(now: Date, dateString: string): string {
	const date = new Date(dateString);
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const lastWeek = new Date(today);
	lastWeek.setDate(lastWeek.getDate() - 7);

	const conversationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	if (conversationDate.getTime() === today.getTime()) {
		return 'Today';
	} else if (conversationDate.getTime() === yesterday.getTime()) {
		return 'Yesterday';
	} else if (conversationDate >= lastWeek) {
		return 'This week';
	} else {
		return 'Older';
	}
}

export function groupConversationsByDate(sessions: ChatHubSessionDto[]): GroupedConversations[] {
	const now = new Date();
	const groups = new Map<string, ChatHubSessionDto[]>();

	// Group sessions by relative date
	for (const session of sessions) {
		const group = getRelativeDate(now, session.lastMessageAt ?? session.updatedAt);

		if (!groups.has(group)) {
			groups.set(group, []);
		}

		groups.get(group)!.push(session);
	}

	// Define order for groups
	const groupOrder = ['Today', 'Yesterday', 'This week', 'Older'];

	return groupOrder.flatMap((groupName) => {
		const sessions = groups.get(groupName) ?? [];

		return sessions.length > 0
			? [
					{
						group: groupName,
						sessions: sessions.sort(
							(a, b) =>
								Date.parse(b.lastMessageAt ?? b.updatedAt) -
								Date.parse(a.lastMessageAt ?? a.updatedAt),
						),
					},
				]
			: [];
	});
}

export function getAgentRoute(model: ChatHubConversationModel) {
	if (model.provider === 'n8n') {
		return {
			name: CHAT_VIEW,
			query: {
				workflowId: model.workflowId,
			},
		};
	}

	if (model.provider === 'custom-agent') {
		return {
			name: CHAT_VIEW,
			query: {
				agentId: model.agentId,
			},
		};
	}

	return {
		name: CHAT_VIEW,
	};
}

export function flattenModel(model: ChatHubConversationModel): FlattenedModel {
	return {
		provider: model.provider,
		model:
			model?.provider === 'n8n' || model?.provider === 'custom-agent'
				? null
				: (model?.model ?? null),
		workflowId: model?.provider === 'n8n' ? model.workflowId : null,
		agentId: model?.provider === 'custom-agent' ? model.agentId : null,
	};
}

export function unflattenModel(messageOrSession: FlattenedModel): ChatHubConversationModel | null {
	if (messageOrSession.provider === null) {
		return null;
	}

	switch (messageOrSession.provider) {
		case 'custom-agent':
			if (!messageOrSession.agentId) {
				return null;
			}

			return {
				provider: 'custom-agent',
				agentId: messageOrSession.agentId,
			};
		case 'n8n':
			if (!messageOrSession.workflowId) {
				return null;
			}

			return {
				provider: 'n8n',
				workflowId: messageOrSession.workflowId,
			};
		default:
			if (messageOrSession.model === null) {
				return null;
			}

			return {
				provider: messageOrSession.provider,
				model: messageOrSession.model,
			};
	}
}

export function filterAndSortAgents(
	models: ChatModelDto[],
	filter: ChatAgentFilter,
): ChatModelDto[] {
	let filtered = models;

	// Apply search filter
	if (filter.search.trim()) {
		const query = filter.search.toLowerCase();
		filtered = filtered.filter((model) => model.name.toLowerCase().includes(query));
	}

	// Apply sorting
	filtered = [...filtered].sort((a, b) => {
		const dateAStr = a[filter.sortBy];
		const dateBStr = b[filter.sortBy];
		const dateA = dateAStr ? Date.parse(dateAStr) : undefined;
		const dateB = dateBStr ? Date.parse(dateBStr) : undefined;

		// Sort by dates (newest first)
		if (dateA && dateB) {
			return dateB - dateA;
		}

		// Items without dates go to the end
		if (dateA && !dateB) {
			return -1;
		}
		if (!dateA && dateB) {
			return 1;
		}

		return 0;
	});

	return filtered;
}

export function stringifyModel(model: ChatHubConversationModel): string {
	return `${model.provider}::${model.provider === 'custom-agent' ? model.agentId : model.provider === 'n8n' ? model.workflowId : model.model}`;
}

export function fromStringToModel(value: string): ChatHubConversationModel | undefined {
	const [provider, identifier] = value.split('::');
	const parsedProvider = chatHubProviderSchema.safeParse(provider).data;

	if (!parsedProvider) {
		return undefined;
	}

	return parsedProvider === 'n8n'
		? { provider: 'n8n', workflowId: identifier }
		: parsedProvider === 'custom-agent'
			? { provider: 'custom-agent', agentId: identifier }
			: { provider: parsedProvider, model: identifier };
}

export function isMatchedAgent(agent: ChatModelDto, model: ChatHubConversationModel): boolean {
	if (model.provider === 'n8n') {
		return agent.model.provider === 'n8n' && agent.model.workflowId === model.workflowId;
	}

	if (model.provider === 'custom-agent') {
		return agent.model.provider === 'custom-agent' && agent.model.agentId === model.agentId;
	}

	return agent.model.provider === model.provider && agent.model.model === model.model;
}

export function createAiMessageFromStreamingState(
	sessionId: ChatSessionId,
	messageId: ChatMessageId,
	streaming?: Partial<ChatStreamingState>,
): ChatMessage {
	return {
		id: messageId,
		sessionId,
		type: 'ai',
		name: 'AI',
		content: '',
		executionId: streaming?.executionId ?? null,
		status: 'running',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		previousMessageId: streaming?.previousMessageId ?? null,
		retryOfMessageId: streaming?.retryOfMessageId ?? null,
		revisionOfMessageId: null,
		responses: [],
		alternatives: [],
		attachments: [],
		...(streaming?.agent
			? flattenModel(streaming.agent.model)
			: {
					provider: null,
					model: null,
					workflowId: null,
					agentId: null,
				}),
	};
}

export function buildUiMessages(
	sessionId: string,
	conversation: ChatConversation,
	streaming?: ChatStreamingState,
): ChatMessage[] {
	const messagesToShow: ChatMessage[] = [];
	let foundRunning = false;

	for (let index = 0; index < conversation.activeMessageChain.length; index++) {
		const id = conversation.activeMessageChain[index];
		const message = conversation.messages[id];

		if (!message) {
			continue;
		}

		foundRunning = foundRunning || message.status === 'running';

		if (foundRunning || streaming?.sessionId !== sessionId || message.type !== 'ai') {
			messagesToShow.push(message);
			continue;
		}

		if (streaming.retryOfMessageId === id && !streaming.messageId) {
			// While waiting for streaming to start on regeneration, show previously generated message
			// in running state as an immediate feedback
			messagesToShow.push({ ...message, content: '', status: 'running' });
			foundRunning = true;
			continue;
		}

		if (index === conversation.activeMessageChain.length - 1) {
			// When agent responds multiple messages (e.g. when tools are used),
			// there's a noticeable time gap between messages.
			// In order to indicate that agent is still responding, show the last AI message as running
			messagesToShow.push({ ...message, status: 'running' });
			foundRunning = true;
			continue;
		}

		messagesToShow.push(message);
	}

	if (
		!foundRunning &&
		streaming?.sessionId === sessionId &&
		!streaming.messageId &&
		streaming.retryOfMessageId === null &&
		streaming.promptId === messagesToShow[messagesToShow.length - 1]?.id
	) {
		// While waiting for streaming to start on sending new message/editing, append a fake message
		// in running state as an immediate feedback
		messagesToShow.push(createAiMessageFromStreamingState(sessionId, uuidv4(), streaming));
	}

	return messagesToShow;
}

export function isLlmProvider(provider?: ChatHubProvider): provider is ChatHubLLMProvider {
	return provider !== 'n8n' && provider !== 'custom-agent';
}

export function isLlmProviderModel(
	model?: ChatHubConversationModel,
): model is ChatHubConversationModel & { provider: ChatHubLLMProvider } {
	return isLlmProvider(model?.provider);
}

export function createSessionFromStreamingState(streaming: ChatStreamingState): ChatHubSessionDto {
	return {
		id: streaming.sessionId,
		title: 'New Chat',
		ownerId: '',
		lastMessageAt: new Date().toISOString(),
		credentialId: null,
		agentName: streaming.agent.name,
		agentIcon: streaming.agent.icon,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		tools: streaming.tools,
		...flattenModel(streaming.agent.model),
	};
}

export function createMimeTypes(modalities: ChatHubInputModality[]): string {
	// If 'file' modality is present, accept all file types
	if (modalities.includes('file')) {
		return '*/*';
	}

	const mimeTypes: string[] = ['text/*'];

	for (const modality of modalities) {
		if (modality === 'image') {
			mimeTypes.push('image/*');
		}
		if (modality === 'audio') {
			mimeTypes.push('audio/*');
		}
		if (modality === 'video') {
			mimeTypes.push('video/*');
		}
	}

	return mimeTypes.join(',');
}
