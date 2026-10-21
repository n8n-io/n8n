import { uniqueStrings, type ResolvedEpisodicScope } from '@n8n/agents';

import type { EpisodicScopeContext } from './agent-chat-integration';
import { threadMemoryResourceId } from '../utils/agent-memory-scope';

/** Bounds the thread scopes one recall reads; older threads fall out first. */
const MAX_PARTICIPATED_THREAD_SCOPES = 200;

/**
 * Thread-shared ownership. Integration threads are shared conversations, so
 * their notes belong to the thread, not to the author. A participant recalls
 * the notes of every thread they posted in, and keeps their own resource scope.
 */
export async function resolveThreadSharedEpisodicScope(
	context: EpisodicScopeContext,
): Promise<ResolvedEpisodicScope> {
	const threadScopeId = threadMemoryResourceId(context.threadId);
	const participatedThreadIds = await context.loadParticipatedThreadIds(
		MAX_PARTICIPATED_THREAD_SCOPES,
	);
	return {
		writeScopeId: threadScopeId,
		readScopeIds: uniqueStrings([
			context.resourceId,
			threadScopeId,
			...participatedThreadIds.map(threadMemoryResourceId),
		]),
	};
}
