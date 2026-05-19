export function draftChatEpisodicMemoryResourceId(userId: string): string {
	return `draft-chat:${userId}`;
}

export function scheduledRunEpisodicMemoryResourceId(threadId: string): string {
	return `schedule:${threadId}`;
}

export function integrationEpisodicMemoryResourceId(
	integrationType: string,
	threadId: string,
): string {
	return `integration:${integrationType}:${threadId}`;
}
