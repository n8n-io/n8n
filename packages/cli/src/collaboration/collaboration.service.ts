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
	WriteAccessAcquiredMessage,
	WriteAccessReleasedMessage,
} from './collaboration.message';
import { parseWorkflowMessage } from './collaboration.message';

import { CollaborationState } from '@/collaboration/collaboration.state';
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
				await this.handleUserMessage(event.userId, event.msg);
			} catch (error) {
				this.errorReporter.error(
					new UnexpectedError('Error handling CollaborationService push message', {
						extra: {
							msg: event.msg,
							userId: event.userId,
						},
						cause: error,
					}),
				);
			}
		});
	}

	async handleUserMessage(userId: User['id'], msg: unknown) {
		const workflowMessage = await parseWorkflowMessage(msg);

		if (workflowMessage.type === 'workflowOpened') {
			await this.handleWorkflowOpened(userId, workflowMessage);
		} else if (workflowMessage.type === 'workflowClosed') {
			await this.handleWorkflowClosed(userId, workflowMessage);
		} else if (workflowMessage.type === 'writeAccessAcquired') {
			await this.handleWriteAccessAcquired(userId, workflowMessage);
		} else if (workflowMessage.type === 'writeAccessReleased') {
			await this.handleWriteAccessReleased(userId, workflowMessage);
		}
	}

	private async handleWorkflowOpened(userId: User['id'], msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		await this.state.addCollaborator(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async handleWorkflowClosed(userId: User['id'], msg: WorkflowClosedMessage) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		// If the user closing the workflow holds the write lock, release it
		const currentLockHolder = await this.state.getWriteLock(workflowId);
		if (currentLockHolder === userId) {
			console.log('[CollaborationService] 🔓 Releasing write lock - user closed workflow');
			await this.state.releaseWriteLock(workflowId);
			await this.sendWriteAccessReleasedMessage(workflowId);
		}

		await this.state.removeCollaborator(workflowId, userId);

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

	private async handleWriteAccessAcquired(userId: User['id'], msg: WriteAccessAcquiredMessage) {
		const { workflowId, userId: requestedUserId } = msg;

		if (userId !== requestedUserId) {
			return;
		}

		if (!(await this.accessService.hasWriteAccess(userId, workflowId))) {
			return;
		}

		await this.state.setWriteLock(workflowId, userId);

		await this.sendWriteAccessAcquiredMessage(workflowId, userId);
	}

	private async handleWriteAccessReleased(userId: User['id'], msg: WriteAccessReleasedMessage) {
		const { workflowId } = msg;

		if (!(await this.accessService.hasReadAccess(userId, workflowId))) {
			return;
		}

		const currentLockHolder = await this.state.getWriteLock(workflowId);

		if (currentLockHolder !== userId) {
			return;
		}

		await this.state.releaseWriteLock(workflowId);
		await this.sendWriteAccessReleasedMessage(workflowId);
	}

	private async sendWriteAccessAcquiredMessage(workflowId: Workflow['id'], userId: User['id']) {
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map((user) => user.userId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'writeAccessAcquired'> = {
			workflowId,
			userId,
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

	async broadcastWorkflowUpdate(
		workflowId: Workflow['id'],
		versionId: string,
		updatedByUserId: User['id'],
	) {
		const collaborators = await this.state.getCollaborators(workflowId);
		// Filter out the user who made the update
		const userIds = collaborators
			.map((user) => user.userId)
			.filter((userId) => userId !== updatedByUserId);

		if (userIds.length === 0) {
			return;
		}

		const msgData: PushPayload<'workflowUpdated'> = {
			workflowId,
			versionId,
			userId: updatedByUserId,
		};

		this.push.sendToUsers({ type: 'workflowUpdated', data: msgData }, userIds);
	}

	/**
	 * Exposes write-lock state to allow clients to restore read-only mode
	 * after page refresh, since write-lock is persisted in backend cache
	 * but lost in frontend memory
	 */
	async getWriteLock(workflowId: Workflow['id']): Promise<User['id'] | null> {
		const lockHolder = await this.state.getWriteLock(workflowId);
		console.log('[CollaborationService] 🔍 Fetched write-lock for workflow', {
			workflowId,
			lockHolder,
		});
		return lockHolder;
	}
}
