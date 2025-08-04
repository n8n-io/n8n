'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const collaboration_service_1 = require('@/collaboration/collaboration.service');
const push_1 = require('@/push');
const cache_service_1 = require('@/services/cache/cache.service');
const users_1 = require('@test-integration/db/users');
describe('CollaborationService', () => {
	(0, backend_test_utils_1.mockInstance)(
		push_1.Push,
		new push_1.Push(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		),
	);
	let pushService;
	let collaborationService;
	let owner;
	let memberWithoutAccess;
	let memberWithAccess;
	let workflow;
	let cacheService;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		pushService = di_1.Container.get(push_1.Push);
		collaborationService = di_1.Container.get(collaboration_service_1.CollaborationService);
		cacheService = di_1.Container.get(cache_service_1.CacheService);
		await cacheService.init();
		[owner, memberWithAccess, memberWithoutAccess] = await Promise.all([
			(0, users_1.createOwner)(),
			(0, users_1.createMember)(),
			(0, users_1.createMember)(),
		]);
		workflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
		await (0, backend_test_utils_1.shareWorkflowWithUsers)(workflow, [memberWithAccess]);
	});
	afterEach(async () => {
		jest.resetAllMocks();
		await cacheService.reset();
	});
	const sendWorkflowOpenedMessage = async (workflowId, userId) => {
		const openMessage = {
			type: 'workflowOpened',
			workflowId,
		};
		return await collaborationService.handleUserMessage(userId, openMessage);
	};
	const sendWorkflowClosedMessage = async (workflowId, userId) => {
		const openMessage = {
			type: 'workflowClosed',
			workflowId,
		};
		return await collaborationService.handleUserMessage(userId, openMessage);
	};
	describe('workflow opened message', () => {
		it('should emit collaboratorsChanged after workflowOpened', async () => {
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);
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
			await sendWorkflowOpenedMessage(workflow.id, memberWithoutAccess.id);
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
	});
	describe('workflow closed message', () => {
		it('should not emit collaboratorsChanged after workflowClosed when there are no active users', async () => {
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();
			await sendWorkflowClosedMessage(workflow.id, owner.id);
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
		it('should emit collaboratorsChanged after workflowClosed when there are active users', async () => {
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			await sendWorkflowOpenedMessage(workflow.id, memberWithAccess.id);
			sendToUsersSpy.mockClear();
			await sendWorkflowClosedMessage(workflow.id, owner.id);
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
			const sendToUsersSpy = jest.spyOn(pushService, 'sendToUsers');
			await sendWorkflowOpenedMessage(workflow.id, owner.id);
			sendToUsersSpy.mockClear();
			await sendWorkflowClosedMessage(workflow.id, memberWithoutAccess.id);
			expect(sendToUsersSpy).not.toHaveBeenCalled();
		});
	});
});
//# sourceMappingURL=collaboration.service.test.js.map
