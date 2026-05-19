export function draftChatMemoryResourceId(userId: string): string {
	return `draft-chat:${userId}`;
}

export function scheduledRunMemoryResourceId(threadId: string): string {
	return `schedule:${threadId}`;
}

export function integrationMemoryResourceId(
	integrationType: string,
	threadId: string,
): string {
	return `integration:${integrationType}:${threadId}`;
}
