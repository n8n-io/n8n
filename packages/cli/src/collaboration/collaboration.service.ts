import type { Workflow } from 'n8n-workflow';
import { Service } from 'typedi';
import { Push } from '../push';
import { Logger } from '@/logger';
import type { WorkflowClosedMessage, WorkflowOpenedMessage } from './collaboration.message';
import { isWorkflowClosedMessage, isWorkflowOpenedMessage } from './collaboration.message';
import type { IActiveWorkflowUsersChanged } from '../interfaces';
import type { OnPushMessage } from '@/push/types';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/user';
import { CollaborationState } from '@/collaboration/collaboration.state';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { UserService } from '@/services/user.service';

/**
 * Service for managing collaboration feature between users. E.g. keeping
 * track of active users for a workflow.
 */
@Service()
export class CollaborationService {
	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly state: CollaborationState,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	init() {
		this.push.on('message', async (event: OnPushMessage) => {
			try {
				await this.handleUserMessage(event.userId, event.msg);
			} catch (error) {
				this.logger.error('Error handling user message', {
					error: error as unknown,
					msg: event.msg,
					userId: event.userId,
				});
			}
		});
	}

	async handleUserMessage(userId: User['id'], msg: unknown) {
		if (isWorkflowOpenedMessage(msg)) {
			await this.handleWorkflowOpened(userId, msg);
		} else if (isWorkflowClosedMessage(msg)) {
			await this.handleWorkflowClosed(userId, msg);
		}
	}

	private async handleWorkflowOpened(userId: User['id'], msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;

		if (!(await this.hasUserAccessToWorkflow(userId, workflowId))) {
			return;
		}

		await this.state.addActiveWorkflowUser(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async handleWorkflowClosed(userId: User['id'], msg: WorkflowClosedMessage) {
		const { workflowId } = msg;

		if (!(await this.hasUserAccessToWorkflow(userId, workflowId))) {
			return;
		}

		await this.state.removeActiveWorkflowUser(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async sendWorkflowUsersChangedMessage(workflowId: Workflow['id']) {
		// We have already validated that all active workflow users
		// have proper access to the workflow, so we don't need to validate it again
		const activeWorkflowUsers = await this.state.getActiveWorkflowUsers(workflowId);
		const workflowUserIds = activeWorkflowUsers.map((user) => user.userId);

		if (workflowUserIds.length === 0) {
			return;
		}
		const users = await this.userRepository.getByIds(this.userRepository.manager, workflowUserIds);

		const msgData: IActiveWorkflowUsersChanged = {
			workflowId,
			activeUsers: await Promise.all(
				users.map(async (user) => ({
					user: await this.userService.toPublic(user),
					lastSeen: activeWorkflowUsers.find((activeUser) => activeUser.userId === user.id)!
						.lastSeen,
				})),
			),
		};

		this.push.sendToUsers('activeWorkflowUsersChanged', msgData, workflowUserIds);
	}

	private async hasUserAccessToWorkflow(userId: User['id'], workflowId: Workflow['id']) {
		const user = await this.userRepository.findOneBy({
			id: userId,
		});
		if (!user) {
			return false;
		}

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		return !!workflow;
	}
}
