import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { ActiveWorkflowRequest } from '@/requests';
import { ActiveWorkflowsService } from '@/services/active-workflows.service';

import { ActiveWorkflowsController } from '../active-workflows.controller';

describe('ActiveWorkflowsController', () => {
	const activeWorkflowsService = mockInstance(ActiveWorkflowsService);
	const controller = Container.get(ActiveWorkflowsController);

	let mockUser: User;

	beforeEach(() => {
		jest.clearAllMocks();
		mockUser = mock<User>({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
		});
	});

	describe('getActiveWorkflows', () => {
		it('should return all active workflow IDs for authenticated user', async () => {
			// Arrange
			const req = mock<ActiveWorkflowRequest.GetAllActive>({
				user: mockUser,
			});

			const expectedActiveIds = ['workflow-1', 'workflow-2', 'workflow-3'];
			activeWorkflowsService.getAllActiveIdsFor.mockResolvedValue(expectedActiveIds);

			// Act
			const result = await controller.getActiveWorkflows(req);

			// Assert
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(mockUser);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledTimes(1);
			expect(result).toEqual(expectedActiveIds);
		});

		it('should return empty array when user has no active workflows', async () => {
			// Arrange
			const req = mock<ActiveWorkflowRequest.GetAllActive>({
				user: mockUser,
			});

			activeWorkflowsService.getAllActiveIdsFor.mockResolvedValue([]);

			// Act
			const result = await controller.getActiveWorkflows(req);

			// Assert
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual([]);
		});

		it('should handle service errors gracefully', async () => {
			// Arrange
			const req = mock<ActiveWorkflowRequest.GetAllActive>({
				user: mockUser,
			});

			const serviceError = new Error('Service unavailable');
			activeWorkflowsService.getAllActiveIdsFor.mockRejectedValue(serviceError);

			// Act & Assert
			await expect(controller.getActiveWorkflows(req)).rejects.toThrow('Service unavailable');
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(mockUser);
		});

		it('should handle different user roles consistently', async () => {
			// Arrange
			const adminUser = mock<User>({
				id: 'admin-123',
				email: 'admin@example.com',
				role: 'global:owner',
			});

			const req = mock<ActiveWorkflowRequest.GetAllActive>({
				user: adminUser,
			});

			const expectedActiveIds = ['admin-workflow-1'];
			activeWorkflowsService.getAllActiveIdsFor.mockResolvedValue(expectedActiveIds);

			// Act
			const result = await controller.getActiveWorkflows(req);

			// Assert
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledWith(adminUser);
			expect(result).toEqual(expectedActiveIds);
		});
	});

	describe('getActivationError', () => {
		it('should return activation error for specific workflow', async () => {
			// Arrange
			const workflowId = 'workflow-123';
			const req = mock<ActiveWorkflowRequest.GetActivationError>({
				user: mockUser,
				params: { id: workflowId },
			});

			const expectedError = {
				error: 'Connection timeout',
				timestamp: new Date().toISOString(),
				workflowId,
			};
			activeWorkflowsService.getActivationError.mockResolvedValue(expectedError);

			// Act
			const result = await controller.getActivationError(req);

			// Assert
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(workflowId, mockUser);
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledTimes(1);
			expect(result).toEqual(expectedError);
		});

		it('should return null when no activation error exists', async () => {
			// Arrange
			const workflowId = 'workflow-456';
			const req = mock<ActiveWorkflowRequest.GetActivationError>({
				user: mockUser,
				params: { id: workflowId },
			});

			activeWorkflowsService.getActivationError.mockResolvedValue(null);

			// Act
			const result = await controller.getActivationError(req);

			// Assert
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(workflowId, mockUser);
			expect(result).toBeNull();
		});

		it('should handle invalid workflow ID format', async () => {
			// Arrange
			const invalidWorkflowId = 'invalid-id';
			const req = mock<ActiveWorkflowRequest.GetActivationError>({
				user: mockUser,
				params: { id: invalidWorkflowId },
			});

			const serviceError = new Error('Workflow not found');
			activeWorkflowsService.getActivationError.mockRejectedValue(serviceError);

			// Act & Assert
			await expect(controller.getActivationError(req)).rejects.toThrow('Workflow not found');
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(
				invalidWorkflowId,
				mockUser,
			);
		});

		it('should handle unauthorized access to workflow', async () => {
			// Arrange
			const workflowId = 'restricted-workflow';
			const unauthorizedUser = mock<User>({
				id: 'user-456',
				email: 'unauthorized@example.com',
				role: 'global:member',
			});

			const req = mock<ActiveWorkflowRequest.GetActivationError>({
				user: unauthorizedUser,
				params: { id: workflowId },
			});

			const authError = new Error('Unauthorized access');
			activeWorkflowsService.getActivationError.mockRejectedValue(authError);

			// Act & Assert
			await expect(controller.getActivationError(req)).rejects.toThrow('Unauthorized access');
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(
				workflowId,
				unauthorizedUser,
			);
		});

		it('should handle service timeout errors', async () => {
			// Arrange
			const workflowId = 'workflow-timeout';
			const req = mock<ActiveWorkflowRequest.GetActivationError>({
				user: mockUser,
				params: { id: workflowId },
			});

			const timeoutError = new Error('Request timeout');
			activeWorkflowsService.getActivationError.mockRejectedValue(timeoutError);

			// Act & Assert
			await expect(controller.getActivationError(req)).rejects.toThrow('Request timeout');
			expect(activeWorkflowsService.getActivationError).toHaveBeenCalledWith(workflowId, mockUser);
		});
	});

	describe('integration scenarios', () => {
		it('should handle concurrent requests for different users', async () => {
			// Arrange
			const user1 = mock<User>({ id: 'user-1', role: 'global:member' });
			const user2 = mock<User>({ id: 'user-2', role: 'global:owner' });

			const req1 = mock<ActiveWorkflowRequest.GetAllActive>({ user: user1 });
			const req2 = mock<ActiveWorkflowRequest.GetAllActive>({ user: user2 });

			activeWorkflowsService.getAllActiveIdsFor
				.mockResolvedValueOnce(['workflow-1'])
				.mockResolvedValueOnce(['workflow-2', 'workflow-3']);

			// Act
			const [result1, result2] = await Promise.all([
				controller.getActiveWorkflows(req1),
				controller.getActiveWorkflows(req2),
			]);

			// Assert
			expect(result1).toEqual(['workflow-1']);
			expect(result2).toEqual(['workflow-2', 'workflow-3']);
			expect(activeWorkflowsService.getAllActiveIdsFor).toHaveBeenCalledTimes(2);
		});

		it('should maintain proper error isolation between requests', async () => {
			// Arrange
			const user1 = mock<User>({ id: 'user-1' });
			const user2 = mock<User>({ id: 'user-2' });

			const req1 = mock<ActiveWorkflowRequest.GetAllActive>({ user: user1 });
			const req2 = mock<ActiveWorkflowRequest.GetAllActive>({ user: user2 });

			activeWorkflowsService.getAllActiveIdsFor
				.mockRejectedValueOnce(new Error('User 1 error'))
				.mockResolvedValueOnce(['workflow-success']);

			// Act & Assert
			await expect(controller.getActiveWorkflows(req1)).rejects.toThrow('User 1 error');

			const result2 = await controller.getActiveWorkflows(req2);
			expect(result2).toEqual(['workflow-success']);
		});
	});
});
