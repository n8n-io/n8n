import { UserError } from 'n8n-workflow';

import type {
	AgentExecutionThread,
	AgentThreadAccess,
} from '../entities/agent-execution-thread.entity';

export type AgentSessionMode = 'new' | 'existing';

export interface AgentSessionAccess {
	threadId: string;
	agentId: string | null;
	projectId: string;
	access: AgentThreadAccess;
	sessionMode: AgentSessionMode;
}

export class AgentSessionNotFoundError extends UserError {
	constructor() {
		super('Session not found');
	}
}

export function assertSessionAccess(
	thread: AgentExecutionThread | null,
	params: AgentSessionAccess,
): void {
	if (!thread) {
		if (params.sessionMode === 'existing') throw new AgentSessionNotFoundError();
		return;
	}
	if (
		thread.projectId !== params.projectId ||
		thread.agentId !== params.agentId ||
		thread.accessScope !== params.access.accessScope ||
		thread.ownerId !== params.access.ownerId
	) {
		throw new AgentSessionNotFoundError();
	}
}

export const PREVIEW_THREAD_SOURCES = ['', 'chat', 'n8n_chat'] as const;

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

export function canUseTopLevelDraftThread(thread: AgentExecutionThread, userId: string): boolean {
	return (
		thread.accessScope === 'user' && thread.ownerId === userId && thread.parentThreadId === null
	);
}
