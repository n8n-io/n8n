import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubConversation,
} from '@n8n/api-types';
import type { GroupedConversations } from './chat.types';

export function findOneFromModelsResponse(
	response: ChatModelsResponse,
): ChatHubConversationModel | undefined {
	for (const provider of chatHubProviderSchema.options) {
		if (response[provider].models.length > 0) {
			return { model: response[provider].models[0].name, provider };
		}
	}

	return undefined;
}

export function getRelativeDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
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

export function groupConversationsByDate(sessions: ChatHubConversation[]): GroupedConversations[] {
	const groups = new Map<string, ChatHubConversation[]>();

	// Group sessions by relative date
	sessions.forEach((session) => {
		const group = getRelativeDate(session.updatedAt);
		if (!groups.has(group)) {
			groups.set(group, []);
		}
		groups.get(group)!.push(session);
	});

	// Define order for groups
	const groupOrder = ['Today', 'Yesterday', 'This week', 'Older'];

	// Convert to array and sort by group order
	const result: GroupedConversations[] = [];
	groupOrder.forEach((groupName) => {
		if (groups.has(groupName)) {
			const sessions = groups.get(groupName)!;
			result.push({
				group: groupName,
				sessions: sessions.map((session) => ({
					id: session.id,
					label: session.title,
				})),
			});
		}
	});

	return result;
}
