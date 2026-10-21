const INTEGRATION_MEMORY_RESOURCE_PREFIX = 'integration:';
const DRAFT_CHAT_MEMORY_RESOURCE_PREFIX = 'draft-chat:';
const PRODUCTION_CHAT_MEMORY_RESOURCE_PREFIX = 'n8n-chat-production:';
const SYSTEM_CHAT_MEMORY_RESOURCE_PREFIX = 'system-chat:';
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

/** Bounds the thread scopes one default recall reads; older threads fall out first. */
export const EPISODIC_MEMORY_MAX_THREAD_SCOPES = 200;

/**
 * Own scope plus every integration thread the resource has posted in: a
 * participant recalls a thread's notes wherever they ask, and a late joiner
 * gets them as soon as they post there.
 */
export function defaultEpisodicMemoryReadScopeIds(
	scope: { resourceId: string; threadId: string },
	participatedThreadIds: string[],
): string[] {
	if (!isIntegrationMemoryResourceId(scope.resourceId)) return [scope.resourceId];
	return [
		...new Set([
			scope.resourceId,
			threadMemoryResourceId(scope.threadId),
			...participatedThreadIds.map(threadMemoryResourceId),
		]),
	];
}

export function draftChatMemoryResourceId(userId: string): string {
	return `${DRAFT_CHAT_MEMORY_RESOURCE_PREFIX}${userId}`;
}

export function productionChatMemoryResourceId(userId: string): string {
	return `${PRODUCTION_CHAT_MEMORY_RESOURCE_PREFIX}${userId}`;
}

/** A system-agent chat. It is not a Preview chat, so it has its own resource scope. */
export function systemChatMemoryResourceId(userId: string): string {
	return `${SYSTEM_CHAT_MEMORY_RESOURCE_PREFIX}${userId}`;
}

export function userIdFromSystemChatMemoryResourceId(resourceId: string): string | undefined {
	if (!resourceId.startsWith(SYSTEM_CHAT_MEMORY_RESOURCE_PREFIX)) return undefined;
	const userId = resourceId.slice(SYSTEM_CHAT_MEMORY_RESOURCE_PREFIX.length);
	return userId.length > 0 ? userId : undefined;
}

export function userIdFromProductionChatMemoryResourceId(resourceId: string): string | undefined {
	if (!resourceId.startsWith(PRODUCTION_CHAT_MEMORY_RESOURCE_PREFIX)) return undefined;
	const userId = resourceId.slice(PRODUCTION_CHAT_MEMORY_RESOURCE_PREFIX.length);
	return userId.length > 0 ? userId : undefined;
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
