const INTEGRATION_MEMORY_RESOURCE_PREFIX = 'integration:';

export function draftChatMemoryResourceId(userId: string): string {
	return `draft-chat:${userId}`;
}

export function integrationMemoryResourceId(
	integrationType: string,
	platformUserId: string,
): string {
	return `${INTEGRATION_MEMORY_RESOURCE_PREFIX}${integrationType}:${platformUserId}`;
}

export function isIntegrationMemoryResourceId(
	resourceId: string | undefined,
): resourceId is string {
	return resourceId?.startsWith(INTEGRATION_MEMORY_RESOURCE_PREFIX) === true;
}

export function taskRunMemoryResourceId(taskId: string): string {
	return `task:${taskId}`;
}
