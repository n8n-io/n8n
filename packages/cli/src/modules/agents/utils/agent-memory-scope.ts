export function draftChatMemoryResourceId(userId: string): string {
	return `draft-chat:${userId}`;
}

export function integrationMemoryResourceId(
	integrationType: string,
	platformUserId: string,
): string {
	return `integration:${integrationType}:${platformUserId}`;
}

export function taskRunMemoryResourceId(taskId: string): string {
	return `task:${taskId}`;
}
