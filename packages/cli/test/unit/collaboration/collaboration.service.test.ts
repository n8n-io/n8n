import { CollaborationService } from '@/collaboration/collaboration.service';
import type { Logger } from '@/Logger';
import type { User } from '@db/entities/User';
import type { UserService } from '@/services/user.service';
import { CollaborationState } from '@/collaboration/collaboration.state';
import type { Push } from '@/push';
import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
} from '@/collaboration/collaboration.message';
import type { UserRepository } from '@/databases/repositories/user.repository';
import { mock } from 'jest-mock-extended';

describe('CollaborationService', () => {
	let collaborationService: CollaborationService;
	let mockLogger: Logger;
	let mockUserService: jest.Mocked<UserService>;
	let mockUserRepository: jest.Mocked<UserRepository>;
	let state: CollaborationState;
	let push: Push;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockUserService = mock<UserService>();
		mockUserRepository = mock<UserRepository>();
		push = mock<Push>();
		state = new CollaborationState();

		collaborationService = new CollaborationService(
			mockLogger,
			push,
			state,
			mockUserService,
			mockUserRepository,
		);
	});

	describe('workflow opened message', () => {
		const userId = 'test-user';
		const workflowId = 'test-workflow';

		const message: WorkflowOpenedMessage = {
			type: 'workflowOpened',
			workflowId,
		};

		const expectActiveUsersChangedMessage = () => {
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
				mockUserRepository.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expect(state.getActiveWorkflowUsers(workflowId)).toEqual([
					{
						lastSeen: expect.any(Date),
						userId,
					},
				]);
			});

			it('sends active workflow users changed message', async () => {
				mockUserRepository.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expectActiveUsersChangedMessage();
			});
		});

		describe('user is already active', () => {
			beforeEach(() => {
				state.addActiveWorkflowUser(workflowId, userId);
			});

			it('updates state correctly', async () => {
				mockUserRepository.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expect(state.getActiveWorkflowUsers(workflowId)).toEqual([
					{
						lastSeen: expect.any(Date),
						userId,
					},
				]);
			});

			it('sends active workflow users changed message', async () => {
				mockUserRepository.getByIds.mockResolvedValueOnce([{ id: userId } as User]);
				await collaborationService.handleUserMessage(userId, message);

				expectActiveUsersChangedMessage();
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
