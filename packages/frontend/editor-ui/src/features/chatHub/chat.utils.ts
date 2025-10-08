import type { ChatHubConversationModel } from '@n8n/api-types';

export function isSameModel(
	one: ChatHubConversationModel,
	another: ChatHubConversationModel,
): boolean {
	return one.model === another.model && one.provider === another.provider;
}
