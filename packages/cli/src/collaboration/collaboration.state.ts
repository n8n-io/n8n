import type { User } from '@db/entities/User';
import type { Workflow } from 'n8n-workflow';
import { Service } from 'typedi';

type ActiveWorkflowUser = {
	userId: User['id'];
	lastSeen: Date;
};

type UserStateByUserId = Map<User['id'], ActiveWorkflowUser>;

type State = {
	activeUsersByWorkflowId: Map<Workflow['id'], UserStateByUserId>;
};

/**
 * State management for the collaboration service
 */
@Service()
export class CollaborationState {
	private state: State = {
		activeUsersByWorkflowId: new Map(),
	};

	addActiveWorkflowUser(workflowId: Workflow['id'], userId: User['id']) {
		const { activeUsersByWorkflowId } = this.state;

		let activeUsers = activeUsersByWorkflowId.get(workflowId);
		if (!activeUsers) {
			activeUsers = new Map();
			activeUsersByWorkflowId.set(workflowId, activeUsers);
		}

		activeUsers.set(userId, {
			userId,
			lastSeen: new Date(),
		});
	}

	removeActiveWorkflowUser(workflowId: Workflow['id'], userId: User['id']) {
		const { activeUsersByWorkflowId } = this.state;

		const activeUsers = activeUsersByWorkflowId.get(workflowId);
		if (!activeUsers) {
			return;
		}

		activeUsers.delete(userId);
		if (activeUsers.size === 0) {
			activeUsersByWorkflowId.delete(workflowId);
		}
	}

	getActiveWorkflowUsers(workflowId: Workflow['id']): ActiveWorkflowUser[] {
		const workflowState = this.state.activeUsersByWorkflowId.get(workflowId);
		if (!workflowState) {
			return [];
		}

		return [...workflowState.values()];
	}

	/**
	 * Removes all users that have not been seen in a given time
	 */
	cleanInactiveUsers(workflowId: Workflow['id'], inactivityCleanUpTimeInMs: number) {
		const activeUsers = this.state.activeUsersByWorkflowId.get(workflowId);
		if (!activeUsers) {
			return;
		}

		const now = Date.now();
		for (const user of activeUsers.values()) {
			if (now - user.lastSeen.getTime() > inactivityCleanUpTimeInMs) {
				activeUsers.delete(user.userId);
			}
		}
	}
}
