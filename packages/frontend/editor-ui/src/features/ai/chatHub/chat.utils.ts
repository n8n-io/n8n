import {
	chatHubProviderSchema,
	type ChatHubConversationModel,
	type ChatModelsResponse,
	type ChatHubSessionDto,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import type { ChatMessage, ChatMessageGenerationError, GroupedConversations } from './chat.types';
import { providerDisplayNames } from './constants';

export function findOneFromModelsResponse(
	response: ChatModelsResponse,
): ChatHubConversationModel | undefined {
	for (const provider of chatHubProviderSchema.options) {
		if (response[provider].models.length > 0) {
			return { model: response[provider].models[0].name, provider, workflowId: null };
		}
	}

	return undefined;
}

export function getRelativeDate(now: Date, dateString: string | null): string {
	const date = dateString ? new Date(dateString) : now;
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
		const group = getRelativeDate(now, session.lastMessageAt);

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
								(b.lastMessageAt ? Date.parse(b.lastMessageAt) : +now) -
								(a.lastMessageAt ? Date.parse(a.lastMessageAt) : +now),
						),
					},
				]
			: [];
	});
}

export function createModelOrCredentialsMissingError(model: ChatHubConversationModel | null) {
	return Error(
		model
			? `Set your credentials for ${providerDisplayNames[model.provider]} to start a conversation.`
			: 'Select a model to start a conversation.',
	);
}

export function createCredentials(model: ChatHubConversationModel, credentialsId: string) {
	return {
		[PROVIDER_CREDENTIAL_TYPE_MAP[model.provider]]: {
			id: credentialsId,
			name: '',
		},
	};
}

export function mergeErrorIntoChain(
	sessionId: string,
	messagesFromChain: ChatMessage[],
	error: ChatMessageGenerationError | null,
) {
	if (error?.sessionId !== sessionId) {
		return messagesFromChain;
	}

	return messagesFromChain.flatMap<ChatMessage>((message) => {
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
}
