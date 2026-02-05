import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { IWorkflowBase, UserLike } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';

import { WorkflowTransferLifecycleService } from '../workflow-transfer-lifecycle.service';

describe('WorkflowTransferLifecycleService', () => {
	let service: WorkflowTransferLifecycleService;
	let activationErrorsService: jest.Mocked<ActivationErrorsService>;
	let activeWorkflowManager: jest.Mocked<ActiveWorkflowManager>;
	let eventService: jest.Mocked<EventService>;
	let ownershipService: jest.Mocked<OwnershipService>;

	const mockWorkflow: IWorkflowBase = {
		id: 'workflow-123',
		name: 'Test Workflow',
		nodes: [],
		connections: {},
		active: false,
		settings: {},
		createdAt: new Date(),
		updatedAt: new Date(),
		versionId: 'version-123',
	};

	const mockUser: UserLike = {
		id: 'user-123',
		email: 'test@example.com',
	};

	beforeEach(() => {
		activationErrorsService = mockInstance(ActivationErrorsService);
		activeWorkflowManager = mockInstance(ActiveWorkflowManager);
		eventService = mock<EventService>();
		ownershipService = mockInstance(OwnershipService);

		service = new WorkflowTransferLifecycleService(
			mockInstance('Logger'),
			activationErrorsService,
			activeWorkflowManager,
			eventService,
			ownershipService,
		);

		// Setup default mocks
		activationErrorsService.get.mockResolvedValue(null);
		activationErrorsService.deregister.mockResolvedValue(undefined);
		ownershipService.invalidateWorkflowProjectCache.mockResolvedValue(undefined);
	});

	describe('handleWorkflowTransfer', () => {
		it('should emit transfer-started and transfer-completed events', async () => {
			await service.handleWorkflowTransfer(
				'workflow-123',
				'source-project',
				'dest-project',
				mockWorkflow,
				mockUser,
			);

			expect(eventService.emit).toHaveBeenCalledWith('workflow-transfer-started', {
				user: mockUser,
				workflowId: 'workflow-123',
				workflow: mockWorkflow,
				sourceProjectId: 'source-project',
				destinationProjectId: 'dest-project',
			});

			expect(eventService.emit).toHaveBeenCalledWith('workflow-transfer-completed', {
				user: mockUser,
				workflowId: 'workflow-123',
				workflow: mockWorkflow,
				sourceProjectId: 'source-project',
				destinationProjectId: 'dest-project',
			});
		});

		it('should invalidate workflow project cache', async () => {
			await service.handleWorkflowTransfer(
				'workflow-123',
				'source-project',
				'dest-project',
				mockWorkflow,
				mockUser,
			);

			expect(ownershipService.invalidateWorkflowProjectCache).toHaveBeenCalledWith('workflow-123');
		});

		it('should clear activation errors when they exist', async () => {
			activationErrorsService.get.mockResolvedValue('Could not find the data table: XYZ');

			await service.handleWorkflowTransfer(
				'workflow-123',
				'source-project',
				'dest-project',
				mockWorkflow,
				mockUser,
			);

			expect(activationErrorsService.deregister).toHaveBeenCalledWith('workflow-123');
		});

		it('should not call deregister when no activation errors exist', async () => {
			activationErrorsService.get.mockResolvedValue(null);

			await service.handleWorkflowTransfer(
				'workflow-123',
				'source-project',
				'dest-project',
				mockWorkflow,
				mockUser,
			);

			expect(activationErrorsService.deregister).not.toHaveBeenCalled();
		});

		it('should handle errors and rethrow them', async () => {
			const error = new Error('Test error');
			ownershipService.invalidateWorkflowProjectCache.mockRejectedValue(error);

			await expect(
				service.handleWorkflowTransfer(
					'workflow-123',
					'source-project',
					'dest-project',
					mockWorkflow,
					mockUser,
				),
			).rejects.toThrow('Test error');

			// Should emit started but not completed
			expect(eventService.emit).toHaveBeenCalledWith('workflow-transfer-started', expect.any(Object));
			expect(eventService.emit).not.toHaveBeenCalledWith('workflow-transfer-completed', expect.any(Object));
		});

		it('should execute all invalidation steps in correct order', async () => {
			const callOrder: string[] = [];

			ownershipService.invalidateWorkflowProjectCache.mockImplementation(async () => {
				callOrder.push('invalidateWorkflowProjectCache');
			});

			activationErrorsService.get.mockImplementation(async () => {
				callOrder.push('getActivationError');
				return 'Some error';
			});

			activationErrorsService.deregister.mockImplementation(async () => {
				callOrder.push('deregisterActivationError');
			});

			await service.handleWorkflowTransfer(
				'workflow-123',
				'source-project',
				'dest-project',
				mockWorkflow,
				mockUser,
			);

			// Verify order: cache invalidation happens first, then error clearing
			expect(callOrder[0]).toBe('invalidateWorkflowProjectCache');
			expect(callOrder[1]).toBe('getActivationError');
			expect(callOrder[2]).toBe('deregisterActivationError');
		});
	});
});
