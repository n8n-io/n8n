const INTEGRATION_MEMORY_RESOURCE_PREFIX = 'integration:';
const DRAFT_CHAT_MEMORY_RESOURCE_PREFIX = 'draft-chat:';
const THREAD_MEMORY_RESOURCE_PREFIX = 'thread:';

export function threadMemoryResourceId(threadId: string): string {
	return `${THREAD_MEMORY_RESOURCE_PREFIX}${threadId}`;
}

/**
 * Integration threads are shared conversations, so their durable notes belong
 * to the thread, not to the author. Every other run keeps its resource as scope.
 */
export function episodicMemoryWriteScopeId(scope: {
	resourceId: string;
	threadId: string;
}): string {
	return isIntegrationMemoryResourceId(scope.resourceId)
		? threadMemoryResourceId(scope.threadId)
		: scope.resourceId;
}

export function draftChatMemoryResourceId(userId: string): string {
	return `${DRAFT_CHAT_MEMORY_RESOURCE_PREFIX}${userId}`;
}

export function userIdFromDraftChatMemoryResourceId(resourceId: string): string | undefined {
	if (!resourceId.startsWith(DRAFT_CHAT_MEMORY_RESOURCE_PREFIX)) return undefined;
	const userId = resourceId.slice(DRAFT_CHAT_MEMORY_RESOURCE_PREFIX.length);
	return userId.length > 0 ? userId : undefined;
}

export function integrationTypeFromMemoryResourceId(resourceId: string): string | undefined {
	if (!resourceId.startsWith(INTEGRATION_MEMORY_RESOURCE_PREFIX)) return undefined;
	const separator = resourceId.indexOf(':', INTEGRATION_MEMORY_RESOURCE_PREFIX.length);
	if (separator === -1) return undefined;
	const integrationType = resourceId.slice(INTEGRATION_MEMORY_RESOURCE_PREFIX.length, separator);
	return integrationType.length > 0 ? integrationType : undefined;
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

export function isTaskRunMemoryResourceId(resourceId: string | undefined): resourceId is string {
	return resourceId?.startsWith('task:') === true;
}
