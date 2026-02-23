import type { PushPayload } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { Workflow } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
	WriteAccessRequestedMessage,
	WriteAccessReleaseRequestedMessage,
	WriteAccessHeartbeatMessage,
} from './collaboration.message';
import { parseWorkflowMessage } from './collaboration.message';

import { CollaborationState } from '@/collaboration/collaboration.state';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { LockedError } from '@/errors/response-errors/locked.error';
import { Push } from '@/push';
import type { OnPushMessage } from '@/push/types';
import { AccessService } from '@/services/access.service';

/**
 * Service for managing collaboration feature between users. E.g. keeping
 * track of active users for a workflow.
 */
@Service()
export class CollaborationService {
	constructor(
		private readonly errorReporter: ErrorReporter,
		private readonly push: Push,
		private readonly state: CollaborationState,
		private readonly userRepository: UserRepository,
		private readonly accessService: AccessService,
	) {}

	init() {
		this.push.on('message', async (event: OnPushMessage) => {
			try {
				await this.handleUserMessage(event.userId, event.pushRef, event.msg);
			} catch (error) {
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
		const currentLock = await this.state.getWriteLock(workflowId);
		if (currentLock?.clientId === clientId) {
			await this.state.releaseWriteLock(workflowId);
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
			const currentLock = await this.state.getWriteLock(workflowId);
			if (currentLock && currentLock.clientId !== clientId) {
				return;
			}

			await this.state.setWriteLock(workflowId, clientId, userId);
		}

		await this.sendWriteAccessAcquiredMessage(workflowId, userId, clientId);
	}

	private async handleWriteAccessReleaseRequested(
		_userId: User['id'],
		clientId: string,
		msg: WriteAccessReleaseRequestedMessage,
	) {
		const { workflowId } = msg;

		const currentLock = await this.state.getWriteLock(workflowId);

		if (currentLock?.clientId !== clientId) {
			return;
		}

		await this.state.releaseWriteLock(workflowId);
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
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

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
			return;
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
}
