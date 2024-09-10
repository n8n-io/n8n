import type { Workflow } from 'n8n-workflow';
import { Service } from 'typedi';
import { Push } from '../push';
import type { WorkflowClosedMessage, WorkflowOpenedMessage } from './collaboration.message';
import { parseWorkflowMessage } from './collaboration.message';
import type { IActiveWorkflowUsersChanged } from '../interfaces';
import type { OnPushMessage } from '@/push/types';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/user';
import { CollaborationState } from '@/collaboration/collaboration.state';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { UserService } from '@/services/user.service';
import { ApplicationError, ErrorReporterProxy } from 'n8n-workflow';

/**
 * Service for managing collaboration feature between users. E.g. keeping
 * track of active users for a workflow.
 */
@Service()
export class CollaborationService {
	constructor(
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
				ErrorReporterProxy.error(
					new ApplicationError('Error handling CollaborationService push message', {
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
