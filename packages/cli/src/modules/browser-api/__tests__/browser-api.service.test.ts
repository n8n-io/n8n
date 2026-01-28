import type { Logger } from '@n8n/backend-common';
import type { NodeExecuteAfterContext } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';

import type { Push } from '@/push';
import type { OwnershipService } from '@/services/ownership.service';

import { BrowserApiService } from '../browser-api.service';

describe('BrowserApiService', () => {
	const logger = mock<Logger>();
	const push = mock<Push>();
	const ownershipService = mock<OwnershipService>();

	let service: BrowserApiService;

	beforeEach(() => {
		jest.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		service = new BrowserApiService(push, logger, ownershipService);
	});

	const createMockContext = (overrides: {
		taskDataMetadata?: Record<string, unknown>;
		executionDataOverrides?: Record<string, unknown>;
	}): NodeExecuteAfterContext => {
		const ctx = mock<NodeExecuteAfterContext>();
		Object.assign(ctx, {
			workflow: { id: 'workflow-123', name: 'Test Workflow' },
			nodeName: 'Browser Notification',
			taskData: { metadata: overrides.taskDataMetadata ?? {} },
			executionData: overrides.executionDataOverrides ?? {},
		});
		return ctx;
	};

	describe('handleNodeExecuteAfter', () => {
		it('should do nothing when no browserApi metadata is present', async () => {
			const ctx = createMockContext({});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(push.sendToUsers).not.toHaveBeenCalled();
		});

		it('should send to pushRef when available (manual execution with session)', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'Test' },
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).toHaveBeenCalledWith(
				{
					type: 'browserApi',
					data: {
						type: 'notification',
						notification: { title: 'Test' },
						workflowId: 'workflow-123',
						workflowName: 'Test Workflow',
					},
				},
				'push-ref-123',
			);
			expect(push.sendToUsers).not.toHaveBeenCalled();
		});

		it('should send to userId when pushRef is not available but manualData.userId is', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'playSound',
						playSound: { sound: 'success', volume: 1 },
					},
				},
				executionDataOverrides: { manualData: { userId: 'user-456' } },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'browserApi',
					data: {
						type: 'playSound',
						playSound: { sound: 'success', volume: 1 },
						workflowId: 'workflow-123',
						workflowName: 'Test Workflow',
					},
				},
				['user-456'],
			);
		});

		it('should send to workflow owner for production executions', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'Production Alert' },
					},
				},
				executionDataOverrides: {},
			});

			ownershipService.getWorkflowProjectCached.mockResolvedValue({
				id: 'project-789',
			} as Awaited<ReturnType<OwnershipService['getWorkflowProjectCached']>>);
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue({
				id: 'owner-999',
			} as Awaited<ReturnType<OwnershipService['getPersonalProjectOwnerCached']>>);

			await service.handleNodeExecuteAfter(ctx);

			expect(ownershipService.getWorkflowProjectCached).toHaveBeenCalledWith('workflow-123');
			expect(ownershipService.getPersonalProjectOwnerCached).toHaveBeenCalledWith('project-789');
			expect(push.sendToUsers).toHaveBeenCalledWith(
				{
					type: 'browserApi',
					data: {
						type: 'notification',
						notification: { title: 'Production Alert' },
						workflowId: 'workflow-123',
						workflowName: 'Test Workflow',
					},
				},
				['owner-999'],
			);
		});

		it('should skip sending for team projects (no personal owner)', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'Team Notification' },
					},
				},
				executionDataOverrides: {},
			});

			ownershipService.getWorkflowProjectCached.mockResolvedValue({
				id: 'team-project',
			} as Awaited<ReturnType<OwnershipService['getWorkflowProjectCached']>>);
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(push.sendToUsers).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Skipping browser API message for team project workflow',
				expect.objectContaining({
					workflowId: 'workflow-123',
					projectId: 'team-project',
				}),
			);
		});

		it('should handle errors when determining workflow owner', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'Test' },
					},
				},
				executionDataOverrides: {},
			});

			const error = new Error('Database error');
			ownershipService.getWorkflowProjectCached.mockRejectedValue(error);

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(push.sendToUsers).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to determine workflow owner for browser API message',
				expect.objectContaining({
					workflowId: 'workflow-123',
					nodeName: 'Browser Notification',
				}),
			);
		});

		it('should prioritize pushRef over userId', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'Test' },
					},
				},
				executionDataOverrides: {
					pushRef: 'push-ref-123',
					manualData: { userId: 'user-456' },
				},
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).toHaveBeenCalledWith(expect.any(Object), 'push-ref-123');
			expect(push.sendToUsers).not.toHaveBeenCalled();
		});

		it('should prioritize userId over owner lookup', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'Test' },
					},
				},
				executionDataOverrides: {
					manualData: { userId: 'user-456' },
				},
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.sendToUsers).toHaveBeenCalledWith(expect.any(Object), ['user-456']);
			expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
		});
	});

	describe('payload validation', () => {
		it('should reject payload with invalid type', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'invalid',
						data: {},
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Invalid browserApi payload rejected',
				expect.objectContaining({
					workflowId: 'workflow-123',
				}),
			);
		});

		it('should reject notification with empty title', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: '' },
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Invalid browserApi payload rejected',
				expect.any(Object),
			);
		});

		it('should reject notification with title exceeding max length', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: { title: 'a'.repeat(257) },
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
		});

		it('should reject notification with non-http/https icon URL', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'notification',
						notification: {
							title: 'Test',
							icon: 'javascript:alert(1)',
						},
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Invalid browserApi payload rejected',
				expect.any(Object),
			);
		});

		it('should reject playSound custom without URL', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'playSound',
						playSound: { sound: 'custom' },
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
		});

		it('should reject playSound with invalid volume', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: {
						type: 'playSound',
						playSound: { sound: 'success', volume: 1.5 },
					},
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
		});

		it('should reject completely malformed payload', async () => {
			const ctx = createMockContext({
				taskDataMetadata: {
					browserApi: 'not an object',
				},
				executionDataOverrides: { pushRef: 'push-ref-123' },
			});

			await service.handleNodeExecuteAfter(ctx);

			expect(push.send).not.toHaveBeenCalled();
		});
	});
});
