import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	type ChatHubAgentDto,
	type ChatModelDto,
} from '@n8n/api-types';
import type { ChatMessage, GroupedConversations, ChatAgentFilter } from './chat.types';
import { CHAT_VIEW } from './constants';
import type { IWorkflowDb } from '@/Interface';

export function findOneFromModelsResponse(
	response: ChatModelsResponse,
): ChatHubConversationModel | undefined {
	for (const provider of chatHubProviderSchema.options) {
		if (response[provider].models.length > 0) {
			return response[provider].models[0].model;
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

export function restoreConversationModelFromMessageOrSession(
	messageOrSession: ChatHubSessionDto | ChatMessage,
): ChatHubConversationModel | null {
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

export function describeConversationModel(model: ChatModelDto) {
	switch (model.model.provider) {
		case 'n8n':
			return `n8n workflow ${model.name}`;
		case 'custom-agent':
			return `Custom agent ${model.name}`;
		default:
			return model.model;
	}
}

export function getTimestamp(
	model: ChatHubConversationModel,
	type: 'createdAt' | 'updatedAt',
	agents: ChatHubAgentDto[],
	workflowsById: Partial<Record<string, IWorkflowDb>>,
): number | null {
	if (model.provider === 'custom-agent') {
		const agent = agents.find((a) => model.provider === 'custom-agent' && a.id === model.agentId);
		return agent?.[type] ? Date.parse(agent[type]) : null;
	}

	if (model.provider === 'n8n') {
		const workflow = workflowsById[model.workflowId];
		return workflow?.[type]
			? typeof workflow[type] === 'string'
				? Date.parse(workflow[type])
				: workflow[type]
			: null;
	}

	return null;
}

export function filterAndSortAgents(
	models: ChatModelDto[],
	filter: ChatAgentFilter,
	agents: ChatHubAgentDto[],
	workflowsById: Partial<Record<string, IWorkflowDb>>,
): ChatModelDto[] {
	let filtered = models;

	// Apply search filter
	if (filter.search.trim()) {
		const query = filter.search.toLowerCase();
		filtered = filtered.filter((model) => model.name.toLowerCase().includes(query));
	}

	// Apply provider filter
	if (filter.provider !== '') {
		filtered = filtered.filter((model) => model.model.provider === filter.provider);
	}

	// Apply sorting
	filtered = [...filtered].sort((a, b) => {
		const dateA = getTimestamp(a.model, filter.sortBy, agents, workflowsById);
		const dateB = getTimestamp(b.model, filter.sortBy, agents, workflowsById);

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
