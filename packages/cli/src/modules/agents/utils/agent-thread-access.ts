import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { QueuedUserChatMessage } from '../types/agent-queued-message';
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

/** The chat surface that a queued user chat message runs on. */
export function chatSurfaceForKind(kind: QueuedUserChatMessage['kind']): AgentChatSurface {
	switch (kind) {
		case 'n8n_chat':
			return 'n8n-chat';
		case 'system':
			return 'system';
		case 'preview':
			return 'preview';
	}
}

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

/*
 * The agent decides whether a thread is a system thread: a system agent has
 * only system threads, from creation on. The execution source tells Preview
 * and n8n Chat apart, but a thread has no source before its first execution.
 * So every rule takes `isSystemAgent`, and a system thread never passes a
 * project-agent rule, nor the reverse.
 */

export function canContinueThreadInPreview(
	thread: AgentExecutionThread,
	userId: string,
	source: string | null | undefined,
	isSystemAgent: boolean,
): boolean {
	return (
		!isSystemAgent &&
		isOpenChatThread(thread, userId) &&
		PREVIEW_THREAD_SOURCES.some(
			(previewSource) => previewSource === (source?.trim().toLowerCase() ?? ''),
		)
	);
}

export function canContinueThreadInN8nChat(
	thread: AgentExecutionThread,
	userId: string,
	source: string | null | undefined,
	isSystemAgent: boolean,
): boolean {
	return (
		!isSystemAgent && isOpenChatThread(thread, userId) && source === N8N_CHAT_PRODUCTION_SOURCE
	);
}

/** A system thread does not check the execution source, so it works before the first turn. */
export function canContinueSystemThread(
	thread: AgentExecutionThread,
	userId: string,
	isSystemAgent: boolean,
): boolean {
	return isSystemAgent && isOpenChatThread(thread, userId);
}

/** Whether the user can continue the thread with a message on the chat surface. */
export function canContinueThreadOnSurface(
	surface: AgentChatSurface,
	thread: AgentExecutionThread,
	userId: string,
	source: string | null | undefined,
	isSystemAgent: boolean,
): boolean {
	switch (surface) {
		case 'n8n-chat':
			return canContinueThreadInN8nChat(thread, userId, source, isSystemAgent);
		case 'system':
			return canContinueSystemThread(thread, userId, isSystemAgent);
		case 'preview':
			return canContinueThreadInPreview(thread, userId, source, isSystemAgent);
	}
}

/**
 * The part that every chat surface shares: a top-level private thread of the
 * user that is not a task thread.
 */
function isOpenChatThread(thread: AgentExecutionThread, userId: string): boolean {
	return canUseTopLevelDraftThread(thread, userId) && thread.taskId === null;
}

export function canUseTopLevelDraftThread(thread: AgentExecutionThread, userId: string): boolean {
	return (
		thread.accessScope === 'user' && thread.ownerId === userId && thread.parentThreadId === null
	);
}
