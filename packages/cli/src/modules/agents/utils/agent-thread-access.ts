import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { userIdFromDraftChatMemoryResourceId } from './agent-memory-scope';

export type AgentSessionMode = 'new' | 'existing';

export const PREVIEW_THREAD_SOURCES = ['', 'chat', 'n8n_chat'] as const;
export const N8N_CHAT_PRODUCTION_SOURCE = 'n8n_chat_production';

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

/**
 * A thread that its owner shared with the thread's project. Teammates can read it.
 * Other project threads (for example chat integrations) have no owner.
 */
export function isSharedThread(thread: Pick<AgentExecutionThread, 'accessScope' | 'ownerId'>) {
	return thread.accessScope === 'project' && thread.ownerId !== null;
}

/** A shared thread keeps its owner, so only the owner continues it, as before the share. */
export function canUseTopLevelDraftThread(thread: AgentExecutionThread, userId: string): boolean {
	return thread.ownerId === userId && thread.parentThreadId === null;
}

/**
 * Whether a project thread shows an open checkpoint that is stored under `resourceId`. A
 * shared thread runs in the draft-chat memory of its owner. Other project threads use no
 * draft-chat memory.
 */
export function isProjectThreadCheckpoint(
	thread: Pick<AgentExecutionThread, 'ownerId'>,
	resourceId: string | undefined,
): boolean {
	const userId = userIdFromDraftChatMemoryResourceId(resourceId ?? '');
	return userId === undefined || userId === thread.ownerId;
}
