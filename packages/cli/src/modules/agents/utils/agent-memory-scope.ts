export function draftChatMemoryResourceId(userId: string): string {
	return `draft-chat:${userId}`;
}

export function scheduledRunMemoryResourceId(executionUserId: string): string {
	return `schedule:${executionUserId}`;
}

export function integrationMemoryResourceId(
	integrationType: string,
	threadId: string,
): string {
	return `integration:${integrationType}:${threadId}`;
}
