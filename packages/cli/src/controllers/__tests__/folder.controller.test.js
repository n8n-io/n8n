'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const folder_not_found_error_1 = require('@/errors/folder-not-found.error');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const folder_service_1 = require('@/services/folder.service');
const workflow_service_ee_1 = require('@/workflows/workflow.service.ee');
const folder_controller_1 = require('../folder.controller');
describe('ProjectController (Folder)', () => {
	const folderService = (0, backend_test_utils_1.mockInstance)(folder_service_1.FolderService);
	const enterpriseWorkflowService = (0, backend_test_utils_1.mockInstance)(
		workflow_service_ee_1.EnterpriseWorkflowService,
	);
	const controller = di_1.Container.get(folder_controller_1.ProjectController);
	let mockUser;
	let mockResponse;
	beforeEach(() => {
		jest.clearAllMocks();
		mockUser = (0, jest_mock_extended_1.mock)({
			id: 'user-123',
			email: 'test@example.com',
			role: 'global:member',
		});
		mockResponse = (0, jest_mock_extended_1.mock)({
			json: jest.fn(),
		});
	});
	describe('createFolder', () => {
		it('should create a new folder successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { projectId: 'project-123' },
			});
			const payload = {
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
			const result = await controller.createFolder(req, mockResponse, payload);
			expect(folderService.createFolder).toHaveBeenCalledWith(payload, 'project-123');
			expect(result).toEqual(createdFolder);
		});
		it('should handle folder not found errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123' },
			});
			const payload = { name: 'New Folder' };
			folderService.createFolder.mockRejectedValue(
				new folder_not_found_error_1.FolderNotFoundError('Parent folder not found'),
			);
			await expect(controller.createFolder(req, mockResponse, payload)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
		it('should handle generic errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123' },
			});
			const payload = { name: 'New Folder' };
			folderService.createFolder.mockRejectedValue(new Error('Database error'));
			await expect(controller.createFolder(req, mockResponse, payload)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('getFolderTree', () => {
		it('should return folder tree', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.getFolderTree(req, mockResponse);
			expect(folderService.getFolderTree).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual(folderTree);
		});
		it('should handle folder not found in tree', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'nonexistent-folder' },
			});
			folderService.getFolderTree.mockRejectedValue(
				new folder_not_found_error_1.FolderNotFoundError('Folder not found'),
			);
			await expect(controller.getFolderTree(req, mockResponse)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
	});
	describe('getFolderUsedCredentials', () => {
		it('should return used credentials in folder', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const credentials = [
				{ id: 'cred-1', name: 'Database Connection', type: 'mysql' },
				{ id: 'cred-2', name: 'API Key', type: 'httpBasicAuth' },
			];
			enterpriseWorkflowService.getFolderUsedCredentials.mockResolvedValue(credentials);
			const result = await controller.getFolderUsedCredentials(req, mockResponse);
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
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const payload = {
				name: 'Updated Folder Name',
				description: 'Updated description',
			};
			folderService.updateFolder.mockResolvedValue(undefined);
			await controller.updateFolder(req, mockResponse, payload);
			expect(folderService.updateFolder).toHaveBeenCalledWith('folder-123', 'project-123', payload);
		});
		it('should handle folder not found error', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'nonexistent-folder' },
			});
			const payload = { name: 'Updated Name' };
			folderService.updateFolder.mockRejectedValue(
				new folder_not_found_error_1.FolderNotFoundError('Folder not found'),
			);
			await expect(controller.updateFolder(req, mockResponse, payload)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
		it('should handle user error as bad request', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const payload = { name: '' };
			folderService.updateFolder.mockRejectedValue(
				new n8n_workflow_1.UserError('Folder name cannot be empty'),
			);
			await expect(controller.updateFolder(req, mockResponse, payload)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
	});
	describe('deleteFolder', () => {
		it('should delete folder successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const payload = { transferContentsTo: 'folder-456' };
			folderService.deleteFolder.mockResolvedValue(undefined);
			await controller.deleteFolder(req, mockResponse, payload);
			expect(folderService.deleteFolder).toHaveBeenCalledWith(
				mockUser,
				'folder-123',
				'project-123',
				payload,
			);
		});
		it('should handle delete errors appropriately', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const payload = {};
			folderService.deleteFolder.mockRejectedValue(
				new n8n_workflow_1.UserError('Cannot delete folder with contents'),
			);
			await expect(controller.deleteFolder(req, mockResponse, payload)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
	});
	describe('listFolders', () => {
		it('should return paginated folders list', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123' },
			});
			const payload = {
				take: 10,
				skip: 0,
				filter: '',
			};
			const folders = [
				{ id: 'folder-1', name: 'Folder 1' },
				{ id: 'folder-2', name: 'Folder 2' },
			];
			folderService.getManyAndCount.mockResolvedValue([folders, 2]);
			await controller.listFolders(req, mockResponse, payload);
			expect(folderService.getManyAndCount).toHaveBeenCalledWith('project-123', payload);
			expect(mockResponse.json).toHaveBeenCalledWith({
				count: 2,
				data: folders,
			});
		});
	});
	describe('getFolderContent', () => {
		it('should return folder content counts', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const contentCounts = {
				totalSubFolders: 3,
				totalWorkflows: 5,
			};
			folderService.getFolderAndWorkflowCount.mockResolvedValue(contentCounts);
			const result = await controller.getFolderContent(req);
			expect(folderService.getFolderAndWorkflowCount).toHaveBeenCalledWith(
				'folder-123',
				'project-123',
			);
			expect(result).toEqual(contentCounts);
		});
	});
	describe('transferFolderToProject', () => {
		it('should transfer folder to another project', async () => {
			const req = (0, jest_mock_extended_1.mock)({ user: mockUser });
			const sourceFolderId = 'folder-123';
			const sourceProjectId = 'project-123';
			const body = {
				destinationProjectId: 'project-456',
				destinationParentFolderId: 'folder-789',
				shareCredentials: true,
			};
			const transferResult = {
				success: true,
				transferredFolder: { id: sourceFolderId, name: 'Transferred Folder' },
			};
			enterpriseWorkflowService.transferFolder.mockResolvedValue(transferResult);
			const result = await controller.transferFolderToProject(
				req,
				mockResponse,
				sourceFolderId,
				sourceProjectId,
				body,
			);
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
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const folder = {
				id: 'folder-123',
				name: 'Test Folder',
				projectId: 'project-123',
				parentFolderId: null,
			};
			folderService.findFolderInProjectOrFail.mockResolvedValue(folder);
			const result = await controller.getFolder(req);
			expect(folderService.findFolderInProjectOrFail).toHaveBeenCalledWith(
				'folder-123',
				'project-123',
			);
			expect(result).toEqual(folder);
		});
	});
	describe('getFolderPath', () => {
		it('should return folder path', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const path = ['Root', 'SubFolder', 'TargetFolder'];
			folderService.getFolderPath.mockResolvedValue(path);
			const result = await controller.getFolderPath(req);
			expect(folderService.getFolderPath).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual({ path });
		});
	});
	describe('getFolderAncestors', () => {
		it('should return folder ancestors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const ancestors = [
				{ id: 'folder-root', name: 'Root' },
				{ id: 'folder-parent', name: 'Parent' },
			];
			folderService.getFolderAncestors.mockResolvedValue(ancestors);
			const result = await controller.getFolderAncestors(req);
			expect(folderService.getFolderAncestors).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual({ ancestors });
		});
	});
	describe('getFolderDescendants', () => {
		it('should return folder descendants', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const descendants = [
				{ id: 'folder-child1', name: 'Child 1' },
				{ id: 'folder-child2', name: 'Child 2' },
			];
			folderService.getFolderDescendants.mockResolvedValue(descendants);
			const result = await controller.getFolderDescendants(req);
			expect(folderService.getFolderDescendants).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual({ descendants });
		});
	});
	describe('duplicateFolder', () => {
		it('should duplicate folder successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.duplicateFolder(req, mockResponse, payload);
			expect(folderService.duplicateFolder).toHaveBeenCalledWith(
				'folder-123',
				'project-123',
				payload,
			);
			expect(result).toEqual(duplicatedFolder);
		});
		it('should handle duplication errors', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const payload = { name: 'Duplicate Name' };
			folderService.duplicateFolder.mockRejectedValue(
				new n8n_workflow_1.UserError('Folder name already exists'),
			);
			await expect(controller.duplicateFolder(req, mockResponse, payload)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
		});
	});
	describe('bulkMoveFolders', () => {
		it('should move multiple folders successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.bulkMoveFolders(req, mockResponse, payload);
			expect(folderService.bulkMoveFolders).toHaveBeenCalledWith(
				payload.folderIds,
				'project-123',
				payload.targetFolderId,
			);
			expect(result).toEqual(moveResult);
		});
		it('should validate bulk move payload', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123' },
			});
			await expect(
				controller.bulkMoveFolders(req, mockResponse, { folderIds: [] }),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			const tooManyFolders = Array.from({ length: 51 }, (_, i) => `folder-${i}`);
			await expect(
				controller.bulkMoveFolders(req, mockResponse, { folderIds: tooManyFolders }),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('bulkDeleteFolders', () => {
		it('should delete multiple folders successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.bulkDeleteFolders(req, mockResponse, payload);
			expect(folderService.bulkDeleteFolders).toHaveBeenCalledWith(
				mockUser,
				payload.folderIds,
				'project-123',
				payload.transferToFolderId,
			);
			expect(result).toEqual(deleteResult);
		});
		it('should validate bulk delete payload', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: mockUser,
				params: { projectId: 'project-123' },
			});
			await expect(
				controller.bulkDeleteFolders(req, mockResponse, { folderIds: [] }),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
			const tooManyFolders = Array.from({ length: 51 }, (_, i) => `folder-${i}`);
			await expect(
				controller.bulkDeleteFolders(req, mockResponse, { folderIds: tooManyFolders }),
			).rejects.toThrow(bad_request_error_1.BadRequestError);
		});
	});
	describe('getFolderPermissions', () => {
		it('should return folder permissions', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.getFolderPermissions(req);
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
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-123' },
			});
			const statistics = {
				totalFolders: 5,
				totalWorkflows: 12,
				totalExecutions: 150,
				lastModified: '2023-12-01T00:00:00Z',
			};
			folderService.getFolderStatistics.mockResolvedValue(statistics);
			const result = await controller.getFolderStatistics(req);
			expect(folderService.getFolderStatistics).toHaveBeenCalledWith('folder-123', 'project-123');
			expect(result).toEqual(statistics);
		});
	});
	describe('error handling patterns', () => {
		it('should consistently handle FolderNotFoundError across endpoints', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'nonexistent' },
			});
			const folderNotFoundError = new folder_not_found_error_1.FolderNotFoundError(
				'Folder not found',
			);
			folderService.getFolderTree.mockRejectedValue(folderNotFoundError);
			folderService.findFolderInProjectOrFail.mockRejectedValue(folderNotFoundError);
			folderService.getFolderPath.mockRejectedValue(folderNotFoundError);
			await expect(controller.getFolderTree(req, mockResponse)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
			await expect(controller.getFolder(req)).rejects.toThrow(not_found_error_1.NotFoundError);
			await expect(controller.getFolderPath(req)).rejects.toThrow(not_found_error_1.NotFoundError);
		});
		it('should handle concurrent operations safely', async () => {
			const req1 = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-1' },
			});
			const req2 = (0, jest_mock_extended_1.mock)({
				params: { projectId: 'project-123', folderId: 'folder-2' },
			});
			folderService.findFolderInProjectOrFail
				.mockResolvedValueOnce({ id: 'folder-1', name: 'Folder 1' })
				.mockResolvedValueOnce({ id: 'folder-2', name: 'Folder 2' });
			const [result1, result2] = await Promise.all([
				controller.getFolder(req1),
				controller.getFolder(req2),
			]);
			expect(result1.id).toBe('folder-1');
			expect(result2.id).toBe('folder-2');
			expect(folderService.findFolderInProjectOrFail).toHaveBeenCalledTimes(2);
		});
	});
});
//# sourceMappingURL=folder.controller.test.js.map
