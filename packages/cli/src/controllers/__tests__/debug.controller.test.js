'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const jest_mock_extended_1 = require('jest-mock-extended');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const multi_main_setup_ee_1 = require('@/scaling/multi-main-setup.ee');
const debug_controller_1 = require('../debug.controller');
describe('DebugController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const multiMainSetup = (0, backend_test_utils_1.mockInstance)(
		multi_main_setup_ee_1.MultiMainSetup,
	);
	const activeWorkflowManager = (0, backend_test_utils_1.mockInstance)(
		active_workflow_manager_1.ActiveWorkflowManager,
	);
	const workflowRepository = (0, backend_test_utils_1.mockInstance)(db_1.WorkflowRepository);
	const instanceSettings = (0, backend_test_utils_1.mockInstance)(n8n_core_1.InstanceSettings);
	const controller = di_1.Container.get(debug_controller_1.DebugController);
	beforeEach(() => {
		jest.clearAllMocks();
	});
	describe('getMultiMainSetupDetails', () => {
		it('should return complete multi-main setup details', async () => {
			const mockLeaderKey = 'leader-key-123';
			const mockInstanceId = 'instance-456';
			const mockIsLeader = true;
			const mockActiveWorkflowIds = ['wf-1', 'wf-2', 'wf-3'];
			const mockTriggersAndPollers = [
				(0, jest_mock_extended_1.mock)({ id: 'wf-1', name: 'Workflow 1', active: true }),
				(0, jest_mock_extended_1.mock)({ id: 'wf-2', name: 'Workflow 2', active: true }),
			];
			const mockWebhooks = [
				(0, jest_mock_extended_1.mock)({ id: 'wf-3', name: 'Webhook Workflow', active: true }),
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
			const result = await controller.getMultiMainSetupDetails();
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
			const result = await controller.getMultiMainSetupDetails();
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
			const mockInstanceId = 'instance-001';
			const mockIsLeader = false;
			multiMainSetup.fetchLeaderKey.mockResolvedValue(null);
			activeWorkflowManager.allActiveInMemory.mockReturnValue(['wf-1']);
			workflowRepository.findIn.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({ id: 'wf-1', name: 'Test Workflow', active: true }),
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
			const result = await controller.getMultiMainSetupDetails();
			expect(result.leaderKey).toBeNull();
			expect(result.isLeader).toBe(false);
			expect(result.instanceId).toBe(mockInstanceId);
		});
		it('should handle activation errors correctly', async () => {
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
			const result = await controller.getMultiMainSetupDetails();
			expect(result.activationErrors).toEqual(mockActivationErrors);
			expect(Object.keys(result.activationErrors)).toHaveLength(3);
		});
		it('should handle service errors gracefully', async () => {
			const error = new Error('Service unavailable');
			multiMainSetup.fetchLeaderKey.mockRejectedValue(error);
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow('Service unavailable');
		});
		it('should handle repository errors gracefully', async () => {
			const error = new Error('Database connection failed');
			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue(['wf-1']);
			workflowRepository.findIn.mockRejectedValue(error);
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow(
				'Database connection failed',
			);
		});
		it('should handle webhook repository errors gracefully', async () => {
			const error = new Error('Webhook query failed');
			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue([]);
			workflowRepository.findIn.mockResolvedValue([]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockRejectedValue(error);
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow('Webhook query failed');
		});
		it('should handle activation errors retrieval failure', async () => {
			const error = new Error('Activation errors unavailable');
			multiMainSetup.fetchLeaderKey.mockResolvedValue('leader-key');
			activeWorkflowManager.allActiveInMemory.mockReturnValue([]);
			workflowRepository.findIn.mockResolvedValue([]);
			workflowRepository.findWebhookBasedActiveWorkflows.mockResolvedValue([]);
			activeWorkflowManager.getAllWorkflowActivationErrors.mockRejectedValue(error);
			await expect(controller.getMultiMainSetupDetails()).rejects.toThrow(
				'Activation errors unavailable',
			);
		});
		it('should work with mixed active workflows', async () => {
			const mockActiveWorkflows = ['wf-triggers', 'wf-pollers'];
			const mockTriggersAndPollers = [
				(0, jest_mock_extended_1.mock)({
					id: 'wf-triggers',
					name: 'Trigger Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.webhook' }],
				}),
				(0, jest_mock_extended_1.mock)({
					id: 'wf-pollers',
					name: 'Poller Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.httpRequest' }],
				}),
			];
			const mockWebhooks = [
				(0, jest_mock_extended_1.mock)({
					id: 'wf-webhook',
					name: 'Pure Webhook Workflow',
					active: true,
					nodes: [{ type: 'n8n-nodes-base.webhook' }],
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
			const result = await controller.getMultiMainSetupDetails();
			expect(result.activeWorkflows.triggersAndPollers).toHaveLength(2);
			expect(result.activeWorkflows.webhooks).toHaveLength(1);
			expect(result.activeWorkflows.triggersAndPollers[0].name).toBe('Trigger Workflow');
			expect(result.activeWorkflows.webhooks[0].name).toBe('Pure Webhook Workflow');
		});
	});
});
//# sourceMappingURL=debug.controller.test.js.map
