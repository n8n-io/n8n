import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowHistoryRepository } from '@n8n/db';
import type { UpdateResult } from '@n8n/typeorm';
import { mockClear } from 'jest-mock-extended';

import { EventService } from '@/events/event.service';
import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { getWorkflow, getWorkflowHistory } from '@test-integration/workflow';

const workflowHistoryRepository = mockInstance(WorkflowHistoryRepository);
const logger = mockLogger();
const workflowFinderService = mockInstance(WorkflowFinderService);
const eventService = mockInstance(EventService);
const workflowHistoryService = new WorkflowHistoryService(
	logger,
	workflowHistoryRepository,
	workflowFinderService,
	eventService,
);
const testUser = Object.assign(new User(), {
	id: '1234',
	password: 'passwordHash',
	mfaEnabled: false,
	firstName: 'John',
	lastName: 'Doe',
});

const mockUpdateResult: UpdateResult = {
	affected: 1,
	generatedMaps: [],
	raw: [],
};

describe('WorkflowHistoryService', () => {
	beforeEach(() => {
		mockClear(workflowHistoryRepository.insert);
		mockClear(workflowHistoryRepository.update);
		mockClear(workflowHistoryRepository.find);
		mockClear(workflowHistoryRepository.findOne);
		mockClear(workflowFinderService.findWorkflowForUser);
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
				getWorkflowHistory(workflow, { versionId: 'version1', createdAt: new Date('2024-01-01') }),
				getWorkflowHistory(workflow, { versionId: 'version3', createdAt: new Date('2024-01-03') }),
			];
			workflowHistoryRepository.find.mockResolvedValueOnce(mockVersions);

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
			const mockVersions = [getWorkflowHistory(workflow, { versionId: 'version1', createdAt })];
			workflowHistoryRepository.find.mockResolvedValueOnce(mockVersions);

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

	describe('updateVersionForUser', () => {
		it('should update version after checking permissions', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = 'version1';
			const updateData = { name: 'Updated Name' };
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;

			const mockVersion = getWorkflowHistory(workflow, {
				versionId,
				workflowId,
				name: 'Original Name',
				description: 'Original Description',
				autosaved: true,
			});

			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);
			workflowHistoryRepository.findOne.mockResolvedValueOnce(mockVersion);
			workflowHistoryRepository.update.mockResolvedValue(mockUpdateResult);

			// Act
			await workflowHistoryService.updateVersionForUser(
				testUser,
				workflowId,
				versionId,
				updateData,
			);

			// Assert
			expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith(workflowId, testUser, [
				'workflow:update',
			]);
			expect(workflowHistoryRepository.findOne).toHaveBeenCalledWith({
				where: { workflowId, versionId },
			});
			expect(workflowHistoryRepository.update).toHaveBeenCalledWith(
				{ versionId, workflowId },
				updateData,
			);
		});

		it('should throw SharedWorkflowNotFoundError when workflow not found for user', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = 'version1';
			const updateData = { name: 'Updated Name' };
			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(
				workflowHistoryService.updateVersionForUser(testUser, workflowId, versionId, updateData),
			).rejects.toThrow(SharedWorkflowNotFoundError);
			expect(workflowHistoryRepository.update).not.toHaveBeenCalled();
		});

		it('should throw WorkflowHistoryVersionNotFoundError when version not found', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = 'version1';
			const updateData = { name: 'Updated Name' };
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			workflow.id = workflowId;

			workflowFinderService.findWorkflowForUser.mockResolvedValueOnce(workflow);
			workflowHistoryRepository.findOne.mockResolvedValueOnce(null);

			// Act & Assert
			await expect(
				workflowHistoryService.updateVersionForUser(testUser, workflowId, versionId, updateData),
			).rejects.toThrow(WorkflowHistoryVersionNotFoundError);
			expect(workflowHistoryRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('updateVersion', () => {
		it('should update version without permission checks', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = 'version1';
			const updateData = { name: 'Updated Name', description: 'Updated Description' };
			workflowHistoryRepository.update.mockResolvedValue(mockUpdateResult);

			// Act
			await workflowHistoryService.updateVersion(workflowId, versionId, updateData);

			// Assert
			expect(workflowHistoryRepository.update).toHaveBeenCalledWith(
				{ versionId, workflowId },
				updateData,
			);
			expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
			expect(workflowHistoryRepository.findOne).not.toHaveBeenCalled();
		});

		it('should allow updating name and description', async () => {
			// Arrange
			const workflowId = '123';
			const versionId = 'version1';
			const updateData = {
				name: 'Updated Name',
				description: 'Updated Description',
			};
			workflowHistoryRepository.update.mockResolvedValue(mockUpdateResult);

			// Act
			await workflowHistoryService.updateVersion(workflowId, versionId, updateData);

			// Assert
			expect(workflowHistoryRepository.update).toHaveBeenCalledWith(
				{ versionId, workflowId },
				updateData,
			);
		});
	});
});
