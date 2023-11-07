import type { Workflow } from 'n8n-workflow';
import { Service } from 'typedi';
import { Push } from '../push';
import { Logger } from '@/Logger';
import type { WorkflowClosedMessage, WorkflowOpenedMessage } from './collaboration.message';
import { isWorkflowClosedMessage, isWorkflowOpenedMessage } from './collaboration.message';
import { UserService } from '../services/user.service';
import type { IActiveWorkflowUsersChanged } from '../Interfaces';
import type { OnPushMessageEvent } from '@/push/types';
import { CollaborationState } from '@/collaboration/collaboration.state';

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
		private readonly userService: UserService,
	) {
		if (!push.isBidirectional) {
			logger.warn(
				'Collaboration features are disabled because push is configured unidirectional. Use N8N_PUSH_BACKEND=websocket environment variable to enable them.',
			);
			return;
		}

		this.push.on('message', async (event: OnPushMessageEvent) => {
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

	async handleUserMessage(userId: string, msg: unknown) {
		if (isWorkflowOpenedMessage(msg)) {
			await this.handleWorkflowOpened(userId, msg);
		} else if (isWorkflowClosedMessage(msg)) {
			await this.handleWorkflowClosed(userId, msg);
		}
	}

	private async handleWorkflowOpened(userId: string, msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;

		this.state.addActiveWorkflowUser(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async handleWorkflowClosed(userId: string, msg: WorkflowClosedMessage) {
		const { workflowId } = msg;

		this.state.removeActiveWorkflowUser(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async sendWorkflowUsersChangedMessage(workflowId: Workflow['id']) {
		const activeWorkflowUsers = this.state.getActiveWorkflowUsers(workflowId);
		const workflowUserIds = activeWorkflowUsers.map((user) => user.userId);

		if (workflowUserIds.length === 0) {
			return;
		}
		const users = await this.userService.getByIds(this.userService.getManager(), workflowUserIds);

		const msgData: IActiveWorkflowUsersChanged = {
			workflowId,
			activeUsers: users.map((user) => ({
				user,
				lastSeen: activeWorkflowUsers.find((activeUser) => activeUser.userId === user.id)!.lastSeen,
			})),
		};

		this.push.sendToUsers('activeWorkflowUsersChanged', msgData, workflowUserIds);
	}
}
