import type { PushPayload } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IWorkflowSettings, Workflow } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import { parseWorkflowMessage } from './collaboration.message';
import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
	WriteAccessRequestedMessage,
	WriteAccessReleaseRequestedMessage,
	WriteAccessHeartbeatMessage,
	AgentOpenedMessage,
	AgentClosedMessage,
	AgentWriteAccessRequestedMessage,
	AgentWriteAccessReleaseRequestedMessage,
	AgentWriteAccessHeartbeatMessage,
} from './collaboration.message';

import { CollaborationState, type WriteLock } from '@/collaboration/collaboration.state';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LockedError } from '@/errors/response-errors/locked.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { Push } from '@/push';
import type { OnPushMessage } from '@/push/types';
import { userHasScopes } from '@/permissions.ee/check-access';
import { AccessService } from '@/services/access.service';

const OPEN_WORKFLOW_CHECK_BATCH_SIZE = 100;

/**
 * Service for managing collaboration feature between users. E.g. keeping
 * track of active users for a workflow.
 */
@Service()
export class CollaborationService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly push: Push,
		private readonly state: CollaborationState,
		private readonly userRepository: UserRepository,
		private readonly accessService: AccessService,
		private readonly agentRepository: AgentRepository,
	) {}

	init() {
		this.push.on('message', async (event: OnPushMessage) => {
			try {
				await this.handleUserMessage(event.userId, event.pushRef, event.msg);
			} catch (error) {
				if (this.isTransientError(error)) {
					this.logger.debug('Transient infrastructure error in collaboration service', {
						error,
					});
					return;
				}

				this.errorReporter.error(
					new UnexpectedError('Error handling CollaborationService push message', {
						extra: {
							msg: event.msg,
							userId: event.userId,
							pushRef: event.pushRef,
						},
						cause: error,
					}),
				);
			}
		});
	}

	private isTransientError(error: unknown): error is NodeJS.ErrnoException {
		return (
			error instanceof Error &&
			'code' in error &&
			typeof error.code === 'string' &&
			['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(error.code)
		);
	}

	async handleUserMessage(userId: User['id'], clientId: string, msg: unknown) {
		const workflowMessage = await parseWorkflowMessage(msg);

		if (workflowMessage.type === 'workflowOpened') {
			await this.handleWorkflowOpened(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'workflowClosed') {
			await this.handleWorkflowClosed(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'writeAccessRequested') {
			await this.handleWriteAccessRequested(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'writeAccessReleaseRequested') {
			await this.handleWriteAccessReleaseRequested(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'writeAccessHeartbeat') {
			await this.handleWriteAccessHeartbeat(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'agentOpened') {
			await this.handleAgentOpened(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'agentClosed') {
			await this.handleAgentClosed(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'agentWriteAccessRequested') {
			await this.handleAgentWriteAccessRequested(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'agentWriteAccessReleaseRequested') {
			await this.handleAgentWriteAccessReleaseRequested(userId, clientId, workflowMessage);
		} else if (workflowMessage.type === 'agentWriteAccessHeartbeat') {
			await this.handleAgentWriteAccessHeartbeat(userId, clientId, workflowMessage);
		}
	}

	private async handleWorkflowOpened(
		userId: User['id'],
		clientId: string,
		msg: WorkflowOpenedMessage,
	) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		await this.state.addCollaborator(workflowId, userId, clientId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async handleWorkflowClosed(
		userId: User['id'],
		clientId: string,
		msg: WorkflowClosedMessage,
	) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		// If the user closing the workflow holds the write lock, release it
		const released = await this.state.releaseWriteLockIfHolder(workflowId, clientId);
		if (released) {
			await this.sendWriteAccessReleasedMessage(workflowId);
		}

		await this.state.removeCollaborator(workflowId, clientId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async sendWorkflowUsersChangedMessage(workflowId: Workflow['id']) {
		// We have already validated that all active workflow users
		// have proper access to the workflow, so we don't need to validate it again
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}
		const users = await this.userRepository.getByIds(this.userRepository.manager, userIds);
		const activeCollaborators = users.map((user) => ({
			user: user.toIUser(),
			lastSeen: collaborators.find(({ userId }) => userId === user.id)!.lastSeen,
		}));
		const msgData: PushPayload<'collaboratorsChanged'> = {
			workflowId,
			collaborators: activeCollaborators,
		};

		this.push.sendToUsers({ type: 'collaboratorsChanged', data: msgData }, userIds);
	}

	private async handleWriteAccessRequested(
		userId: User['id'],
		clientId: string,
		msg: WriteAccessRequestedMessage,
	) {
		const { workflowId, force } = msg;

		if (!(await this.accessService.hasWriteAccess(userId, workflowId))) {
			return;
		}

		if (force) {
			const acquired = await this.state.acquireWriteLockForce(workflowId, clientId, userId);
			if (!acquired) {
				return;
			}
		} else {
			const acquired = await this.state.acquireWriteLock(workflowId, clientId, userId);
			if (!acquired) {
				return;
			}
		}

		await this.sendWriteAccessAcquiredMessage(workflowId, userId, clientId);
	}

	private async handleWriteAccessReleaseRequested(
		_userId: User['id'],
		clientId: string,
		msg: WriteAccessReleaseRequestedMessage,
	) {
		const { workflowId } = msg;

		const released = await this.state.releaseWriteLockIfHolder(workflowId, clientId);
		if (!released) {
			return;
		}

		await this.sendWriteAccessReleasedMessage(workflowId);
	}

	private async handleWriteAccessHeartbeat(
		_userId: User['id'],
		clientId: string,
		msg: WriteAccessHeartbeatMessage,
	) {
		const { workflowId } = msg;

		// Renew the write lock TTL if the client holds it
		await this.state.renewWriteLock(workflowId, clientId);
	}

	private async sendWriteAccessAcquiredMessage(
		workflowId: Workflow['id'],
		userId: User['id'],
		clientId: string,
	) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const collaboratorUserIds = collaborators.map((user) => user.userId);
		// Always include the requesting user, even if their workflowOpened
		// message hasn't been processed yet — push messages are handled
		// concurrently, so collaborator registration may lag behind lock
		// acquisition and the requesting tab would never receive this.
		const userIds = [...new Set([...collaboratorUserIds, userId])];

		const msgData: PushPayload<'writeAccessAcquired'> = {
			workflowId,
			userId,
			clientId,
		};

		this.push.sendToUsers({ type: 'writeAccessAcquired', data: msgData }, userIds);
	}

	private async sendWriteAccessReleasedMessage(workflowId: Workflow['id']) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'writeAccessReleased'> = {
			workflowId,
		};

		this.push.sendToUsers({ type: 'writeAccessReleased', data: msgData }, userIds);
	}

	async broadcastWorkflowUpdate(workflowId: Workflow['id'], updatedByUserId: User['id']) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'workflowUpdated'> = {
			workflowId,
			userId: updatedByUserId,
		};

		this.push.sendToUsers({ type: 'workflowUpdated', data: msgData }, userIds);
	}

	async filterOpenWorkflowIds(workflowIds: Array<Workflow['id']>): Promise<Array<Workflow['id']>> {
		const uniqueWorkflowIds = [...new Set(workflowIds)];
		const openWorkflowIds: Array<Workflow['id']> = [];

		for (let start = 0; start < uniqueWorkflowIds.length; start += OPEN_WORKFLOW_CHECK_BATCH_SIZE) {
			const chunk = uniqueWorkflowIds.slice(start, start + OPEN_WORKFLOW_CHECK_BATCH_SIZE);
			const collaboratorLookups = await Promise.allSettled(
				chunk.map(async (workflowId) => {
					const collaborators = await this.state.getCollaborators(workflowId);
					return { workflowId, isOpen: collaborators.length > 0 };
				}),
			);
			const failedWorkflowIds: Array<Workflow['id']> = [];

			for (const [index, result] of collaboratorLookups.entries()) {
				if (result.status === 'fulfilled') {
					if (result.value.isOpen) openWorkflowIds.push(result.value.workflowId);
				} else {
					const workflowId = chunk[index];
					if (workflowId) failedWorkflowIds.push(workflowId);
				}
			}

			if (failedWorkflowIds.length > 0) {
				this.logger.warn('Failed to resolve collaborators while filtering open workflows', {
					workflowCount: failedWorkflowIds.length,
					workflowIds: failedWorkflowIds.slice(0, 10),
				});
			}
		}

		return openWorkflowIds;
	}

	/**
	 * Notifies open collaborators of a workflow that (a subset of) its
	 * `settings` were updated out-of-band (e.g. via the MCP toggle endpoint),
	 */
	async broadcastWorkflowSettingsUpdated(
		workflowId: Workflow['id'],
		settings: Partial<IWorkflowSettings>,
		checksum?: string,
	) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'workflowSettingsUpdated'> = {
			workflowId,
			settings,
			...(checksum !== undefined ? { checksum } : {}),
		};

		this.push.sendToUsers({ type: 'workflowSettingsUpdated', data: msgData }, userIds);
	}

	/**
	 * Invalidation-only: clients refetch the authoritative status. Delivery is best-effort and
	 * per-instance; cross-main viewers heal via focus/reconnect refetch. Review lifecycle write
	 * paths must call this after their transactions commit.
	 */
	async broadcastWorkflowReviewStateChanged(workflowId: Workflow['id']) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'workflowReviewStateChanged'> = {
			workflowId,
		};

		this.push.sendToUsers({ type: 'workflowReviewStateChanged', data: msgData }, userIds);
	}

	/**
	 * Exposes write-lock state to allow clients to restore read-only mode
	 * after page refresh, since write-lock is persisted in backend cache
	 * but lost in frontend memory
	 */
	async getWriteLock(
		userId: User['id'],
		workflowId: Workflow['id'],
	): Promise<{ clientId: string; userId: string } | null> {
		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return null;
		}

		return await this.state.getWriteLock(workflowId);
	}

	/**
	 * Throws if any user currently holds the write lock for the given workflow.
	 */
	async ensureWorkflowEditable(workflowId: Workflow['id']): Promise<void> {
		const lock = await this.state.getWriteLock(workflowId);
		if (lock) {
			throw new LockedError(
				'Cannot modify workflow while it is being edited by a user in the editor.',
			);
		}
	}

	/**
	 * Validates that if a write lock exists for a workflow, the requesting client holds it.
	 * Throws ConflictError (409) if same user but different tab holds the lock.
	 * Throws LockedError (423) if different user holds the lock.
	 */
	async validateWriteLock(
		userId: User['id'],
		clientId: string | undefined,
		workflowId: Workflow['id'],
		action: string,
	): Promise<void> {
		if (!clientId) {
			return;
		}

		const lock = await this.state.getWriteLock(workflowId);

		if (!lock) {
			return;
		}

		if (lock.clientId === clientId) {
			if (lock.userId === userId) {
				return;
			}
			// clientId was copied — a different user is impersonating the holder
			throw new LockedError(`Cannot ${action} workflow - another user currently has write access`);
		}

		if (lock.userId === userId) {
			// Same user, different tab
			throw new ConflictError(
				`Cannot ${action} workflow - you have this workflow open in another tab`,
			);
		} else {
			// Different user
			throw new LockedError(`Cannot ${action} workflow - another user currently has write access`);
		}
	}

	// --- Agent-scoped collaboration --------------------------------------

	/**
	 * Whether the user holds `scope` in the agent's project. Agents have no
	 * sharing table, so the check is the project-level scope on the agent's
	 * owning project. The agent and user lookups are independent, so they run
	 * in parallel — this runs on every collaboration push message.
	 */
	private async hasAgentScope(
		userId: User['id'],
		agentId: string,
		scope: 'agent:read' | 'agent:update',
	): Promise<boolean> {
		const [projectId, user] = await Promise.all([
			this.agentRepository.getProjectIdById(agentId),
			this.userRepository.findOne({ where: { id: userId }, relations: ['role'] }),
		]);
		if (!projectId || !user) return false;
		return await userHasScopes(user, [scope], false, { projectId });
	}

	private async hasAgentReadAccess(userId: User['id'], agentId: string): Promise<boolean> {
		return await this.hasAgentScope(userId, agentId, 'agent:read');
	}

	private async hasAgentWriteAccess(userId: User['id'], agentId: string): Promise<boolean> {
		return await this.hasAgentScope(userId, agentId, 'agent:update');
	}

	private async handleAgentOpened(userId: User['id'], clientId: string, msg: AgentOpenedMessage) {
		const { agentId } = msg;

		if (!(await this.hasAgentReadAccess(userId, agentId))) {
			return;
		}

		await this.state.addAgentCollaborator(agentId, userId, clientId);

		await this.sendAgentUsersChangedMessage(agentId);
	}

	private async handleAgentClosed(userId: User['id'], clientId: string, msg: AgentClosedMessage) {
		const { agentId } = msg;

		if (!(await this.hasAgentReadAccess(userId, agentId))) {
			return;
		}

		// If the user closing the agent holds the write lock, release it
		const released = await this.state.releaseAgentWriteLockIfHolder(agentId, clientId);
		if (released) {
			await this.sendAgentWriteAccessReleasedMessage(agentId);
		}

		await this.state.removeAgentCollaborator(agentId, clientId);

		await this.sendAgentUsersChangedMessage(agentId);
	}

	private async sendAgentUsersChangedMessage(agentId: string) {
		const collaborators = await this.state.getAgentCollaborators(agentId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}
		const users = await this.userRepository.getByIds(this.userRepository.manager, userIds);
		const activeCollaborators = users.map((user) => ({
			user: user.toIUser(),
			lastSeen: collaborators.find(({ userId }) => userId === user.id)!.lastSeen,
		}));
		const msgData: PushPayload<'collaboratorsChanged'> = {
			agentId,
			collaborators: activeCollaborators,
		};

		this.push.sendToUsers({ type: 'collaboratorsChanged', data: msgData }, userIds);
	}

	private async handleAgentWriteAccessRequested(
		userId: User['id'],
		clientId: string,
		msg: AgentWriteAccessRequestedMessage,
	) {
		const { agentId, force } = msg;

		if (!(await this.hasAgentWriteAccess(userId, agentId))) {
			return;
		}

		if (force) {
			const acquired = await this.state.acquireAgentWriteLockForce(agentId, clientId, userId);
			if (!acquired) {
				return;
			}
		} else {
			const acquired = await this.state.acquireAgentWriteLock(agentId, clientId, userId);
			if (!acquired) {
				return;
			}
		}

		await this.sendAgentWriteAccessAcquiredMessage(agentId, userId, clientId);
	}

	private async handleAgentWriteAccessReleaseRequested(
		_userId: User['id'],
		clientId: string,
		msg: AgentWriteAccessReleaseRequestedMessage,
	) {
		const { agentId } = msg;

		const released = await this.state.releaseAgentWriteLockIfHolder(agentId, clientId);
		if (!released) {
			return;
		}

		await this.sendAgentWriteAccessReleasedMessage(agentId);
	}

	private async handleAgentWriteAccessHeartbeat(
		_userId: User['id'],
		clientId: string,
		msg: AgentWriteAccessHeartbeatMessage,
	) {
		const { agentId } = msg;

		// Renew the write lock TTL if the client holds it
		await this.state.renewAgentWriteLock(agentId, clientId);
	}

	private async sendAgentWriteAccessAcquiredMessage(
		agentId: string,
		userId: User['id'],
		clientId: string,
	) {
		const collaborators = await this.state.getAgentCollaborators(agentId);
		const collaboratorUserIds = collaborators.map((user) => user.userId);
		// Always include the requesting user — push messages are handled
		// concurrently, so agentOpened may not have registered this tab yet.
		const userIds = [...new Set([...collaboratorUserIds, userId])];

		const msgData: PushPayload<'writeAccessAcquired'> = {
			agentId,
			userId,
			clientId,
		};

		this.push.sendToUsers({ type: 'writeAccessAcquired', data: msgData }, userIds);
	}

	private async sendAgentWriteAccessReleasedMessage(agentId: string) {
		const collaborators = await this.state.getAgentCollaborators(agentId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'writeAccessReleased'> = {
			agentId,
		};

		this.push.sendToUsers({ type: 'writeAccessReleased', data: msgData }, userIds);
	}

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
