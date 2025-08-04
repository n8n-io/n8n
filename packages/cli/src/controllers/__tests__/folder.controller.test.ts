// Note: Using inline types to avoid schema import issues
type CreateFolderDto = { name: string; parentFolderId?: string | null; description?: string };
type UpdateFolderDto = { name?: string; description?: string };
type DeleteFolderDto = { transferContentsTo?: string };
type ListFolderQueryDto = { take?: number; skip?: number; filter?: string };
type TransferFolderBodyDto = {
	destinationProjectId: string;
	destinationParentFolderId?: string;
	shareCredentials?: boolean;
};
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { ProjectController } from '../folder.controller';

describe('ProjectController (Folder)', () => {
	const folderService = mockInstance(FolderService);
	const enterpriseWorkflowService = mockInstance(EnterpriseWorkflowService);

	const controller = Container.get(ProjectController);

	let mockUser: User;
	let mockResponse: Response;

	beforeEach(() => {
		jest.clearAllMocks();

		mockUser = mock<User>({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
		});

		mockResponse = mock<Response>({
			json: jest.fn(),
		});
	});

	describe('createFolder', () => {
		it('should create a new folder successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123' },
			});

			const payload: CreateFolderDto = {
				name: 'New Folder',
				parentFolderId: null,
			};

			const createdFolder = {
				id: 'folder-123',
				name: 'New Folder',
				projectId: 'project-123',
				parentFolderId: null,
			};

			folderService.createFolder.mockResolvedValue(createdFolder);

			// Act
			const result = await controller.createFolder(req, mockResponse, payload);

			// Assert
			expect(folderService.createFolder).toHaveBeenCalledWith(payload, 'project-123');
			expect(result).toEqual(createdFolder);
		});

		it('should handle folder not found errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				params: { projectId: 'project-123' },
			});

			const payload: CreateFolderDto = { name: 'New Folder' };
			folderService.createFolder.mockRejectedValue(
				new FolderNotFoundError('Parent folder not found'),
			);

			// Act & Assert
			await expect(controller.createFolder(req, mockResponse, payload)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('should handle generic errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				params: { projectId: 'project-123' },
			});

			const payload: CreateFolderDto = { name: 'New Folder' };
			folderService.createFolder.mockRejectedValue(new Error('Database error'));

			// Act & Assert
			await expect(controller.createFolder(req, mockResponse, payload)).rejects.toThrow(
				InternalServerError,
			);
		});
	});

	describe('getFolderTree', () => {
		it('should return folder tree', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const folderTree = {
				id: 'folder-123',
				name: 'Root Folder',
				children: [
					{ id: 'folder-456', name: 'Sub Folder 1', children: [] },
					{ id: 'folder-789', name: 'Sub Folder 2', children: [] },
				],
			};

			folderService.getFolderTree.mockResolvedValue(folderTree);

			// Act
			const result = await controller.getFolderTree(req, mockResponse);

			// Assert
			expect(folderService.getFolderTree).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual(folderTree);
		});

		it('should handle folder not found in tree', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'nonexistent-folder' },
			});

			folderService.getFolderTree.mockRejectedValue(new FolderNotFoundError('Folder not found'));

			// Act & Assert
			await expect(controller.getFolderTree(req, mockResponse)).rejects.toThrow(NotFoundError);
		});
	});

	describe('getFolderUsedCredentials', () => {
		it('should return used credentials in folder', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const credentials = [
				{ id: 'cred-1', name: 'Database Connection', type: 'mysql' },
				{ id: 'cred-2', name: 'API Key', type: 'httpBasicAuth' },
			];

			enterpriseWorkflowService.getFolderUsedCredentials.mockResolvedValue(credentials);

			// Act
			const result = await controller.getFolderUsedCredentials(req, mockResponse);

			// Assert
			expect(enterpriseWorkflowService.getFolderUsedCredentials).toHaveBeenCalledWith(
				mockUser,
				'folder-123',
				'project-123',
			);
			expect(result).toEqual(credentials);
		});
	});

	describe('updateFolder', () => {
		it('should update folder successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const payload: UpdateFolderDto = {
				name: 'Updated Folder Name',
				description: 'Updated description',
			};

			folderService.updateFolder.mockResolvedValue(undefined);

			// Act
			await controller.updateFolder(req, mockResponse, payload);

			// Assert
			expect(folderService.updateFolder).toHaveBeenCalledWith('folder-123', 'project-123', payload);
		});

		it('should handle folder not found error', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'nonexistent-folder' },
			});

			const payload: UpdateFolderDto = { name: 'Updated Name' };
			folderService.updateFolder.mockRejectedValue(new FolderNotFoundError('Folder not found'));

			// Act & Assert
			await expect(controller.updateFolder(req, mockResponse, payload)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('should handle user error as bad request', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const payload: UpdateFolderDto = { name: '' };
			folderService.updateFolder.mockRejectedValue(new UserError('Folder name cannot be empty'));

			// Act & Assert
			await expect(controller.updateFolder(req, mockResponse, payload)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('deleteFolder', () => {
		it('should delete folder successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const payload: DeleteFolderDto = { transferContentsTo: 'folder-456' };
			folderService.deleteFolder.mockResolvedValue(undefined);

			// Act
			await controller.deleteFolder(req, mockResponse, payload);

			// Assert
			expect(folderService.deleteFolder).toHaveBeenCalledWith(
				mockUser,
				'folder-123',
				'project-123',
				payload,
			);
		});

		it('should handle delete errors appropriately', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const payload: DeleteFolderDto = {};
			folderService.deleteFolder.mockRejectedValue(
				new UserError('Cannot delete folder with contents'),
			);

			// Act & Assert
			await expect(controller.deleteFolder(req, mockResponse, payload)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('listFolders', () => {
		it('should return paginated folders list', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				params: { projectId: 'project-123' },
			});

			const payload: ListFolderQueryDto = {
				take: 10,
				skip: 0,
				filter: '',
			};

			const folders = [
				{ id: 'folder-1', name: 'Folder 1' },
				{ id: 'folder-2', name: 'Folder 2' },
			];

			folderService.getManyAndCount.mockResolvedValue([folders, 2]);

			// Act
			await controller.listFolders(req, mockResponse, payload);

			// Assert
			expect(folderService.getManyAndCount).toHaveBeenCalledWith('project-123', payload);
			expect(mockResponse.json).toHaveBeenCalledWith({
				count: 2,
				data: folders,
			});
		});
	});

	describe('getFolderContent', () => {
		it('should return folder content counts', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const contentCounts = {
				totalSubFolders: 3,
				totalWorkflows: 5,
			};

			folderService.getFolderAndWorkflowCount.mockResolvedValue(contentCounts);

			// Act
			const result = await controller.getFolderContent(req);

			// Assert
			expect(folderService.getFolderAndWorkflowCount).toHaveBeenCalledWith(
				'folder-123',
				'project-123',
			);
			expect(result).toEqual(contentCounts);
		});
	});

	describe('transferFolderToProject', () => {
		it('should transfer folder to another project', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest>({ user: mockUser });
			const sourceFolderId = 'folder-123';
			const sourceProjectId = 'project-123';
			const body: TransferFolderBodyDto = {
				destinationProjectId: 'project-456',
				destinationParentFolderId: 'folder-789',
				shareCredentials: true,
			};

			const transferResult = {
				success: true,
				transferredFolder: { id: sourceFolderId, name: 'Transferred Folder' },
			};

			enterpriseWorkflowService.transferFolder.mockResolvedValue(transferResult);

			// Act
			const result = await controller.transferFolderToProject(
				req,
				mockResponse,
				sourceFolderId,
				sourceProjectId,
				body,
			);

			// Assert
			expect(enterpriseWorkflowService.transferFolder).toHaveBeenCalledWith(
				mockUser,
				sourceProjectId,
				sourceFolderId,
				body.destinationProjectId,
				body.destinationParentFolderId,
				body.shareCredentials,
			);
			expect(result).toEqual(transferResult);
		});
	});

	describe('getFolder', () => {
		it('should return specific folder', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const folder = {
				id: 'folder-123',
				name: 'Test Folder',
				projectId: 'project-123',
				parentFolderId: null,
			};

			folderService.findFolderInProjectOrFail.mockResolvedValue(folder);

			// Act
			const result = await controller.getFolder(req);

			// Assert
			expect(folderService.findFolderInProjectOrFail).toHaveBeenCalledWith(
				'folder-123',
				'project-123',
			);
			expect(result).toEqual(folder);
		});
	});

	describe('getFolderPath', () => {
		it('should return folder path', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const path = ['Root', 'SubFolder', 'TargetFolder'];
			folderService.getFolderPath.mockResolvedValue(path);

			// Act
			const result = await controller.getFolderPath(req);

			// Assert
			expect(folderService.getFolderPath).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual({ path });
		});
	});

	describe('getFolderAncestors', () => {
		it('should return folder ancestors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const ancestors = [
				{ id: 'folder-root', name: 'Root' },
				{ id: 'folder-parent', name: 'Parent' },
			];

			folderService.getFolderAncestors.mockResolvedValue(ancestors);

			// Act
			const result = await controller.getFolderAncestors(req);

			// Assert
			expect(folderService.getFolderAncestors).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual({ ancestors });
		});
	});

	describe('getFolderDescendants', () => {
		it('should return folder descendants', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const descendants = [
				{ id: 'folder-child1', name: 'Child 1' },
				{ id: 'folder-child2', name: 'Child 2' },
			];

			folderService.getFolderDescendants.mockResolvedValue(descendants);

			// Act
			const result = await controller.getFolderDescendants(req);

			// Assert
			expect(folderService.getFolderDescendants).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual({ descendants });
		});
	});

	describe('duplicateFolder', () => {
		it('should duplicate folder successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const payload = {
				name: 'Duplicated Folder',
				parentFolderId: 'folder-parent',
				includeWorkflows: true,
			};

			const duplicatedFolder = {
				id: 'folder-new',
				name: 'Duplicated Folder',
				parentFolderId: 'folder-parent',
			};

			folderService.duplicateFolder.mockResolvedValue(duplicatedFolder);

			// Act
			const result = await controller.duplicateFolder(req, mockResponse, payload);

			// Assert
			expect(folderService.duplicateFolder).toHaveBeenCalledWith(
				'folder-123',
				'project-123',
				payload,
			);
			expect(result).toEqual(duplicatedFolder);
		});

		it('should handle duplication errors', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const payload = { name: 'Duplicate Name' };
			folderService.duplicateFolder.mockRejectedValue(new UserError('Folder name already exists'));

			// Act & Assert
			await expect(controller.duplicateFolder(req, mockResponse, payload)).rejects.toThrow(
				BadRequestError,
			);
		});
	});

	describe('bulkMoveFolders', () => {
		it('should move multiple folders successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				params: { projectId: 'project-123' },
			});

			const payload = {
				folderIds: ['folder-1', 'folder-2', 'folder-3'],
				targetFolderId: 'folder-target',
			};

			const moveResult = {
				movedFolders: payload.folderIds,
				successCount: 3,
				failureCount: 0,
			};

			folderService.bulkMoveFolders.mockResolvedValue(moveResult);

			// Act
			const result = await controller.bulkMoveFolders(req, mockResponse, payload);

			// Assert
			expect(folderService.bulkMoveFolders).toHaveBeenCalledWith(
				payload.folderIds,
				'project-123',
				payload.targetFolderId,
			);
			expect(result).toEqual(moveResult);
		});

		it('should validate bulk move payload', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				params: { projectId: 'project-123' },
			});

			// Act & Assert - empty folderIds
			await expect(
				controller.bulkMoveFolders(req, mockResponse, { folderIds: [] }),
			).rejects.toThrow(BadRequestError);

			// Act & Assert - too many folders
			const tooManyFolders = Array.from({ length: 51 }, (_, i) => `folder-${i}`);
			await expect(
				controller.bulkMoveFolders(req, mockResponse, { folderIds: tooManyFolders }),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('bulkDeleteFolders', () => {
		it('should delete multiple folders successfully', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123' },
			});

			const payload = {
				folderIds: ['folder-1', 'folder-2'],
				transferToFolderId: 'folder-backup',
			};

			const deleteResult = {
				deletedFolders: payload.folderIds,
				successCount: 2,
				failureCount: 0,
			};

			folderService.bulkDeleteFolders.mockResolvedValue(deleteResult);

			// Act
			const result = await controller.bulkDeleteFolders(req, mockResponse, payload);

			// Assert
			expect(folderService.bulkDeleteFolders).toHaveBeenCalledWith(
				mockUser,
				payload.folderIds,
				'project-123',
				payload.transferToFolderId,
			);
			expect(result).toEqual(deleteResult);
		});

		it('should validate bulk delete payload', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123' },
			});

			// Act & Assert - empty folderIds
			await expect(
				controller.bulkDeleteFolders(req, mockResponse, { folderIds: [] }),
			).rejects.toThrow(BadRequestError);

			// Act & Assert - too many folders
			const tooManyFolders = Array.from({ length: 51 }, (_, i) => `folder-${i}`);
			await expect(
				controller.bulkDeleteFolders(req, mockResponse, { folderIds: tooManyFolders }),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getFolderPermissions', () => {
		it('should return folder permissions', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const permissions = {
				canRead: true,
				canWrite: true,
				canDelete: false,
				canMove: true,
			};

			folderService.getFolderPermissions.mockResolvedValue(permissions);

			// Act
			const result = await controller.getFolderPermissions(req);

			// Assert
			expect(folderService.getFolderPermissions).toHaveBeenCalledWith(
				mockUser,
				'folder-123',
				'project-123',
			);
			expect(result).toEqual({ permissions });
		});
	});

	describe('getFolderStatistics', () => {
		it('should return folder statistics', async () => {
			// Arrange
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});

			const statistics = {
				totalFolders: 5,
				totalWorkflows: 12,
				totalExecutions: 150,
				lastModified: '2023-12-01T00:00:00Z',
			};

			folderService.getFolderStatistics.mockResolvedValue(statistics);

			// Act
			const result = await controller.getFolderStatistics(req);

			// Assert
			expect(folderService.getFolderStatistics).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual(statistics);
		});
	});

	describe('error handling patterns', () => {
		it('should consistently handle FolderNotFoundError across endpoints', async () => {
			const req = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'nonexistent' },
			});

			const folderNotFoundError = new FolderNotFoundError('Folder not found');

			// Test multiple endpoints
			folderService.getFolderTree.mockRejectedValue(folderNotFoundError);
			folderService.findFolderInProjectOrFail.mockRejectedValue(folderNotFoundError);
			folderService.getFolderPath.mockRejectedValue(folderNotFoundError);

			await expect(controller.getFolderTree(req, mockResponse)).rejects.toThrow(NotFoundError);
			await expect(controller.getFolder(req)).rejects.toThrow(NotFoundError);
			await expect(controller.getFolderPath(req)).rejects.toThrow(NotFoundError);
		});

		it('should handle concurrent operations safely', async () => {
			// Arrange
			const req1 = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-1' },
			});

			const req2 = mock<AuthenticatedRequest<{ projectId: string; folderId: string }>>({
				params: { projectId: 'project-123', folderId: 'folder-2' },
			});

			folderService.findFolderInProjectOrFail
				.mockResolvedValueOnce({ id: 'folder-1', name: 'Folder 1' })
				.mockResolvedValueOnce({ id: 'folder-2', name: 'Folder 2' });

			// Act
			const [result1, result2] = await Promise.all([
				controller.getFolder(req1),
				controller.getFolder(req2),
			]);

			// Assert
			expect(result1.id).toBe('folder-1');
			expect(result2.id).toBe('folder-2');
			expect(folderService.findFolderInProjectOrFail).toHaveBeenCalledTimes(2);
		});
	});
});
