import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowHistory, WorkflowHistoryRepository } from '@n8n/db';
import { mock, mockClear } from 'jest-mock-extended';

import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { getWorkflow } from '@test-integration/workflow';

const workflowHistoryRepository = mockInstance(WorkflowHistoryRepository);
const logger = mockLogger();
const workflowFinderService = mockInstance(WorkflowFinderService);
const workflowHistoryService = new WorkflowHistoryService(
	logger,
	workflowHistoryRepository,
	workflowFinderService,
);
const testUser = Object.assign(new User(), {
	id: '1234',
	password: 'passwordHash',
	mfaEnabled: false,
	firstName: 'John',
	lastName: 'Doe',
});

describe('WorkflowHistoryService', () => {
	beforeEach(() => {
		mockClear(workflowHistoryRepository.insert);
	});

	describe('saveVersion', () => {
		it('should save a new version when nodes and connections are present', async () => {
			// Arrange
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);

			// Assert
			expect(workflowHistoryRepository.insert).toHaveBeenCalledWith({
				authors: 'John Doe',
				connections: {},
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
				autosaved: false,
			});
		});

		it('should save a new version with autosaved: true when autosaved parameter is true', async () => {
			// Arrange
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId, true);

			// Assert
			expect(workflowHistoryRepository.insert).toHaveBeenCalledWith({
				authors: 'John Doe',
				connections: {},
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
				autosaved: true,
			});
		});

		it('should save a new version with autosaved: false when autosaved parameter is false', async () => {
			// Arrange
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId, false);

			// Assert
			expect(workflowHistoryRepository.insert).toHaveBeenCalledWith({
				authors: 'John Doe',
				connections: {},
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
				autosaved: false,
			});
		});

		it('should throw an error when nodes or connections are missing', async () => {
			// Arrange
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.id = workflowId;
			workflow.versionId = '456';
			// Nodes are set but connections is empty

			// Act & Assert
			await expect(
				workflowHistoryService.saveVersion(testUser, workflow, workflowId),
			).rejects.toThrow(
				'Cannot save workflow history: nodes and connections are required for workflow 123',
			);
			expect(workflowHistoryRepository.insert).not.toHaveBeenCalled();
		});

		it('should log an error when failed to save workflow history version', async () => {
			// Arrange
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const workflowId = '123';
			workflow.connections = {};
			workflow.id = workflowId;
			workflow.versionId = '456';
			workflowHistoryRepository.insert.mockRejectedValueOnce(new Error('Test error'));

			// Act
			await workflowHistoryService.saveVersion(testUser, workflow, workflowId);

			// Assert
			expect(workflowHistoryRepository.insert).toHaveBeenCalled();
		});
	});

	describe('getVersionsByIds', () => {
		it('should return empty array when versionIds is empty', async () => {
			// Arrange
			const workflowId = '123';
			const versionIds: string[] = [];

			// Act
			const result = await workflowHistoryService.getVersionsByIds(
				testUser,
				workflowId,
				versionIds,
			);

			// Assert
			expect(result).toEqual([]);
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(workflowHistoryRepository.find).not.toHaveBeenCalled();
		});

		it('should throw SharedWorkflowNotFoundError when workflow not found for user', async () => {
			// Arrange
			const workflowId = '123';
			const versionIds = ['version1', 'version2'];
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(
				workflowHistoryService.getVersionsByIds(testUser, workflowId, versionIds),
			).rejects.toThrow(SharedWorkflowNotFoundError);
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, testUser, [
				'workflow:read',
			]);
		});

		it('should return only existing versions from the provided list', async () => {
			// Arrange
			const workflowId = '123';
			const versionIds = ['version1', 'version2', 'version3'];
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);

			const mockVersions = [
				{ versionId: 'version1', createdAt: new Date('2024-01-01') },
				{ versionId: 'version3', createdAt: new Date('2024-01-03') },
			];
			workflowHistoryRepository.find.mockResolvedValueOnce(mockVersions as any);

			// Act
			const result = await workflowHistoryService.getVersionsByIds(
				testUser,
				workflowId,
				versionIds,
			);

			// Assert
			expect(result).toEqual([
				{ versionId: 'version1', createdAt: new Date('2024-01-01') },
				{ versionId: 'version3', createdAt: new Date('2024-01-03') },
			]);
		});

		it('should return versionId and createdAt for each found version', async () => {
			// Arrange
			const workflowId = '123';
			const versionIds = ['version1'];
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);

			const createdAt = new Date('2024-01-01');
			const mockVersions = [{ versionId: 'version1', createdAt }];
			workflowHistoryRepository.find.mockResolvedValueOnce(mockVersions as WorkflowHistory[]);

			// Act
			const result = await workflowHistoryService.getVersionsByIds(
				testUser,
				workflowId,
				versionIds,
			);

			// Assert
			expect(result).toEqual([{ versionId: 'version1', createdAt }]);
			expect(result[0]).toHaveProperty('versionId');
			expect(result[0]).toHaveProperty('createdAt');
			expect(Object.keys(result[0])).toHaveLength(2);
		});

		it('should call workflowFinderService.findWorkflowForUser with correct parameters', async () => {
			// Arrange
			const workflowId = '123';
			const versionIds = ['version1'];
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);
			workflowHistoryRepository.find.mockResolvedValueOnce([]);

			// Act
			await workflowHistoryService.getVersionsByIds(testUser, workflowId, versionIds);

			// Assert
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, testUser, [
				'workflow:read',
			]);
		});
	});

	describe('updateVersionWithUser', () => {
		const mockTransactionManager = {
			findOne: jest.fn(),
			save: jest.fn(),
		};

		beforeEach(() => {
			mockClear(workflowFinderService.findWorkflowForUser);
			mockTransactionManager.findOne.mockReset();
			mockTransactionManager.save.mockReset();
			workflowHistoryRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					return await callback(mockTransactionManager);
				}),
			} as any;
		});

		it('should update version with name and description', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = '456';
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);

			const existingVersion = Object.assign(new WorkflowHistory(), {
				versionId,
				workflowId,
				name: 'Old Name',
				description: 'Old Description',
			});
			mockTransactionManager.findOne.mockResolvedValueOnce(existingVersion);

			const updatedVersion = Object.assign(new WorkflowHistory(), {
				...existingVersion,
				name: 'New Name',
				description: 'New Description',
			});
			mockTransactionManager.save.mockResolvedValueOnce(updatedVersion);

			// Act
			const result = await workflowHistoryService.updateVersionWithUser(
				testUser,
				workflowId,
				versionId,
				{ name: 'New Name', description: 'New Description' },
			);

			// Assert
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, testUser, [
				'workflow:update',
			]);
			expect(mockTransactionManager.findOne).toHaveBeenCalledWith(WorkflowHistory, {
				where: { workflowId, versionId },
			});
			expect(mockTransactionManager.save).toHaveBeenCalledWith(
				WorkflowHistory,
				expect.objectContaining({ name: 'New Name', description: 'New Description' }),
			);
			expect(result).toEqual(updatedVersion);
		});

		it('should update version with only name', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = '456';
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);

			const existingVersion = Object.assign(new WorkflowHistory(), {
				versionId,
				workflowId,
				name: 'Old Name',
			});
			mockTransactionManager.findOne.mockResolvedValueOnce(existingVersion);

			const updatedVersion = Object.assign(new WorkflowHistory(), {
				...existingVersion,
				name: 'New Name',
			});
			mockTransactionManager.save.mockResolvedValueOnce(updatedVersion);

			// Act
			const result = await workflowHistoryService.updateVersionWithUser(
				testUser,
				workflowId,
				versionId,
				{ name: 'New Name' },
			);

			// Assert
			expect(mockTransactionManager.save).toHaveBeenCalledWith(
				WorkflowHistory,
				expect.objectContaining({ name: 'New Name' }),
			);
			expect(result).toEqual(updatedVersion);
		});

		it('should throw SharedWorkflowNotFoundError when workflow not found for user', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = '456';
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(
				workflowHistoryService.updateVersionWithUser(testUser, workflowId, versionId, {
					name: 'New Name',
				}),
			).rejects.toThrow(SharedWorkflowNotFoundError);

			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, testUser, [
				'workflow:update',
			]);
			expect(mockTransactionManager.findOne).not.toHaveBeenCalled();
		});

		it('should throw WorkflowHistoryVersionNotFoundError when version not found', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = '456';
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);
			mockTransactionManager.findOne.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(
				workflowHistoryService.updateVersionWithUser(testUser, workflowId, versionId, {
					name: 'New Name',
				}),
			).rejects.toThrow(WorkflowHistoryVersionNotFoundError);

			expect(mockTransactionManager.findOne).toHaveBeenCalledWith(WorkflowHistory, {
				where: { workflowId, versionId },
			});
			expect(mockTransactionManager.save).not.toHaveBeenCalled();
		});

		it('should call workflowFinderService with workflow:update scope', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = '456';
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);

			const existingVersion = Object.assign(new WorkflowHistory(), { versionId, workflowId });
			mockTransactionManager.findOne.mockResolvedValueOnce(existingVersion);
			mockTransactionManager.save.mockResolvedValueOnce(existingVersion);

			// Act
			await workflowHistoryService.updateVersionWithUser(testUser, workflowId, versionId, {
				name: 'Test',
			});

			// Assert
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, testUser, [
				'workflow:update',
			]);
		});
	});
});
