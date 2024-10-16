import { mock } from 'jest-mock-extended';
import Container from 'typedi';

import type {
	WorkflowClosedMessage,
	WorkflowOpenedMessage,
} from '@/collaboration/collaboration.message';
import { CollaborationService } from '@/collaboration/collaboration.service';
import type { User } from '@/databases/entities/user';
import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import { Push } from '@/push';
import { CacheService } from '@/services/cache/cache.service';
import { mockInstance } from '@test/mocking';
import { createMember, createOwner } from '@test-integration/db/users';
import { createWorkflow, shareWorkflowWithUsers } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

describe('CollaborationService', () => {
	mockInstance(Push, new Push(mock(), mock()));
	let pushService: Push;
	let collaborationService: CollaborationService;
	let owner: User;
	let memberWithoutAccess: User;
	let memberWithAccess: User;
	let workflow: WorkflowEntity;
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
				'collaboratorsChanged',
				{
					collaborators: [
						{
							lastSeen: expect.any(String),
							user: owner.toIUser(),
						},
					],
					workflowId: workflow.id,
				},
				[owner.id],
			);
			expect(sendToUsersSpy).toHaveBeenNthCalledWith(
				2,
				'collaboratorsChanged',
				{
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
				'collaboratorsChanged',
				{
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
});
