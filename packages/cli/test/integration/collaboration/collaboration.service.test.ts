import { CollaborationService } from '@/collaboration/collaboration.service';
import { Push } from '@/push';
import { CacheService } from '@/services/cache/cache.service';
import { mock } from 'jest-mock-extended';
import * as testDb from '../shared/test-db';
import Container from 'typedi';
import type { User } from '@/databases/entities/user';
import { createMember, createOwner } from '@test-integration/db/users';
import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
} from '@/collaboration/collaboration.message';
import { createWorkflow, shareWorkflowWithUsers } from '@test-integration/db/workflows';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { mockInstance } from '@test/mocking';
import { UserService } from '@/services/user.service';

describe('CollaborationService', () => {
	mockInstance(Push, new Push(mock()));
	let pushService: Push;
	let collaborationService: CollaborationService;
	let owner: User;
	let memberWithoutAccess: User;
	let memberWithAccess: User;
	let workflow: WorkflowEntity;
	let userService: UserService;
	let cacheService: CacheService;

	beforeAll(async () => {
		await testDb.init();

		pushService = Container.get(Push);
		collaborationService = Container.get(CollaborationService);
		userService = Container.get(UserService);
		cacheService = Container.get(CacheService);

		await cacheService.init();

		[owner, memberWithAccess, memberWithoutAccess] = await Promise.all([
			createOwner(),
			createMember(),
			createMember(),
		]);
		workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [memberWithAccess]);
	});

	afterEach(async () => {
		jest.resetAllMocks();
		await cacheService.reset();
	});

	const sendWorkflowOpenedMessage = async (workflowId: string, userId: string) => {
		const openMessage: WorkflowOpenedMessage = {
			type: 'workflowOpened',
			workflowId,
		};

		return await collaborationService.handleUserMessage(userId, openMessage);
	};

	const sendWorkflowClosedMessage = async (workflowId: string, userId: string) => {
		const openMessage: WorkflowClosedMessage = {
			type: 'workflowClosed',
			workflowId,
		};

		return await collaborationService.handleUserMessage(userId, openMessage);
	};

	describe('workflow opened message', () => {
		it('should emit activeWorkflowUsersChanged after workflowOpened', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');

			// Act
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);

			// Assert
			expect(sendToUsersSpy).toHaveBeenNthCalledWith(
				1,
				'activeWorkflowUsersChanged',
				{
					activeUsers: [
						{
							lastSeen: expect.any(String),
							user: {
								...(await userService.toPublic(owner)),
								isPending: false,
							},
						},
					],
					workflowId: workflow.id,
				},
				[owner.id],
			);
			expect(sendToUsersSpy).toHaveBeenNthCalledWith(
				2,
				'activeWorkflowUsersChanged',
				{
					activeUsers: expect.arrayContaining([
						expect.objectContaining({
							lastSeen: expect.any(String),
							user: expect.objectContaining({
								id: owner.id,
							}),
						}),
						expect.objectContaining({
							lastSeen: expect.any(String),
							user: expect.objectContaining({
								id: memberWithAccess.id,
							}),
						}),
					]),
					workflowId: workflow.id,
				},
				[owner.id, memberWithAccess.id],
			);
		});

		it("should not emit activeWorkflowUsersChanged if user don't have access to the workflow", async () => {
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');

			// Act
			await sendWorkflowOpenedMessage(workflow.id, memberWithoutAccess.id);

			// Assert
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
	});

	describe('workflow closed message', () => {
		it('should not emit activeWorkflowUsersChanged after workflowClosed when there are no active users', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act
			await sendWorkflowClosedMessage(workflow.id, owner.id);

			// Assert
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});

		it('should emit activeWorkflowUsersChanged after workflowClosed when there are active users', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);
			sendToUsersSpy.mockClear();

			// Act
			await sendWorkflowClosedMessage(workflow.id, owner.id);

			// Assert
			expect(sendToUsersSpy).toHaveBeenCalledWith(
				'activeWorkflowUsersChanged',
				{
					activeUsers: expect.arrayContaining([
						expect.objectContaining({
							lastSeen: expect.any(String),
							user: expect.objectContaining({
								id: memberWithAccess.id,
							}),
						}),
					]),
					workflowId: workflow.id,
				},
				[memberWithAccess.id],
			);
		});

		it("should not emit activeWorkflowUsersChanged if user don't have access to the workflow", async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act
			await sendWorkflowClosedMessage(workflow.id, memberWithoutAccess.id);

			// Assert
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
	});
});
