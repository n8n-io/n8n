import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';

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
		canUseDraftThread(thread, userId, source) &&
		thread.taskId === null &&
		PREVIEW_THREAD_SOURCES.some(
			(previewSource) => previewSource === (source?.trim().toLowerCase() ?? ''),
		)
	);
}

export function canUseDraftThread(
	thread: AgentExecutionThread,
	userId: string,
	source?: string | null,
): boolean {
	return (
		thread.accessScope === 'user' &&
		thread.ownerId === userId &&
		thread.parentThreadId === null &&
		!['subagent', 'sub-agent'].includes(source?.trim().toLowerCase() ?? '')
	);
}
