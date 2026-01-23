import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import type { WorkflowHistoryRequest } from '@/requests';

import { WorkflowHistoryController } from '../workflow-history.controller';
import { WorkflowHistoryService } from '../workflow-history.service';

describe('WorkflowHistoryController', () => {
	const historyService = mockInstance(WorkflowHistoryService);
	const controller = Container.get(WorkflowHistoryController);

	const mockUser = mock<User>({ id: 'user123' });

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getVersionsByIds', () => {
		it('should call historyService.getVersionsByIds with correct parameters', async () => {
			// Arrange
			const req = mock<WorkflowHistoryRequest.GetList>({
				user: mockUser,
				params: { workflowId: 'workflow123' },
			});
			const body = { versionIds: ['version1', 'version2'] };
			const mockVersions = [
				{ versionId: 'version1', createdAt: new Date('2024-01-01') },
				{ versionId: 'version2', createdAt: new Date('2024-01-02') },
			];

			historyService.getVersionsByIds.mockResolvedValue(mockVersions);

			// Act
			const result = await controller.getVersionsByIds(req, mock(), body);

			// Assert
			expect(historyService.getVersionsByIds).toHaveBeenCalledWith(mockUser, 'workflow123', [
				'version1',
				'version2',
			]);
			expect(result).toEqual({ versions: mockVersions });
		});

		it('should return versions wrapped in an object', async () => {
			// Arrange
			const req = mock<WorkflowHistoryRequest.GetList>({
				user: mockUser,
				params: { workflowId: 'workflow123' },
			});
			const body = { versionIds: ['version1'] };
			const mockVersions = [{ versionId: 'version1', createdAt: new Date('2024-01-01') }];

			historyService.getVersionsByIds.mockResolvedValue(mockVersions);

			// Act
			const result = await controller.getVersionsByIds(req, mock(), body);

			// Assert
			expect(result).toEqual({ versions: mockVersions });
		});

		it('should throw NotFoundError when SharedWorkflowNotFoundError is caught', async () => {
			// Arrange
			const req = mock<WorkflowHistoryRequest.GetList>({
				user: mockUser,
				params: { workflowId: 'workflow123' },
			});
			const body = { versionIds: ['version1'] };

			historyService.getVersionsByIds.mockRejectedValue(new SharedWorkflowNotFoundError(''));

			// Act & Assert
			await expect(controller.getVersionsByIds(req, mock(), body)).rejects.toThrow(NotFoundError);
			await expect(controller.getVersionsByIds(req, mock(), body)).rejects.toThrow(
				'Could not find workflow',
			);
		});

		it('should re-throw other errors', async () => {
			// Arrange
			const req = mock<WorkflowHistoryRequest.GetList>({
				user: mockUser,
				params: { workflowId: 'workflow123' },
			});
			const body = { versionIds: ['version1'] };
			const customError = new Error('Database connection failed');

			historyService.getVersionsByIds.mockRejectedValue(customError);

			// Act & Assert
			await expect(controller.getVersionsByIds(req, mock(), body)).rejects.toThrow(customError);
		});

		it('should handle empty versionIds array', async () => {
			// Arrange
			const req = mock<WorkflowHistoryRequest.GetList>({
				user: mockUser,
				params: { workflowId: 'workflow123' },
			});
			const body = { versionIds: [] };

			historyService.getVersionsByIds.mockResolvedValue([]);

			// Act
			const result = await controller.getVersionsByIds(req, mock(), body);

			// Assert
			expect(historyService.getVersionsByIds).toHaveBeenCalledWith(mockUser, 'workflow123', []);
			expect(result).toEqual({ versions: [] });
		});
	});
});
