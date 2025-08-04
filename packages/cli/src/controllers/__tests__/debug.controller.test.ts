import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'jest-mock-extended';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { MultiMainSetup } from '@/scaling/multi-main-setup.ee';

import { DebugController } from '../debug.controller';

describe('DebugController', () => {
	mockInstance(Logger);

	const multiMainSetup = mockInstance(MultiMainSetup);
	const activeWorkflowManager = mockInstance(ActiveWorkflowManager);
	const workflowRepository = mockInstance(WorkflowRepository);
	const instanceSettings = mockInstance(InstanceSettings);

	const controller = Container.get(DebugController);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getMultiMainSetupDetails', () => {
		it('should return complete multi-main setup details', async () => {
			// Arrange
			const mockLeaderKey = 'leader-key-123';
			const mockInstanceId = 'instance-456';
			const mockIsLeader = true;

			const mockActiveWorkflowIds = ['wf-1', 'wf-2', 'wf-3'];
			const mockTriggersAndPollers = [
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Workflow 1', active: true }),
				mock<WorkflowEntity>({ id: 'wf-2', name: 'Workflow 2', active: true }),
			];
			const mockWebhooks = [
				mock<WorkflowEntity>({ id: 'wf-3', name: 'Webhook Workflow', active: true }),
			];
			const mockActivationErrors = {
				'wf-4': 'Failed to activate workflow due to missing credentials',
				'wf-5': 'Node configuration error',
			};

			multiMainSetup.fetchLeaderKey.mockResolvedValue(mockLeaderKey);
			activeWorkflowManager.allActiveInMemory.mockReturnValue(mockActiveWorkflowIds);
			workflowRepository.findIn.mockResolvedValue(mockTriggersAndPollers);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue(mockWebhooks);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue(mockActivationErrors);

			Object.defineProperty(instanceSettings, 'instanceId', {
				get: jest.fn().mockReturnValue(mockInstanceId),
				configurable: true,
			});
			Object.defineProperty(instanceSettings, 'isLeader', {
				get: jest.fn().mockReturnValue(mockIsLeader),
				configurable: true,
			});

			// Act
			const result = await controller.getMultiMainSetupDetails();

			// Assert
			expect(multiMainSetup.fetchLeaderKey).toHaveBeenCalled();
			expect(activeWorkflowManager.allActiveInMemory).toHaveBeenCalled();
			expect(workflowRepository.findIn).toHaveBeenCalledWith(mockActiveWorkflowIds);
			expect(workflowRepository.findWebhookBasedActiveWorkflows).toHaveBeenCalled();
			expect(activeWorkflowManager.getAllWorkflowActivationErrors).toHaveBeenCalled();

			expect(result).toEqual({
				instanceId: mockInstanceId,
				leaderKey: mockLeaderKey,
				isLeader: mockIsLeader,
				activeWorkflows: {
					webhooks: mockWebhooks,
					triggersAndPollers: mockTriggersAndPollers,
				},
				activationErrors: mockActivationErrors,
			});
		});

		it('should handle empty active workflows', async () => {
			// Arrange
			const mockLeaderKey = 'leader-key-456';
			const mockInstanceId = 'instance-789';
			const mockIsLeader = false;

			multiMainSetup.fetchLeaderKey.mockResolvedValue(mockLeaderKey);
			activeWorkflowManager.allActiveInMemory.mockReturnValue([]);
			workflowRepository.findIn.mockResolvedValue([]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue([]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue({});

			Object.defineProperty(instanceSettings, 'instanceId', {
				get: jest.fn().mockReturnValue(mockInstanceId),
				configurable: true,
			});
			Object.defineProperty(instanceSettings, 'isLeader', {
				get: jest.fn().mockReturnValue(mockIsLeader),
				configurable: true,
			});

			// Act
			const result = await controller.getMultiMainSetupDetails();

			// Assert
			expect(result).toEqual({
				instanceId: mockInstanceId,
				leaderKey: mockLeaderKey,
				isLeader: mockIsLeader,
				activeWorkflows: {
					webhooks: [],
					triggersAndPollers: [],
				},
				activationErrors: {},
			});
		});

		it('should handle null leader key', async () => {
			// Arrange
			const mockInstanceId = 'instance-001';
			const mockIsLeader = false;

			multiMainSetup.fetchLeaderKey.mockResolvedValue(null);
			activeWorkflowManager.allActiveInMemory.mockReturnValue(['wf-1']);
			workflowRepository.findIn.mockResolvedValue([
				mock<WorkflowEntity>({ id: 'wf-1', name: 'Test Workflow', active: true }),
			]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue([]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue({});

			Object.defineProperty(instanceSettings, 'instanceId', {
				get: jest.fn().mockReturnValue(mockInstanceId),
				configurable: true,
			});
			Object.defineProperty(instanceSettings, 'isLeader', {
				get: jest.fn().mockReturnValue(mockIsLeader),
				configurable: true,
			});

			// Act
			const result = await controller.getMultiMainSetupDetails();

			// Assert
			expect(result.leaderKey).toBeNull();
			expect(result.isLeader).toBe(false);
			expect(result.instanceId).toBe(mockInstanceId);
		});

		it('should handle activation errors correctly', async () => {
			// Arrange
			const mockActivationErrors = {
				'workflow-123': 'Database connection failed',
				'workflow-456': 'Invalid node configuration',
				'workflow-789': 'Missing required credentials',
			};

			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue([]);
			workflowRepository.findIn.mockResolvedValue([]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue([]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue(mockActivationErrors);

			Object.defineProperty(instanceSettings, 'instanceId', {
				get: jest.fn().mockReturnValue('test-instance'),
				configurable: true,
			});
			Object.defineProperty(instanceSettings, 'isLeader', {
				get: jest.fn().mockReturnValue(true),
				configurable: true,
			});

			// Act
			const result = await controller.getMultiMainSetupDetails();

			// Assert
			expect(result.activationErrors).toEqual(mockActivationErrors);
			expect(Object.keys(result.activationErrors)).toHaveLength(3);
		});

		it('should handle service errors gracefully', async () => {
			// Arrange
			const error = new Error('Service unavailable');
			multiMainSetup.fetchLeaderKey.mockRejectedValue(error);

			// Act & Assert
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow('Service unavailable');
		});

		it('should handle repository errors gracefully', async () => {
			// Arrange
			const error = new Error('Database connection failed');

			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue(['wf-1']);
			workflowRepository.findIn.mockRejectedValue(error);

			// Act & Assert
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow(
				'Database connection failed',
			);
		});

		it('should handle webhook repository errors gracefully', async () => {
			// Arrange
			const error = new Error('Webhook query failed');

			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue([]);
			workflowRepository.findIn.mockResolvedValue([]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockRejectedValue(error);

			// Act & Assert
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow('Webhook query failed');
		});

		it('should handle activation errors retrieval failure', async () => {
			// Arrange
			const error = new Error('Activation errors unavailable');

			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue([]);
			workflowRepository.findIn.mockResolvedValue([]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue([]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockRejectedValue(error);

			// Act & Assert
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow(
				'Activation errors unavailable',
			);
		});

		it('should work with mixed active workflows', async () => {
			// Arrange
			const mockActiveWorkflows = ['wf-triggers', 'wf-pollers'];
			const mockTriggersAndPollers = [
				mock<WorkflowEntity>({
					id: 'wf-triggers',
					name: 'Trigger Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.webhook' }] as any,
				}),
				mock<WorkflowEntity>({
					id: 'wf-pollers',
					name: 'Poller Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.httpRequest' }] as any,
				}),
			];
			const mockWebhooks = [
				mock<WorkflowEntity>({
					id: 'wf-webhook',
					name: 'Pure Webhook Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.webhook' }] as any,
				}),
			];

			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-abc');
			activeWorkflowManager.allActiveInMemory.mockReturnValue(mockActiveWorkflows);
			workflowRepository.findIn.mockResolvedValue(mockTriggersAndPollers);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue(mockWebhooks);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockResolvedValue({});

			Object.defineProperty(instanceSettings, 'instanceId', {
				get: jest.fn().mockReturnValue('mixed-instance'),
				configurable: true,
			});
			Object.defineProperty(instanceSettings, 'isLeader', {
				get: jest.fn().mockReturnValue(true),
				configurable: true,
			});

			// Act
			const result = await controller.getMultiMainSetupDetails();

			// Assert
			expect(result.activeWorkflows.triggersAndPollers).toHaveLength(2);
			expect(result.activeWorkflows.webhooks).toHaveLength(1);
			expect(result.activeWorkflows.triggersAndPollers[0].name).toBe('Trigger Workflow');
			expect(result.activeWorkflows.webhooks[0].name).toBe('Pure Webhook Workflow');
		});
	});
});
