import { CollaborationService } from '@/collaboration/collaboration.service';
import type { Logger } from '@/Logger';
import type { User } from '@/databases/entities/User';
import type { UserService } from '@/services/user.service';
import { CollaborationState } from '@/collaboration/collaboration.state';
import type { Push } from '@/push';
import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
} from '@/collaboration/collaboration.message';

describe('CollaborationService', () => {
	let collaborationService: CollaborationService;
	let mockLogger: Logger;
	let mockUserService: jest.Mocked<UserService>;
	let state: CollaborationState;
	let push: Push;

	beforeEach(() => {
		mockLogger = {
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;
		mockUserService = {
			getByIds: jest.fn(),
			getManager: jest.fn(),
		} as unknown as jest.Mocked<UserService>;

		push = {
			on: jest.fn(),
			sendToUsers: jest.fn(),
		} as unknown as Push;
		state = new CollaborationState();
		collaborationService = new CollaborationService(mockLogger, push, state, mockUserService);
	});

	describe('workflow opened message', () => {
		const userId = 'test-user';
		const workflowId = 'test-workflow';

		const message: WorkflowOpenedMessage = {
			type: 'workflowOpened',
			workflowId,
		};

		const expectActiveUsersChangedMessage = (userIds: string[]) => {
			expect(push.sendToUsers).toHaveBeenCalledWith(
				'activeWorkflowUsersChanged',
				{
					workflowId,
					activeUsers: [
						{
							user: { id: userId },
							lastSeen: expect.any(Date),
						},
					],
				},
				[userId],
			);
		};

		describe('user is not yet active', () => {
			it('updates state correctly', async () => {
				mockUserService.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expect(state.getActiveWorkflowUsers(workflowId)).toEqual([
					{
						lastSeen: expect.any(Date),
						userId,
					},
				]);
			});

			it('sends active workflow users changed message', async () => {
				mockUserService.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expectActiveUsersChangedMessage([userId]);
			});
		});

		describe('user is already active', () => {
			beforeEach(() => {
				state.addActiveWorkflowUser(workflowId, userId);
			});

			it('updates state correctly', async () => {
				mockUserService.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expect(state.getActiveWorkflowUsers(workflowId)).toEqual([
					{
						lastSeen: expect.any(Date),
						userId,
					},
				]);
			});

			it('sends active workflow users changed message', async () => {
				mockUserService.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expectActiveUsersChangedMessage([userId]);
			});
		});
	});

	describe('workflow closed message', () => {
		const userId = 'test-user';
		const workflowId = 'test-workflow';

		const message: WorkflowClosedMessage = {
			type: 'workflowClosed',
			workflowId,
		};

		describe('user is active', () => {
			beforeEach(() => {
				state.addActiveWorkflowUser(workflowId, userId);
			});

			it('updates state correctly', async () => {
				await collaborationService.handleUserMessage(userId, message);

				expect(state.getActiveWorkflowUsers(workflowId)).toEqual([]);
			});

			it('does not send active workflow users changed message', async () => {
				await collaborationService.handleUserMessage(userId, message);

				expect(push.sendToUsers).not.toHaveBeenCalled();
			});
		});

		describe('user is not active', () => {
			it('updates state correctly', async () => {
				await collaborationService.handleUserMessage(userId, message);

				expect(state.getActiveWorkflowUsers(workflowId)).toEqual([]);
			});

			it('does not send active workflow users changed message', async () => {
				await collaborationService.handleUserMessage(userId, message);

				expect(push.sendToUsers).not.toHaveBeenCalled();
			});
		});
	});
});
