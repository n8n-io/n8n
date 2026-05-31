export function draftChatMemoryResourceId(userId: string): string {
	return `draft-chat:${userId}`;
}

export function integrationMemoryResourceId(integrationType: string, threadId: string): string {
	return `integration:${integrationType}:${threadId}`;
}

export function taskRunMemoryResourceId(taskId: string): string {
	return `task:${taskId}`;
}
