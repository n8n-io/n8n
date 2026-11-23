import { CollaborationState, type WriteLock } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, LockedError, NotFoundError } from '@n8n/errors';

import { AgentRepository } from './repositories/agent.repository';

/** Checks the agent write locks that the collaboration push messages set. */
@Service()
export class AgentWriteLockService {
	constructor(
		private readonly state: CollaborationState,
		private readonly agentRepository: AgentRepository,
	) {}

	/**
	 * Exposes agent write-lock state to allow clients to restore read-only mode
	 * after page refresh, since write-lock is persisted in backend cache
	 * but lost in frontend memory.
	 *
	 * The caller (a `@ProjectScope('agent:read')` route) has already verified
	 * the user's scope in `projectId`; this only confirms the agent lives there.
	 */
	async getAgentWriteLock(
		projectId: string,
		agentId: string,
	): Promise<{ clientId: string; userId: string } | null> {
		const exists = await this.agentRepository.existsByIdAndProjectId(agentId, projectId);
		if (!exists) {
			return null;
		}

		return await this.state.getAgentWriteLock(agentId);
	}

	/**
	 * Throws if any user currently holds the write lock for the given agent.
	 * Used by Instance AI builder mutations to refuse writes while a user is
	 * editing the agent in the builder.
	 */
	async ensureAgentEditable(agentId: string): Promise<void> {
		const lock = await this.state.getAgentWriteLock(agentId);
		if (lock) {
			throw new LockedError(
				'Cannot modify agent while it is being edited by a user in the builder.',
			);
		}
	}

	/**
	 * Validates that if a write lock exists for an agent, the requesting client holds it.
	 * Throws ConflictError (409) if same user but different tab holds the lock.
	 * Throws LockedError (423) if different user holds the lock.
	 */
	async validateAgentWriteLock(
		userId: User['id'],
		clientId: string | undefined,
		projectId: string,
		agentId: string,
		action: string,
	): Promise<void> {
		// Validate the agent belongs to the given project before checking
		// the lock. Without this, a request with an agentId from a different
		// project would return 409/423 (leaking lock state) instead of the
		// expected 404 from the downstream project-boundary check.
		const exists = await this.agentRepository.existsByIdAndProjectId(agentId, projectId);
		if (!exists) {
			throw new NotFoundError('Agent not found');
		}

		if (!clientId) {
			return;
		}

		const lock = await this.state.getAgentWriteLock(agentId);
		if (lock) {
			this.assertAgentLockHeldBy(lock, userId, clientId, action);
		}
	}

	/**
	 * Batch variant of `validateAgentWriteLock` for agents the caller already
	 * loaded from the repository, so the project boundary is established and
	 * the per-agent existence query is skipped. All locks are read in one
	 * cache round-trip. Throws on the first agent locked by another client.
	 */
	async validateAgentWriteLocks(
		userId: User['id'],
		clientId: string | undefined,
		agentIds: string[],
		action: string,
	): Promise<void> {
		if (!clientId || agentIds.length === 0) {
			return;
		}

		const locks = await this.state.getAgentWriteLocks(agentIds);
		for (const lock of locks.values()) {
			this.assertAgentLockHeldBy(lock, userId, clientId, action);
		}
	}

	private assertAgentLockHeldBy(
		lock: WriteLock,
		userId: User['id'],
		clientId: string,
		action: string,
	): void {
		if (lock.clientId === clientId) {
			if (lock.userId === userId) {
				return;
			}
			// clientId was copied — a different user is impersonating the holder
			throw new LockedError(`Cannot ${action} agent - another user currently has write access`);
		}

		if (lock.userId === userId) {
			// Same user, different tab
			throw new ConflictError(`Cannot ${action} agent - you have this agent open in another tab`);
		}
		// Different user
		throw new LockedError(`Cannot ${action} agent - another user currently has write access`);
	}
}
