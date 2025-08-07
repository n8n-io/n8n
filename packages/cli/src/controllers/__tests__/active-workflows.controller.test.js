'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const active_workflows_service_1 = require('@/services/active-workflows.service');
const active_workflows_controller_1 = require('../active-workflows.controller');
describe('ActiveWorkflowsController', () => {
	const activeWorkflowsService = (0, backend_test_utils_1.mockInstance)(
		active_workflows_service_1.ActiveWorkflowsService,
	);
	const controller = di_1.Container.get(active_workflows_controller_1.ActiveWorkflowsController);
	let mockUser;
	beforeEach(() => {
		jest.clearAllMocks();
		mockUser = (0, jest_mock_extended_1.mock)({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
		});
	});
	describe('getActiveWorkflows', () => {
		it('should return all active workflow IDs for authenticated user', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const expectedActiveIds = ['workflow-1', 'workflow-2', 'workflow-3'];
			activeWorkflowsService.getAllActiveIdsFor.mockResolvedValue(expectedActiveIds);
			const result = await controller.getActiveWorkflows(req);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(mockUser);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledTimes(1);
			expect(result).toEqual(expectedActiveIds);
		});
		it('should return empty array when user has no active workflows', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			activeWorkflowsService.getAllActiveIdsFor.mockResolvedValue([]);
			const result = await controller.getActiveWorkflows(req);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual([]);
		});
		it('should handle service errors gracefully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
			});
			const serviceError = new Error('Service unavailable');
			activeWorkflowsService.getAllActiveIdsFor.mockRejectedValue(serviceError);
			await expect(controller.getActiveWorkflows(req)).rejects.toThrow('Service unavailable');
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(mockUser);
		});
		it('should handle different user roles consistently', async () => {
			const adminUser = (0, jest_mock_extended_1.mock)({
				id: 'admin-123',
				email: 'admin@example.com',
				role: 'global:owner',
			});
			const req = (0, jest_mock_extended_1.mock)({
				user: adminUser,
			});
			const expectedActiveIds = ['admin-workflow-1'];
			activeWorkflowsService.getAllActiveIdsFor.mockResolvedValue(expectedActiveIds);
			const result = await controller.getActiveWorkflows(req);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(adminUser);
			expect(result).toEqual(expectedActiveIds);
		});
	});
	describe('getActivationError', () => {
		it('should return activation error for specific workflow', async () => {
			const workflowId = 'workflow-123';
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { id: workflowId },
			});
			const expectedError = {
				error: 'Connection timeout',
				timestamp: new Date().toISOString(),
				workflowId,
			};
			activeWorkflowsService.getActivationError.mockResolvedValue(expectedError);
			const result = await controller.getActivationError(req);
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(workflowId, mockUser);
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledTimes(1);
			expect(result).toEqual(expectedError);
		});
		it('should return null when no activation error exists', async () => {
			const workflowId = 'workflow-456';
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { id: workflowId },
			});
			activeWorkflowsService.getActivationError.mockResolvedValue(null);
			const result = await controller.getActivationError(req);
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(workflowId, mockUser);
			expect(result).toBeNull();
		});
		it('should handle invalid workflow ID format', async () => {
			const invalidWorkflowId = 'invalid-id';
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { id: invalidWorkflowId },
			});
			const serviceError = new Error('Workflow not found');
			activeWorkflowsService.getActivationError.mockRejectedValue(serviceError);
			await expect(controller.getActivationError(req)).rejects.toThrow('Workflow not found');
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(
				invalidWorkflowId,
				mockUser,
			);
		});
		it('should handle unauthorized access to workflow', async () => {
			const workflowId = 'restricted-workflow';
			const unauthorizedUser = (0, jest_mock_extended_1.mock)({
				id: 'user-456',
				email: 'unauthorized@example.com',
				role: 'global:member',
			});
			const req = (0, jest_mock_extended_1.mock)({
				user: unauthorizedUser,
				params: { id: workflowId },
			});
			const authError = new Error('Unauthorized access');
			activeWorkflowsService.getActivationError.mockRejectedValue(authError);
			await expect(controller.getActivationError(req)).rejects.toThrow('Unauthorized access');
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(
				workflowId,
				unauthorizedUser,
			);
		});
		it('should handle service timeout errors', async () => {
			const workflowId = 'workflow-timeout';
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { id: workflowId },
			});
			const timeoutError = new Error('Request timeout');
			activeWorkflowsService.getActivationError.mockRejectedValue(timeoutError);
			await expect(controller.getActivationError(req)).rejects.toThrow('Request timeout');
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(workflowId, mockUser);
		});
	});
	describe('integration scenarios', () => {
		it('should handle concurrent requests for different users', async () => {
			const user1 = (0, jest_mock_extended_1.mock)({ id: 'user-1', role: 'global:member' });
			const user2 = (0, jest_mock_extended_1.mock)({ id: 'user-2', role: 'global:owner' });
			const req1 = (0, jest_mock_extended_1.mock)({ user: user1 });
			const req2 = (0, jest_mock_extended_1.mock)({ user: user2 });
			activeWorkflowsService.getAllActiveIdsFor
				.mockResolvedValueOnce(['workflow-1'])
				.mockResolvedValueOnce(['workflow-2', 'workflow-3']);
			const [result1, result2] = await Promise.all([
				controller.getActiveWorkflows(req1),
				controller.getActiveWorkflows(req2),
			]);
			expect(result1).toEqual(['workflow-1']);
			expect(result2).toEqual(['workflow-2', 'workflow-3']);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledTimes(2);
		});
		it('should maintain proper error isolation between requests', async () => {
			const user1 = (0, jest_mock_extended_1.mock)({ id: 'user-1' });
			const user2 = (0, jest_mock_extended_1.mock)({ id: 'user-2' });
			const req1 = (0, jest_mock_extended_1.mock)({ user: user1 });
			const req2 = (0, jest_mock_extended_1.mock)({ user: user2 });
			activeWorkflowsService.getAllActiveIdsFor
				.mockRejectedValueOnce(new Error('User 1 error'))
				.mockResolvedValueOnce(['workflow-success']);
			await expect(controller.getActiveWorkflows(req1)).rejects.toThrow('User 1 error');
			const result2 = await controller.getActiveWorkflows(req2);
			expect(result2).toEqual(['workflow-success']);
		});
	});
});
//# sourceMappingURL=active-workflows.controller.test.js.map
