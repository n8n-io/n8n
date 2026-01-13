import {
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase } from 'n8n-workflow';

import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
	WriteAccessRequestedMessage,
	WriteAccessReleaseRequestedMessage,
} from '@/collaboration/collaboration.message';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { Push } from '@/push';
import { CacheService } from '@/services/cache/cache.service';
import { createMember, createOwner } from '@test-integration/db/users';

describe('CollaborationService', () => {
	mockInstance(Push, new Push(mock(), mock(), mock(), mock(), mock()));
	let pushService: Push;
	let collaborationService: CollaborationService;
	let owner: User;
	let memberWithoutAccess: User;
	let memberWithAccess: User;
	let workflow: IWorkflowBase;
	let cacheService: CacheService;

	beforeAll(async () => {
		await testDb.init();

		pushService = Container.get(Push);
		collaborationService = Container.get(CollaborationService);
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

	const sendWriteAccessRequestedMessage = async (workflowId: string, userId: string) => {
		const message: WriteAccessRequestedMessage = {
			type: 'writeAccessRequested',
			workflowId,
		};

		return await collaborationService.handleUserMessage(userId, message);
	};

	const sendWriteAccessReleaseRequestedMessage = async (workflowId: string, userId: string) => {
		const message: WriteAccessReleaseRequestedMessage = {
			type: 'writeAccessReleaseRequested',
			workflowId,
		};

		return await collaborationService.handleUserMessage(userId, message);
	};

	describe('workflow opened message', () => {
		it('should emit collaboratorsChanged after workflowOpened', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');

			// Act
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);

			// Assert
			expect(sendToUsersSpy).toHaveBeenNthCalledWith(
				1,
				{
					type: 'collaboratorsChanged',
					data: {
						collaborators: [
							{
								lastSeen: expect.any(String),
								user: owner.toIUser(),
							},
						],
						workflowId: workflow.id,
					},
				},
				[owner.id],
			);
			expect(sendToUsersSpy).toHaveBeenNthCalledWith(
				2,
				{
					type: 'collaboratorsChanged',
					data: {
						collaborators: expect.arrayContaining([
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
				},
				[owner.id, memberWithAccess.id],
			);
		});

		it("should not emit collaboratorsChanged if user don't have access to the workflow", async () => {
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');

			// Act
			await sendWorkflowOpenedMessage(workflow.id, memberWithoutAccess.id);

			// Assert
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
	});

	describe('workflow closed message', () => {
		it('should not emit collaboratorsChanged after workflowClosed when there are no active users', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act
			await sendWorkflowClosedMessage(workflow.id, owner.id);

			// Assert
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});

		it('should emit collaboratorsChanged after workflowClosed when there are active users', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);
			sendToUsersSpy.mockClear();

			// Act
			await sendWorkflowClosedMessage(workflow.id, owner.id);

			// Assert
			expect(sendToUsersSpy).toHaveBeenCalledWith(
				{
					type: 'collaboratorsChanged',
					data: {
						collaborators: expect.arrayContaining([
							expect.objectContaining({
								lastSeen: expect.any(String),
								user: expect.objectContaining({
									id: memberWithAccess.id,
								}),
							}),
						]),
						workflowId: workflow.id,
					},
				},
				[memberWithAccess.id],
			);
		});

		it("should not emit collaboratorsChanged if user don't have access to the workflow", async () => {
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

	describe('write lock acquisition', () => {
		it('should grant write lock to first user', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);

			// Assert
			expect(sendToUsersSpy).toHaveBeenCalledWith(
				{
					type: 'writeAccessAcquired',
					data: {
						workflowId: workflow.id,
						userId: owner.id,
					},
				},
				[owner.id],
			);
		});

		it('should deny write lock if another user holds it', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);

			// Owner acquires the lock first
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act - Member tries to acquire the lock
			await sendWriteAccessRequestedMessage(workflow.id, memberWithAccess.id);

			// Assert - No message should be sent (silent rejection)
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});

		it('should allow lock acquisition after release', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);

			// Owner acquires the lock
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);

			// Owner releases the lock
			await sendWriteAccessReleaseRequestedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act - Member tries to acquire the lock
			await sendWriteAccessRequestedMessage(workflow.id, memberWithAccess.id);

			// Assert - Member should successfully acquire the lock
			expect(sendToUsersSpy).toHaveBeenCalledWith(
				{
					type: 'writeAccessAcquired',
					data: {
						workflowId: workflow.id,
						userId: memberWithAccess.id,
					},
				},
				[owner.id, memberWithAccess.id],
			);
		});

		it('should allow same user to re-acquire lock they already hold', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);

			// Owner acquires the lock
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();

			// Act - Owner tries to acquire the lock again
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);

			// Assert - Should succeed (idempotent)
			expect(sendToUsersSpy).toHaveBeenCalledWith(
				{
					type: 'writeAccessAcquired',
					data: {
						workflowId: workflow.id,
						userId: owner.id,
					},
				},
				[owner.id],
			);
		});

		it('should not grant write lock to user without write access', async () => {
			// Arrange
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, memberWithoutAccess.id);
			sendToUsersSpy.mockClear();

			// Act - User without access tries to acquire lock
			await sendWriteAccessRequestedMessage(workflow.id, memberWithoutAccess.id);

			// Assert - No messages should be sent
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
	});

	describe('getWriteLock', () => {
		it('should return lock holder for user with read access', async () => {
			// Arrange
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);

			// Act
			const lockHolder = await collaborationService.getWriteLock(memberWithAccess.id, workflow.id);

			// Assert
			expect(lockHolder).toBe(owner.id);
		});

		it('should return null for user without read access', async () => {
			// Arrange
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWriteAccessRequestedMessage(workflow.id, owner.id);

			// Act
			const lockHolder = await collaborationService.getWriteLock(
				memberWithoutAccess.id,
				workflow.id,
			);

			// Assert
			expect(lockHolder).toBeNull();
		});

		it('should return null when no lock is held', async () => {
			// Act
			const lockHolder = await collaborationService.getWriteLock(owner.id, workflow.id);

			// Assert
			expect(lockHolder).toBeNull();
		});
	});
});
