import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
	systemChatMemoryResourceId,
} from './agent-memory-scope';

export type AgentSessionMode = 'new' | 'existing';

export const PREVIEW_THREAD_SOURCES = ['', 'chat', 'n8n_chat'] as const;
export const N8N_CHAT_PRODUCTION_SOURCE = 'n8n_chat_production' as const;
/** Transcript source of a system-agent turn. It is not a Preview source. */
export const SYSTEM_CHAT_SOURCE = 'system_chat' as const;

/**
 * The n8n UI chat that a person watches the turn in. Integrations and tasks have none.
 * `system` is the chat with a code-defined system agent.
 */
export type AgentChatSurface = 'preview' | 'n8n-chat' | 'system';

/** The memory resource ID that scopes a thread to its owning user on the given chat surface. */
export function chatSurfaceMemoryResourceId(surface: AgentChatSurface, userId: string): string {
	switch (surface) {
		case 'n8n-chat':
			return productionChatMemoryResourceId(userId);
		case 'system':
			return systemChatMemoryResourceId(userId);
		case 'preview':
			return draftChatMemoryResourceId(userId);
	}
}

export function threadBelongsTo(
	thread: AgentExecutionThread,
	projectId: string,
	agentId: string,
	userId: string,
): boolean {
	return (
		thread.projectId === projectId &&
		thread.agentId === agentId &&
		(thread.accessScope === 'project' ||
			(thread.accessScope === 'user' && thread.ownerId !== null && thread.ownerId === userId))
	);
}

export function canContinueThreadInPreview(
	thread: AgentExecutionThread,
	userId: string,
	source?: string | null,
): boolean {
	return (
		canUseTopLevelDraftThread(thread, userId) &&
		thread.taskId === null &&
		PREVIEW_THREAD_SOURCES.some(
			(previewSource) => previewSource === (source?.trim().toLowerCase() ?? ''),
		)
	);
}

export function canContinueThreadInN8nChat(
	thread: AgentExecutionThread,
	userId: string,
	source?: string | null,
): boolean {
	return (
		canUseTopLevelDraftThread(thread, userId) &&
		thread.taskId === null &&
		source === N8N_CHAT_PRODUCTION_SOURCE
	);
}

export function canContinueSystemThread(
	thread: AgentExecutionThread,
	userId: string,
	source?: string | null,
): boolean {
	return (
		canUseTopLevelDraftThread(thread, userId) &&
		thread.taskId === null &&
		source === SYSTEM_CHAT_SOURCE
	);
}

export function canUseTopLevelDraftThread(thread: AgentExecutionThread, userId: string): boolean {
	return (
		thread.accessScope === 'user' && thread.ownerId === userId && thread.parentThreadId === null
	);
}
