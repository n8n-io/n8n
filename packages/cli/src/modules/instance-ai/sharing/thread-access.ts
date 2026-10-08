import { hasScope, type Scope } from '@n8n/permissions';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import { isSharedThread } from '../../agents/utils/agent-thread-access';

/** The thread fields that decide who can use an Assistant thread. */
export type ThreadAccessFacts = Pick<AgentExecutionThread, 'ownerId' | 'accessScope'>;

/** The user who asks. */
export interface ThreadViewer {
	id: string;
}

/** A teammate reads a shared thread with the same scopes that the Assistant needs to work in the project. */
const READ_SCOPES: Scope[] = ['instanceAi:message', 'project:read'];

function holdsAll(required: readonly Scope[], held: readonly Scope[]): boolean {
	return hasScope([...required], { global: [], project: [...held] }, undefined, { mode: 'allOf' });
}

export function isThreadOwner(user: ThreadViewer, thread: ThreadAccessFacts): boolean {
	// A user id is never null, so a thread without owner has no owner here.
	return thread.ownerId === user.id;
}

/**
 * Whether `membership` (a user's scopes in a project, global role included) can read the
 * threads that their owners shared in that project.
 */
export function canReadSharedThreads(membership: readonly Scope[]): boolean {
	return holdsAll(READ_SCOPES, membership);
}

/**
 * The owner reads the thread. Another user reads it only when the owner shared it and
 * `membership` (the user's scopes in the thread's project) holds the read scopes.
 */
export function canRead(
	user: ThreadViewer,
	thread: ThreadAccessFacts,
	membership: readonly Scope[],
): boolean {
	if (isThreadOwner(user, thread)) return true;
	return isSharedThread(thread) && canReadSharedThreads(membership);
}

/**
 * Only the owner shares a thread, and only into a project where the owner can read
 * shared threads, so that the owner stays one of its readers.
 */
export function canShare(
	user: ThreadViewer,
	thread: ThreadAccessFacts,
	membership: readonly Scope[],
): boolean {
	return isThreadOwner(user, thread) && canReadSharedThreads(membership);
}

/** Only the owner sends messages. Every turn runs as the owner. */
export function canSend(user: ThreadViewer, thread: ThreadAccessFacts): boolean {
	return isThreadOwner(user, thread);
}

/**
 * The owner answers every card. A reader answers a card only with every scope in
 * `requiredScopes` in the thread's project. An empty `requiredScopes` lets no reader answer.
 */
export function canApprove(
	user: ThreadViewer,
	thread: ThreadAccessFacts,
	requiredScopes: readonly Scope[],
	scopesInProject: readonly Scope[],
): boolean {
	if (isThreadOwner(user, thread)) return true;
	return canRead(user, thread, scopesInProject) && holdsAll(requiredScopes, scopesInProject);
}
