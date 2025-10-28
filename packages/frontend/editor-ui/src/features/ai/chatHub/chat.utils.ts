import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	type ChatHubAgentDto,
} from '@n8n/api-types';
import type { ChatMessage, GroupedConversations } from './chat.types';
import { CHAT_VIEW } from './constants';
import type { IWorkflowDb } from '@/Interface';

export function findOneFromModelsResponse(
	response: ChatModelsResponse,
): ChatHubConversationModel | undefined {
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

export function restoreConversationModelFromMessageOrSession(
	messageOrSession: ChatHubSessionDto | ChatMessage,
	agents: ChatHubAgentDto[],
	workflowsById: Partial<Record<string, IWorkflowDb>>,
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
				name:
					agents.find((agent) => agent.id === messageOrSession.agentId)?.name ??
					`Custom agent ${messageOrSession.agentId}`,
			};
		case 'n8n':
			if (!messageOrSession.workflowId) {
				return null;
			}

			return {
				provider: 'n8n',
				workflowId: messageOrSession.workflowId,
				name:
					workflowsById[messageOrSession.workflowId]?.name ??
					`n8n workflow ${messageOrSession.workflowId}`,
			};
		default:
			if (messageOrSession.model === null) {
				return null;
			}

			return {
				provider: messageOrSession.provider,
				model: messageOrSession.model,
				name: messageOrSession.model,
			};
	}
}

export function describeConversationModel(model: ChatHubConversationModel) {
	switch (model.provider) {
		case 'n8n':
			return `n8n workflow ${model.name}`;
		case 'custom-agent':
			return `Custom agent ${model.name}`;
		default:
			return model.model;
	}
}
