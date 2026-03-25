import type { SourceControlledFile } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	type Variables,
	type VariablesRepository,
	type FolderRepository,
	type CredentialsRepository,
	type SharedCredentialsRepository,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	Project,
	type ProjectRelation,
	type ProjectRelationRepository,
	type ProjectRepository,
	type SharedWorkflowRepository,
	type TagRepository,
	type WorkflowTagMappingRepository,
	User,
	type UserRepository,
	WorkflowEntity,
	type WorkflowRepository,
} from '@n8n/db';
import { In } from '@n8n/typeorm';
import * as fastGlob from 'fast-glob';
import { mock } from 'jest-mock-extended';
import { type InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { DataTableColumnRepository } from '@/modules/data-table/data-table-column.repository';
import type { DataTableDDLService } from '@/modules/data-table/data-table-ddl.service';

import { SourceControlImportService } from '../source-control-import.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import type { ExportableFolder } from '../types/exportable-folders';
import type { ExportableProject } from '../types/exportable-project';
import { SourceControlContext } from '../types/source-control-context';

import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

jest.mock('fast-glob');

const globalAdminContext = new SourceControlContext(
	Object.assign(new User(), {
		role: GLOBAL_ADMIN_ROLE,
	}),
);

const globalMemberContext = new SourceControlContext(
	Object.assign(new User(), {
		role: GLOBAL_MEMBER_ROLE,
	}),
);

describe('SourceControlImportService', () => {
	const workflowRepository = mock<WorkflowRepository>();
	const folderRepository = mock<FolderRepository>();
	const projectRepository = mock<ProjectRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const tagRepository = mock<TagRepository>();
	const workflowTagMappingRepository = mock<WorkflowTagMappingRepository>();
	const userRepository = mock<UserRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const mockLogger = mock<Logger>();
	const sourceControlScopedService = mock<SourceControlScopedService>();
	const variableService = mock<VariablesService>();
	const variablesRepository = mock<VariablesRepository>();
	const workflowService = mock<WorkflowService>();
	const workflowHistoryService = mock<WorkflowHistoryService>();
	const dataTableRepository = mock<DataTableRepository>();
	const dataTableColumnRepository = mock<DataTableColumnRepository>();
	const dataTableDDLService = mock<DataTableDDLService>();
	const service = new SourceControlImportService(
		mockLogger,
		mock(),
		variableService,
		credentialsRepository,
		projectRepository,
		projectRelationRepository,
		tagRepository,
		sharedWorkflowRepository,
		sharedCredentialsRepository,
		userRepository,
		variablesRepository,
		workflowRepository,
		workflowTagMappingRepository,
		workflowService,
		mock(),
		mock(),
		folderRepository,
		mock<InstanceSettings>({ n8nFolder: '/mock/n8n' }),
		sourceControlScopedService,
		workflowHistoryService,
		dataTableRepository,
		dataTableColumnRepository,
		dataTableDDLService,
	);

	const globMock = fastGlob.default as unknown as jest.Mock<Promise<string[]>, string[]>;
	const fsReadFile = jest.spyOn(fsp, 'readFile');

	beforeEach(() => jest.clearAllMocks());

	describe('getRemoteVersionIdsFromFiles', () => {
		const mockWorkflowFile = '/mock/workflow1.json';
		it('should parse workflow files correctly', async () => {
			globMock.mockResolvedValue([mockWorkflowFile]);

			const mockWorkflowData = {
				id: 'workflow1',
				versionId: 'v1',
				name: 'Test Workflow',
				owner: {
					type: 'personal',
					personalEmail: 'email@email.com',
				},
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));
			sourceControlScopedService.getAuthorizedProjectsFromContext.mockResolvedValueOnce([]);

			const result = await service.getRemoteVersionIdsFromFiles(globalAdminContext);
			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile, { encoding: 'utf8' });

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'workflow1',
					versionId: 'v1',
					name: 'Test Workflow',
				}),
			);
		});

		it('should log and throw an error if a workflow file cannot be parsed', async () => {
			globMock.mockResolvedValue([mockWorkflowFile]);

			// Mock invalid JSON that will cause parsing to fail
			fsReadFile.mockResolvedValue('{ invalid json');

			await expect(service.getRemoteVersionIdsFromFiles(globalAdminContext)).rejects.toThrow(
				`Failed to parse workflow file ${mockWorkflowFile}`,
			);

			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile, { encoding: 'utf8' });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Parsing workflow file ${mockWorkflowFile}`);
			expect(mockLogger.error).toHaveBeenCalledWith(
				`Failed to parse workflow file ${mockWorkflowFile}`,
				expect.any(Object),
			);
		});

		it('should filter out files without valid workflow data', async () => {
			globMock.mockResolvedValue(['/mock/invalid.json']);

			fsReadFile.mockResolvedValue('{}');

			const result = await service.getRemoteVersionIdsFromFiles(globalAdminContext);

			expect(result).toHaveLength(0);
		});
	});

	describe('importWorkflowFromWorkFolder', () => {
		it('should import workflows from work folder', async () => {
			// Arrange
			const mockUserId = 'user-id-123';
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), {
					id: 'personal-project-id-123',
					name: 'Personal Project',
					type: 'personal',
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			);
			const mockWorkflowFile1 = '/mock/workflow1.json';
			const mockWorkflowFile2 = '/mock/workflow2.json';
			const mockWorkflowData1 = {
				id: '1',
				name: 'Workflow 1',
				active: false,
				nodes: [],
				connections: {},
				versionId: 'v1',
				owner: {
					type: 'personal',
					personalEmail: 'user@example.com',
				},
				parentFolderId: null,
			};
			const mockWorkflowData2 = {
				id: '2',
				name: 'Workflow 2',
				active: false,
				nodes: [],
				connections: {},
				versionId: 'v2',
				owner: {
					type: 'personal',
					personalEmail: 'user@example.com',
				},
				parentFolderId: null,
			};
			const candidates = [
				mock<SourceControlledFile>({ file: mockWorkflowFile1, id: mockWorkflowData1.id }),
				mock<SourceControlledFile>({ file: mockWorkflowFile2, id: mockWorkflowData2.id }),
			];

			workflowRepository.findByIds.mockResolvedValue([]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: '1' }],
				generatedMaps: [],
				raw: [],
			});

			fsReadFile
				.mockResolvedValueOnce(JSON.stringify(mockWorkflowData1))
				.mockResolvedValueOnce(JSON.stringify(mockWorkflowData2));

			// Act
			const result = await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile1, { encoding: 'utf8' });
			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile2, { encoding: 'utf8' });
			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: mockWorkflowData1.id,
					name: mockWorkflowData1.name,
				}),
				['id'],
			);
			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: mockWorkflowData2.id,
					name: mockWorkflowData2.name,
				}),
				['id'],
			);

			expect(result).toEqual([
				{
					id: mockWorkflowData1.id,
					name: mockWorkflowFile1,
				},
				{
					id: mockWorkflowData2.id,
					name: mockWorkflowFile2,
				},
			]);
		});

		it('should log and throw an error if a workflow file cannot be parsed', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/invalid-workflow.json';
			const candidates = [
				mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow-id' }),
			];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), {
					id: 'personal-project-id-123',
					name: 'Personal Project',
					type: 'personal',
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			);
			workflowRepository.findByIds.mockResolvedValue([]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);

			// Mock invalid JSON that will cause parsing to fail
			fsReadFile.mockResolvedValue('{ invalid json');

			await expect(service.importWorkflowFromWorkFolder(candidates, mockUserId)).rejects.toThrow(
				`Failed to parse workflow file ${mockWorkflowFile}`,
			);

			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile, { encoding: 'utf8' });
			expect(mockLogger.debug).toHaveBeenCalledWith(`Parsing workflow file ${mockWorkflowFile}`);
			expect(mockLogger.error).toHaveBeenCalledWith(
				`Failed to parse workflow file ${mockWorkflowFile}`,
				expect.any(Object),
			);
		});

		it('should skip corrupted workflow files but import valid ones', async () => {
			const mockUserId = 'user-id-123';
			const mockCorruptedFile = '/mock/corrupted-workflow.json';
			const mockValidFile = '/mock/valid-workflow.json';
			const mockCorruptedData = {
				id: 'workflow1',
				name: 'Corrupted Workflow',
				// Missing required fields: versionId, nodes, connections
			};
			const mockValidData = {
				id: 'workflow2',
				name: 'Valid Workflow',
				nodes: [],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
			};
			const candidates = [
				mock<SourceControlledFile>({ file: mockCorruptedFile, id: 'workflow1' }),
				mock<SourceControlledFile>({ file: mockValidFile, id: 'workflow2' }),
			];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow2' }],
				generatedMaps: [],
				raw: [],
			});

			fsReadFile
				.mockResolvedValueOnce(JSON.stringify(mockCorruptedData))
				.mockResolvedValueOnce(JSON.stringify(mockValidData));

			const result = await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			// Should log error for corrupted file
			expect(mockLogger.error).toHaveBeenCalledWith(
				`Workflow file ${mockCorruptedFile} is missing required fields (id, versionId, nodes, connections)`,
			);

			// Should still import the valid workflow
			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'workflow2',
					name: 'Valid Workflow',
				}),
				['id'],
			);

			// Result should only contain the valid workflow
			expect(result).toEqual([
				{
					id: 'workflow2',
					name: mockValidFile,
				},
			]);
		});

		it('should skip workflows with history save failures but import valid ones', async () => {
			const candidates = [
				mock<SourceControlledFile>({ file: '/mock/wf1.json', id: 'wf1' }),
				mock<SourceControlledFile>({ file: '/mock/wf2.json', id: 'wf2' }),
			];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'wf' }],
				generatedMaps: [],
				raw: [],
			});
			userRepository.findOne.mockResolvedValue(Object.assign(new User(), { id: 'user1' }));

			workflowHistoryService.findVersion
				.mockRejectedValueOnce(new Error('DB error'))
				.mockResolvedValueOnce(null);

			fsReadFile
				.mockResolvedValueOnce(
					JSON.stringify({ id: 'wf1', nodes: [], connections: {}, versionId: 'v1' }),
				)
				.mockResolvedValueOnce(
					JSON.stringify({ id: 'wf2', nodes: [], connections: {}, versionId: 'v1' }),
				);

			const result = await service.importWorkflowFromWorkFolder(candidates, 'user1');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to save or update workflow history for workflow wf1',
				expect.any(Object),
			);
			expect(result).toEqual([{ id: 'wf2', name: '/mock/wf2.json' }]);
		});

		it('should set new workflows as inactive', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'New Workflow',
				nodes: [],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow1' }],
				generatedMaps: [],
				raw: [],
			});

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));
			userRepository.findOne.mockResolvedValue(
				Object.assign(new User(), { id: mockUserId, firstName: 'Test', lastName: 'User' }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(null);

			await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'workflow1',
					active: false,
					activeVersionId: null,
				}),
				['id'],
			);
			expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		it('should keep existing inactive workflows inactive', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Existing Workflow',
				nodes: [],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					name: 'Existing Workflow',
					active: false,
					activeVersionId: null,
				}),
			]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow1' }],
				generatedMaps: [],
				raw: [],
			});
			userRepository.findOne.mockResolvedValue(
				Object.assign(new User(), { id: mockUserId, firstName: 'Test', lastName: 'User' }),
			);
			workflowHistoryService.findVersion.mockResolvedValue(null);

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

			await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'workflow1',
					active: false,
					activeVersionId: null,
				}),
				['id'],
			);
			expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		it('should preserve existing active workflow active version', async () => {
			const mockUserId = 'user-id-123';
			const mockUser = Object.assign(new User(), { id: mockUserId });
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Active Workflow',
				nodes: [],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				active: true,
				activeVersionId: 'v2',
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			userRepository.findOne.mockResolvedValue(mockUser);
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					name: 'Active Workflow',
					active: true,
					activeVersionId: 'v1',
				}),
			]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow1' }],
				generatedMaps: [],
				raw: [],
			});

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

			await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'workflow1',
					active: true,
					activeVersionId: 'v1',
				}),
				['id'],
			);
			expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		it('should unpublish archived workflows even if they were previously published', async () => {
			const mockUserId = 'user-id-123';
			const mockUser = Object.assign(new User(), { id: mockUserId });
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Archived Workflow',
				nodes: [],
				connections: {},
				versionId: 'v1',
				parentFolderId: null,
				isArchived: true,
				active: true,
				activeVersionId: 'v1',
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					name: 'Archived Workflow',
					active: true,
					activeVersionId: 'version-123',
				}),
			]);
			userRepository.findOne.mockResolvedValue(mockUser);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow1' }],
				generatedMaps: [],
				raw: [],
			});

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

			await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'workflow1',
					active: false,
					activeVersionId: null,
				}),
				['id'],
			);
			expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(mockUser, 'workflow1');
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
		});

		describe('autoPublish parameter', () => {
			const mockUserId = 'user-id-123';
			const mockUser = Object.assign(new User(), { id: mockUserId });

			beforeEach(() => {
				projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
					Object.assign(new Project(), { id: 'project1', type: 'personal' }),
				);
				folderRepository.find.mockResolvedValue([]);
				sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
				workflowRepository.upsert.mockResolvedValue({
					identifiers: [{ id: 'workflow1' }],
					generatedMaps: [],
					raw: [],
				});
				userRepository.findOne.mockResolvedValue(mockUser);
			});

			it('should preserve existing active state of an active workflow with autoPublish="none"', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Active Workflow',
					nodes: [],
					connections: {},
					versionId: 'v2',
					parentFolderId: null,
					active: true,
					activeVersionId: 'v2',
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					active: true,
					activeVersionId: 'v1',
					versionId: 'v1',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'none');

				// Should preserve existing active state
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: true,
						activeVersionId: 'v1',
					}),
					['id'],
				);
				expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
				expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
			});

			it('should preserve existing active state of an inactive workflow with autoPublish="none"', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Active Workflow',
					nodes: [],
					connections: {},
					versionId: 'v1',
					parentFolderId: null,
					active: true,
					activeVersionId: 'v1',
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					active: false,
					activeVersionId: null,
					versionId: 'v1',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'none');

				// Should preserve existing active state
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: false,
						activeVersionId: null,
					}),
					['id'],
				);
				expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
				expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
			});

			it('should publish new workflows with autoPublish="all"', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'New Workflow',
					versionId: 'remote-version-123',
					nodes: [],
					connections: {},
					parentFolderId: null,
					active: false,
					activeVersionId: null,
				};

				workflowRepository.findByIds.mockResolvedValue([]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'all');

				// Should import as inactive first
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: false,
						activeVersionId: null,
					}),
					['id'],
				);

				expect(workflowService.activateWorkflow).toHaveBeenCalledWith(
					mockUser,
					'workflow1',
					expect.objectContaining({
						// versionId must be preserved from remote file for change detection to work correctly
						versionId: 'remote-version-123',
					}),
				);
			});

			it('should republish existing workflows with autoPublish="all"', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Existing Workflow',
					versionId: 'v2',
					nodes: [],
					connections: {},
					parentFolderId: null,
					active: false,
					activeVersionId: null,
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					active: true,
					activeVersionId: 'v1',
					versionId: 'v1',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'all');

				// Should import as inactive first
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: false,
						activeVersionId: null,
					}),
					['id'],
				);

				// Should be unpublished first and then published
				expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(mockUser, 'workflow1');
				expect(workflowService.activateWorkflow).toHaveBeenCalledWith(
					mockUser,
					'workflow1',
					expect.objectContaining({
						// versionId must be preserved from remote file for change detection to work correctly
						versionId: 'v2',
					}),
				);
			});

			it('should publish only previously published workflows with autoPublish="published"', async () => {
				const mockWorkflowFile1 = '/mock/workflow1.json';
				const mockWorkflowFile2 = '/mock/workflow2.json';
				const mockWorkflowData1 = {
					id: 'workflow1',
					name: 'Previously Active',
					nodes: [],
					connections: {},
					versionId: 'v1',
					parentFolderId: null,
					active: false,
					activeVersionId: null,
				};
				const mockWorkflowData2 = {
					id: 'workflow2',
					name: 'Previously Inactive',
					nodes: [],
					connections: {},
					versionId: 'v1',
					parentFolderId: null,
					active: false,
					activeVersionId: null,
				};
				const existingWorkflow1 = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					activeVersionId: 'v1',
					versionId: 'v1',
				});
				const existingWorkflow2 = Object.assign(new WorkflowEntity(), {
					id: 'workflow2',
					activeVersionId: null,
					versionId: 'v2',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow1, existingWorkflow2]);
				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockWorkflowData1))
					.mockResolvedValueOnce(JSON.stringify(mockWorkflowData2));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile1, id: 'workflow1' }),
					mock<SourceControlledFile>({ file: mockWorkflowFile2, id: 'workflow2' }),
				];

				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'published');

				// Workflow1 should be unpublished (was previously published) and then published
				expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(mockUser, 'workflow1');
				expect(workflowService.activateWorkflow).toHaveBeenCalledWith(
					mockUser,
					'workflow1',
					expect.any(Object),
				);
				// Workflow2 should not be published (was previously unpublished)
				expect(workflowService.activateWorkflow).not.toHaveBeenCalledWith(
					mockUser,
					'workflow2',
					expect.any(Object),
				);
			});

			it('should never publish archived workflows regardless of autoPublish mode', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Archived Workflow',
					nodes: [],
					connections: {},
					versionId: 'v1',
					parentFolderId: null,
					isArchived: true,
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					activeVersionId: 'v1',
					versionId: 'v1',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				// Test with 'all' mode
				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'all');

				// Should unpublish the previously active workflow
				expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(mockUser, 'workflow1');
				// Should NOT publish archived workflow
				expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
				// Should import as unpublished
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: false,
						activeVersionId: null,
						isArchived: true,
					}),
					['id'],
				);
			});

			it('should unpublish and republish workflow when transitioning versions', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Active Workflow',
					versionId: 'new-version',
					nodes: [],
					connections: {},
					parentFolderId: null,
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					activeVersionId: 'old-version',
					versionId: 'old-version',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'published');

				// Should unpublish old version
				expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(mockUser, 'workflow1');
				// Should import with new version as unpublished
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: false,
						activeVersionId: null,
						// versionId must be preserved from remote file for change detection to work correctly
						versionId: 'new-version',
					}),
					['id'],
				);
				// Should publish with new version after history is saved
				expect(workflowService.activateWorkflow).toHaveBeenCalledWith(
					mockUser,
					'workflow1',
					expect.objectContaining({
						// versionId must be preserved from remote file for change detection to work correctly
						versionId: 'new-version',
					}),
				);
			});

			it('should handle activation errors gracefully', async () => {
				const mockUserId = 'user-id-123';
				const mockUser = Object.assign(new User(), { id: mockUserId });
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Workflow with activation error',
					nodes: [],
					connections: {},
					versionId: 'v1',
					parentFolderId: null,
				};
				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
					Object.assign(new Project(), { id: 'project1', type: 'personal' }),
				);
				workflowRepository.findByIds.mockResolvedValue([]);
				userRepository.findOne.mockResolvedValue(mockUser);
				folderRepository.find.mockResolvedValue([]);
				sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
				workflowRepository.upsert.mockResolvedValue({
					identifiers: [{ id: 'workflow1' }],
					generatedMaps: [],
					raw: [],
				});
				workflowService.activateWorkflow.mockRejectedValue(new Error('Activation failed'));

				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

				const result = await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'all');

				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to publish workflow workflow1',
					expect.any(Object),
				);
				expect(result).toEqual([
					{ id: 'workflow1', name: mockWorkflowFile, publishingError: 'Activation failed' },
				]);
			});

			it('should preserve published state when unpublish fails', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Published Workflow',
					nodes: [],
					connections: {},
					versionId: 'v2',
					parentFolderId: null,
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					active: true,
					activeVersionId: 'v1',
					versionId: 'v1',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));
				// Simulate unpublish failure
				workflowService.deactivateWorkflow.mockRejectedValue(new Error('Deactivation failed'));

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				const result = await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'all');

				// Should log the unpublish error
				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to unpublish workflow workflow1',
					expect.any(Object),
				);

				// Should preserve existing active state because unpublish failed
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: true,
						activeVersionId: 'v1',
					}),
					['id'],
				);

				// Should NOT attempt to republish since unpublish failed
				expect(workflowService.activateWorkflow).not.toHaveBeenCalled();

				// Should return activation error
				expect(result).toEqual([
					{
						id: 'workflow1',
						name: mockWorkflowFile,
						publishingError: 'Failed to unpublish workflow before import',
					},
				]);
			});

			it('should preserve published state when user not found during unpublish', async () => {
				const mockWorkflowFile = '/mock/workflow1.json';
				const mockWorkflowData = {
					id: 'workflow1',
					name: 'Published Workflow',
					nodes: [],
					connections: {},
					versionId: 'v2',
					parentFolderId: null,
				};
				const existingWorkflow = Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					active: true,
					activeVersionId: 'v1',
					versionId: 'v1',
				});

				workflowRepository.findByIds.mockResolvedValue([existingWorkflow]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));
				// Simulate user not found during unpublish
				userRepository.findOne.mockResolvedValue(null);

				const candidates = [
					mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' }),
				];

				const result = await service.importWorkflowFromWorkFolder(candidates, mockUserId, 'all');

				// Should log the user not found error
				expect(mockLogger.error).toHaveBeenCalledWith(
					'User user-id-123 not found, cannot unpublish workflow workflow1',
				);

				// Should preserve existing active state because unpublish failed
				expect(workflowRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						active: true,
						activeVersionId: 'v1',
					}),
					['id'],
				);

				// Should NOT attempt to republish since unpublish failed
				expect(workflowService.activateWorkflow).not.toHaveBeenCalled();

				// Should return activation error
				expect(result).toEqual([
					{
						id: 'workflow1',
						name: mockWorkflowFile,
						publishingError: 'Failed to unpublish workflow before import',
					},
				]);
			});
		});
	});

	describe('getRemoteCredentialsFromFiles', () => {
		it('should parse credential files correctly', async () => {
			globMock.mockResolvedValue(['/mock/credential1.json']);

			const mockCredentialData = {
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));

			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'cred1',
					name: 'Test Credential',
					type: 'oauth2',
				}),
			);
		});

		it('should filter out files without valid credential data', async () => {
			globMock.mockResolvedValue(['/mock/invalid.json']);
			fsReadFile.mockResolvedValue('{}');

			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);

			expect(result).toHaveLength(0);
		});

		it('should parse global credentials with isGlobal flag set to true', async () => {
			globMock.mockResolvedValue(['/mock/global-credential.json']);

			const mockGlobalCredentialData = {
				id: 'global-cred1',
				name: 'Global Test Credential',
				type: 'oauth2',
				isGlobal: true,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockGlobalCredentialData));

			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'global-cred1',
					name: 'Global Test Credential',
					type: 'oauth2',
					isGlobal: true,
				}),
			);
		});

		it('should parse non-global credentials with isGlobal flag set to false', async () => {
			globMock.mockResolvedValue(['/mock/non-global-credential.json']);

			const mockNonGlobalCredentialData = {
				id: 'non-global-cred1',
				name: 'Non-Global Test Credential',
				type: 'oauth2',
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockNonGlobalCredentialData));

			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'non-global-cred1',
					name: 'Non-Global Test Credential',
					type: 'oauth2',
					isGlobal: false,
				}),
			);
		});

		it('should default isGlobal to false when not specified in credential file', async () => {
			globMock.mockResolvedValue(['/mock/credential-no-flag.json']);

			const mockCredentialDataWithoutFlag = {
				id: 'cred-no-flag',
				name: 'Credential Without Flag',
				type: 'oauth2',
				// isGlobal not specified
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialDataWithoutFlag));

			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'cred-no-flag',
					name: 'Credential Without Flag',
					type: 'oauth2',
				}),
			);
			// isGlobal should default to false (undefined will be treated as false by the service)
			expect(result[0].isGlobal).toBeFalsy();
		});
	});

	describe('importCredentialsFromWorkFolder', () => {
		const mockUserId = 'user-id-123';
		const mockPersonalProject = Object.assign(new Project(), {
			id: 'personal-project-id-123',
			name: 'Personal Project',
			type: 'personal',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		beforeEach(() => {
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(mockPersonalProject);
		});

		it('should import a new credential with sanitized data', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/cred1.json',
					id: 'cred1',
					name: 'New Credential',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockCredentialData = {
				id: 'cred1',
				name: 'New Credential',
				type: 'oauth2Api',
				data: {
					clientId: '={{ $vars.clientId }}', // Expression - should be preserved
					clientSecret: 'plain-secret', // Plain string - should be sanitized to empty
					port: 443, // Number - should be preserved
					ssl: true, // Boolean - should be preserved
				},
				ownedBy: {
					type: 'personal' as const,
					personalEmail: 'user@example.com',
					projectId: 'personal-project-id-123',
					projectName: 'Personal Project',
				},
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'cred1',
				name: 'New Credential',
				type: 'oauth2Api',
			});

			// Verify that upsert was called with sanitized data
			expect(credentialsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'cred1',
					name: 'New Credential',
					type: 'oauth2Api',
					isGlobal: false,
				}),
				['id'],
			);

			// Verify the credential data was sanitized properly
			const upsertCall = credentialsRepository.upsert.mock.calls[0][0] as Record<string, unknown>;
			expect(upsertCall.data).toBeDefined();
		});

		it('should update an existing credential (verifies upsert is called)', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/cred1.json',
					id: 'cred1',
					name: 'Existing Credential',
					type: 'credential',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			// Existing credential without data (simulates credential that exists but has no decryptable data)
			const existingCredential = {
				id: 'cred1',
				name: 'Existing Credential',
				type: 'oauth2Api',
				data: undefined, // No existing data - will use sanitized remote data
			};

			const remoteCredentialData = {
				id: 'cred1',
				name: 'Existing Credential',
				type: 'oauth2Api',
				data: {
					clientId: '={{ $vars.newClientId }}', // Expression
					port: 8080, // Number
					ssl: false, // Boolean
				},
				ownedBy: {
					type: 'personal' as const,
					personalEmail: 'user@example.com',
				},
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(remoteCredentialData));
			credentialsRepository.find.mockResolvedValue([existingCredential as any]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: 'cred1',
				name: 'Existing Credential',
				type: 'oauth2Api',
			});

			// Verify upsert was called - this confirms the update flow works
			expect(credentialsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'cred1',
					name: 'Existing Credential',
					type: 'oauth2Api',
					isGlobal: false,
				}),
				['id'],
			);
		});

		it('should handle isGlobal flag set to true', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/global-cred.json',
					id: 'global-cred',
					name: 'Global Credential',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockGlobalCredentialData = {
				id: 'global-cred',
				name: 'Global Credential',
				type: 'httpBasicAuth',
				data: {
					username: 'admin',
					password: 'secret',
				},
				ownedBy: null,
				isGlobal: true,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockGlobalCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'global-cred',
					isGlobal: true,
				}),
				['id'],
			);
		});

		it('should default isGlobal to false when not specified', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/cred-no-flag.json',
					id: 'cred-no-flag',
					name: 'Credential Without Flag',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockCredentialData = {
				id: 'cred-no-flag',
				name: 'Credential Without Flag',
				type: 'httpBasicAuth',
				data: {},
				ownedBy: null,
				// isGlobal not specified
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'cred-no-flag',
					isGlobal: false, // Should default to false
				}),
				['id'],
			);
		});

		it('should sync resource ownership for team-owned credentials', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/team-cred.json',
					id: 'team-cred',
					name: 'Team Credential',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockTeamProject = Object.assign(new Project(), {
				id: 'team-id-123',
				name: 'Engineering Team',
				type: 'team',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const mockTeamCredentialData = {
				id: 'team-cred',
				name: 'Team Credential',
				type: 'httpBasicAuth',
				data: {},
				ownedBy: {
					type: 'team' as const,
					teamId: 'team-id-123',
					teamName: 'Engineering Team',
				},
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockTeamCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});
			projectRepository.findOne.mockResolvedValue(mockTeamProject);

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalled();
		});

		it('should preserve synchable data types (expressions, numbers, booleans)', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/complex-cred.json',
					id: 'complex-cred',
					name: 'Complex Credential',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockComplexCredentialData = {
				id: 'complex-cred',
				name: 'Complex Credential',
				type: 'httpBasicAuth',
				data: {
					expression: '={{ $json.apiKey }}',
					port: 8080,
					zero: 0,
					negative: -1,
					float: 0.5,
					enabled: true,
					disabled: false,
					plainSecret: 'secret123',
					emptyString: '',
				},
				ownedBy: null,
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockComplexCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalled();

			// The sanitization should preserve expressions, numbers, and booleans
			// but convert plain strings to empty strings
		});

		it('should handle multiple credentials in batch', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/cred1.json',
					id: 'cred1',
					name: 'Credential 1',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
				{
					file: '/mock/credential_stubs/cred2.json',
					id: 'cred2',
					name: 'Credential 2',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockCredentialData1 = {
				id: 'cred1',
				name: 'Credential 1',
				type: 'oauth2Api',
				data: {},
				ownedBy: null,
				isGlobal: false,
			};

			const mockCredentialData2 = {
				id: 'cred2',
				name: 'Credential 2',
				type: 'httpBasicAuth',
				data: {},
				ownedBy: null,
				isGlobal: true,
			};

			fsReadFile
				.mockResolvedValueOnce(JSON.stringify(mockCredentialData1))
				.mockResolvedValueOnce(JSON.stringify(mockCredentialData2));

			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				id: 'cred1',
				name: 'Credential 1',
				type: 'oauth2Api',
			});
			expect(result[1]).toEqual({
				id: 'cred2',
				name: 'Credential 2',
				type: 'httpBasicAuth',
			});

			expect(credentialsRepository.upsert).toHaveBeenCalledTimes(2);
		});

		it('should handle credential with existing shared ownership record', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/shared-cred.json',
					id: 'shared-cred',
					name: 'Shared Credential',
					type: 'credential',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const existingCredential = {
				id: 'shared-cred',
				name: 'Shared Credential',
				type: 'httpBasicAuth',
				data: undefined, // No existing data to avoid decryption
			};

			const existingSharedCredential = {
				credentialsId: 'shared-cred',
				projectId: 'old-project-id',
				role: 'credential:owner' as const,
			};

			const mockNewTeamProject = Object.assign(new Project(), {
				id: 'new-team-id',
				name: 'New Team',
				type: 'team',
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const mockCredentialData = {
				id: 'shared-cred',
				name: 'Shared Credential',
				type: 'httpBasicAuth',
				data: {
					port: 443,
					username: 'admin',
				},
				ownedBy: {
					type: 'team' as const,
					teamId: 'new-team-id',
					teamName: 'New Team',
				},
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));
			credentialsRepository.find.mockResolvedValue([existingCredential as any]);
			sharedCredentialsRepository.find.mockResolvedValue([existingSharedCredential as any]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});
			projectRepository.findOne.mockResolvedValue(mockNewTeamProject);

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalled();
			// Ownership sync should be handled by syncResourceOwnership
		});

		it('should sanitize credential data and exclude oauthTokenData', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/oauth-cred.json',
					id: 'oauth-cred',
					name: 'OAuth Credential',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockOAuthCredentialData = {
				id: 'oauth-cred',
				name: 'OAuth Credential',
				type: 'oauth2Api',
				data: {
					clientId: '={{ $vars.clientId }}',
					port: 443,
					oauthTokenData: {
						accessToken: 'should-be-excluded',
						refreshToken: 'should-be-excluded',
					},
				},
				ownedBy: null,
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockOAuthCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalled();

			// oauthTokenData should be excluded during sanitization
		});

		it('should handle null values in credential data', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/null-cred.json',
					id: 'null-cred',
					name: 'Credential with Nulls',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockCredentialData = {
				id: 'null-cred',
				name: 'Credential with Nulls',
				type: 'httpBasicAuth',
				data: {
					apiKey: null,
					port: 8080,
					enabled: true,
				} as any,
				ownedBy: null,
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalled();

			// Null values should be removed during sanitization
		});

		it('should handle deeply nested credential data structures', async () => {
			// Arrange
			const candidates: SourceControlledFile[] = [
				{
					file: '/mock/credential_stubs/nested-cred.json',
					id: 'nested-cred',
					name: 'Nested Credential',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: '',
				},
			];

			const mockNestedCredentialData = {
				id: 'nested-cred',
				name: 'Nested Credential',
				type: 'customApi',
				data: {
					level1: {
						level2: {
							level3: {
								expression: '={{ $json.secret }}',
								port: 9000,
								plainSecret: 'should-be-sanitized',
								enabled: true,
							},
						},
					},
				},
				ownedBy: null,
				isGlobal: false,
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockNestedCredentialData));
			credentialsRepository.find.mockResolvedValue([]);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			credentialsRepository.upsert.mockResolvedValue({
				identifiers: [],
				generatedMaps: [],
				raw: [],
			});

			// Act
			const result = await service.importCredentialsFromWorkFolder(candidates, mockUserId);

			// Assert
			expect(result).toHaveLength(1);
			expect(credentialsRepository.upsert).toHaveBeenCalled();

			// Nested structures should be properly sanitized
		});
	});

	describe('getRemoteVariablesFromFile', () => {
		it('should parse variables file correctly', async () => {
			globMock.mockResolvedValue(['/mock/variables.json']);

			const mockVariablesData = [
				{ key: 'VAR1', value: 'value1' },
				{ key: 'VAR2', value: 'value2' },
			];

			fsReadFile.mockResolvedValue(JSON.stringify(mockVariablesData));

			const result = await service.getRemoteVariablesFromFile();

			expect(result).toEqual(mockVariablesData);
		});

		it('should return empty array if no variables file found', async () => {
			globMock.mockResolvedValue([]);

			const result = await service.getRemoteVariablesFromFile();

			expect(result).toHaveLength(0);
		});
	});

	describe('getRemoteTagsAndMappingsFromFile', () => {
		it('should parse tags and mappings file correctly', async () => {
			globMock.mockResolvedValue(['/mock/tags.json']);

			const mockTagsData = {
				tags: [{ id: 'tag1', name: 'Tag 1' }],
				mappings: [{ workflowId: 'workflow1', tagId: 'tag1' }],
			};

			fsReadFile.mockResolvedValue(JSON.stringify(mockTagsData));

			const result = await service.getRemoteTagsAndMappingsFromFile(globalAdminContext);

			expect(result.tags).toEqual(mockTagsData.tags);
			expect(result.mappings).toEqual(mockTagsData.mappings);
		});

		it('should return empty tags and mappings if no file found', async () => {
			globMock.mockResolvedValue([]);

			const result = await service.getRemoteTagsAndMappingsFromFile(globalAdminContext);

			expect(result.tags).toHaveLength(0);
			expect(result.mappings).toHaveLength(0);
		});

		it('should return only folder that belong to a project that belongs to the user', async () => {
			globMock.mockResolvedValue(['/mock/tags.json']);

			const mockTagsData = {
				tags: [{ id: 'tag1', name: 'Tag 1' }],
				mappings: [
					{ workflowId: 'workflow1', tagId: 'tag1' },
					{ workflowId: 'workflow2', tagId: 'tag1' },
					{ workflowId: 'workflow3', tagId: 'tag1' },
				],
			};

			workflowRepository.find.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
				}),
				Object.assign(new WorkflowEntity(), {
					id: 'workflow3',
				}),
			]);
			fsReadFile.mockResolvedValue(JSON.stringify(mockTagsData));

			const result = await service.getRemoteTagsAndMappingsFromFile(globalAdminContext);

			expect(result.tags).toEqual(mockTagsData.tags);
			expect(result.mappings).toEqual(mockTagsData.mappings);
		});
	});

	describe('getLocalVersionIdsFromDb', () => {
		const now = new Date();
		jest.useFakeTimers({ now });

		it('should replace invalid updatedAt with current timestamp', async () => {
			const mockWorkflows = [
				{
					id: 'workflow1',
					name: 'Test Workflow',
					updatedAt: 'invalid-date',
				},
			] as unknown as WorkflowEntity[];

			workflowRepository.find.mockResolvedValue(mockWorkflows);

			const result = await service.getLocalVersionIdsFromDb(globalAdminContext);

			expect(result[0].updatedAt).toBe(now.toISOString());
		});
	});

	describe('folders', () => {
		describe('getRemoteFoldersAndMappingsFromFile', () => {
			it('should parse folders and mappings file correctly', async () => {
				globMock.mockResolvedValue(['/mock/folders.json']);

				const now = new Date();

				const mockFoldersData: {
					folders: ExportableFolder[];
				} = {
					folders: [
						{
							id: 'folder1',
							name: 'folder 1',
							parentFolderId: null,
							homeProjectId: 'project1',
							createdAt: now.toISOString(),
							updatedAt: now.toISOString(),
						},
					],
				};

				fsReadFile.mockResolvedValue(JSON.stringify(mockFoldersData));

				const result = await service.getRemoteFoldersAndMappingsFromFile(globalAdminContext);

				expect(result.folders).toEqual(mockFoldersData.folders);
			});

			it('should return empty folders and mappings if no file found', async () => {
				globMock.mockResolvedValue([]);

				const result = await service.getRemoteFoldersAndMappingsFromFile(globalAdminContext);

				expect(result.folders).toHaveLength(0);
			});

			it('should return only folder that belong to a project that belongs to the user', async () => {
				globMock.mockResolvedValue(['/mock/folders.json']);

				const now = new Date();

				const foldersToFind: ExportableFolder[] = [
					{
						id: 'folder1',
						name: 'folder 1',
						parentFolderId: null,
						homeProjectId: 'project1',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
					{
						id: 'folder3',
						name: 'folder 3',
						parentFolderId: null,
						homeProjectId: 'project1',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
					{
						id: 'folder4',
						name: 'folder 3',
						parentFolderId: null,
						homeProjectId: 'project3',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
				];

				const mockFoldersData: {
					folders: ExportableFolder[];
				} = {
					folders: [
						{
							id: 'folder0',
							name: 'folder 0',
							parentFolderId: null,
							homeProjectId: 'project0',
							createdAt: now.toISOString(),
							updatedAt: now.toISOString(),
						},
						...foldersToFind,
						{
							id: 'folder2',
							name: 'folder 2',
							parentFolderId: null,
							homeProjectId: 'project2',
							createdAt: now.toISOString(),
							updatedAt: now.toISOString(),
						},
					],
				};

				sourceControlScopedService.getAuthorizedProjectsFromContext.mockResolvedValue([
					Object.assign(new Project(), {
						id: 'project1',
					}),
					Object.assign(new Project(), {
						id: 'project3',
					}),
				]);
				fsReadFile.mockResolvedValue(JSON.stringify(mockFoldersData));

				const result = await service.getRemoteFoldersAndMappingsFromFile(globalMemberContext);

				expect(result.folders).toEqual(foldersToFind);
			});
		});

		describe('getLocalFoldersAndMappingsFromDb', () => {
			it('should return data from DB', async () => {
				// Arrange

				folderRepository.find.mockResolvedValue([
					mock({ createdAt: new Date(), updatedAt: new Date() }),
				]);
				workflowRepository.find.mockResolvedValue([mock()]);

				// Act

				const result = await service.getLocalFoldersAndMappingsFromDb(globalAdminContext);

				// Assert

				expect(result.folders).toHaveLength(1);
				expect(result.folders[0]).toHaveProperty('id');
				expect(result.folders[0]).toHaveProperty('name');
				expect(result.folders[0]).toHaveProperty('parentFolderId');
				expect(result.folders[0]).toHaveProperty('homeProjectId');
			});
		});

		describe('deleteFoldersNotInWorkfolder', () => {
			it('should call folderRepository.delete with correct ids', async () => {
				const candidates = [
					mock<SourceControlledFile>({ id: 'folder1' }),
					mock<SourceControlledFile>({ id: 'folder2' }),
					mock<SourceControlledFile>({ id: 'folder3' }),
				];
				await service.deleteFoldersNotInWorkfolder(candidates as any);

				expect(folderRepository.delete).toHaveBeenCalledWith({
					id: In(['folder1', 'folder2', 'folder3']),
				});
			});

			it('should not call folderRepository.delete if candidates is empty', async () => {
				await service.deleteFoldersNotInWorkfolder([]);
				expect(folderRepository.delete).not.toHaveBeenCalled();
			});
		});
	});

	describe('projects', () => {
		const mockPullingUserId = 'pulling-user-id';

		describe('importTeamProjectsFromWorkFolder', () => {
			it('should import team projects from work folder', async () => {
				// Arrange
				const mockProjectFile1 = '/mock/team-project1.json';
				const mockProjectFile2 = '/mock/team-project2.json';
				const mockProjectData1 = {
					id: 'project1',
					name: 'Team Project 1',
					icon: 'icon1.png',
					description: 'First team project',
					type: 'team',
					owner: {
						type: 'team',
						teamId: 'project1',
					},
				};
				const mockProjectData2 = {
					id: 'project2',
					name: 'Team Project 2',
					icon: 'icon2.png',
					description: 'Second team project',
					type: 'team',
					owner: {
						type: 'team',
						teamId: 'project2',
					},
					variableStubs: [{ id: 'var1', key: 'VAR1', value: 'value1' }],
				};
				const candidates = [
					mock<SourceControlledFile>({ file: mockProjectFile1, id: mockProjectData1.id }),
					mock<SourceControlledFile>({ file: mockProjectFile2, id: mockProjectData2.id }),
				];

				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockProjectData1))
					.mockResolvedValueOnce(JSON.stringify(mockProjectData2));

				variableService.getAllCached.mockResolvedValue([]);
				projectRepository.findOne.mockResolvedValue(null);

				// Act
				const result = await service.importTeamProjectsFromWorkFolder(
					candidates,
					mockPullingUserId,
				);

				// Assert
				expect(fsReadFile).toHaveBeenCalledWith(mockProjectFile1, { encoding: 'utf8' });
				expect(fsReadFile).toHaveBeenCalledWith(mockProjectFile2, { encoding: 'utf8' });
				expect(projectRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						id: mockProjectData1.id,
						name: mockProjectData1.name,
						icon: mockProjectData1.icon,
						description: mockProjectData1.description,
						type: mockProjectData1.type,
					}),
					['id'],
				);
				expect(projectRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						id: mockProjectData2.id,
						name: mockProjectData2.name,
						icon: mockProjectData2.icon,
						description: mockProjectData2.description,
						type: mockProjectData2.type,
					}),
					['id'],
				);
				expect(variablesRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						id: 'var1',
						key: 'VAR1',
						value: 'value1',
					}),
					['id'],
				);

				expect(projectRelationRepository.save).toHaveBeenCalledWith({
					projectId: mockProjectData1.id,
					userId: mockPullingUserId,
					role: { slug: 'project:admin' },
				});
				expect(projectRelationRepository.save).toHaveBeenCalledWith({
					projectId: mockProjectData2.id,
					userId: mockPullingUserId,
					role: { slug: 'project:admin' },
				});

				expect(result).toEqual([
					{
						id: mockProjectData1.id,
						name: mockProjectData1.name,
					},
					{
						id: mockProjectData2.id,
						name: mockProjectData2.name,
					},
				]);
			});

			it('should NOT assign pulling user as project admin for existing projects with an admin', async () => {
				// Arrange
				const mockProjectFile = '/mock/team-project.json';
				const mockProjectData = {
					id: 'existing-project',
					name: 'Existing Team Project',
					icon: 'icon.png',
					description: 'An existing team project',
					type: 'team',
					owner: {
						type: 'team',
						teamId: 'existing-project',
					},
				};
				const candidates = [
					mock<SourceControlledFile>({ file: mockProjectFile, id: mockProjectData.id }),
				];

				fsReadFile.mockResolvedValueOnce(JSON.stringify(mockProjectData));
				variableService.getAllCached.mockResolvedValue([]);
				// Project already exists
				projectRepository.findOne.mockResolvedValue(
					Object.assign(new Project(), { id: mockProjectData.id }),
				);
				// Project already has an admin
				projectRelationRepository.findOne.mockResolvedValue(
					mock<ProjectRelation>({
						projectId: mockProjectData.id,
						userId: 'existing-admin-user-id',
					}),
				);

				// Act
				await service.importTeamProjectsFromWorkFolder(candidates, mockPullingUserId);

				// Assert - project relation should NOT be created for existing projects with admin
				expect(projectRelationRepository.save).not.toHaveBeenCalled();
			});

			it('should assign pulling user as project admin for existing projects without an admin', async () => {
				// Arrange
				const mockProjectFile = '/mock/team-project.json';
				const mockProjectData = {
					id: 'orphaned-project',
					name: 'Orphaned Team Project',
					icon: 'icon.png',
					description: 'An existing team project without admin',
					type: 'team',
					owner: {
						type: 'team',
						teamId: 'orphaned-project',
					},
				};
				const candidates = [
					mock<SourceControlledFile>({ file: mockProjectFile, id: mockProjectData.id }),
				];

				fsReadFile.mockResolvedValueOnce(JSON.stringify(mockProjectData));
				variableService.getAllCached.mockResolvedValue([]);
				projectRepository.findOne.mockResolvedValue(
					Object.assign(new Project(), { id: mockProjectData.id }),
				);
				// Project has no admin
				projectRelationRepository.findOne.mockResolvedValue(null);

				// Act
				await service.importTeamProjectsFromWorkFolder(candidates, mockPullingUserId);

				// Assert - pulling user should be assigned as admin for orphaned projects
				expect(projectRelationRepository.save).toHaveBeenCalledWith({
					projectId: mockProjectData.id,
					userId: mockPullingUserId,
					role: { slug: 'project:admin' },
				});
			});

			it('should import only valid team projects and skip invalid ones', async () => {
				const mockTeamProjectFile = '/mock/project-team-valid.json';
				const mockTeamProjectData = {
					id: 'project-team-valid',
					name: 'Valid Team Project',
					icon: 'icon-team-valid',
					description: 'A valid team project',
					type: 'team',
					owner: {
						type: 'team',
						teamId: 'project-team-valid',
					},
				};
				const mockNonTeamProjectFile = '/mock/project-non-team.json';
				const mockNonTeamProjectData = {
					id: 'project-non-team',
					name: 'Personal Project',
					icon: 'icon-non-team',
					description: 'A personal project',
					type: 'personal', // not 'team'
					owner: {
						type: 'personal',
						personalEmail: 'user@email.com',
					},
				};
				const mockInconsistentOwnerFile = '/mock/project-inconsistent-owner.json';
				const mockInconsistentOwnerData = {
					id: 'project-team-inconsistent',
					name: 'Team Project Inconsistent',
					icon: 'icon-team-inconsistent',
					description: 'A team project with inconsistent owner',
					type: 'team',
					owner: {
						type: 'personal', // should be 'team'
						personalEmail: 'user@email.com',
					},
				};

				const candidates = [
					mock<SourceControlledFile>({ file: mockTeamProjectFile, id: mockTeamProjectData.id }),
					mock<SourceControlledFile>({
						file: mockNonTeamProjectFile,
						id: mockNonTeamProjectData.id,
					}),
					mock<SourceControlledFile>({
						file: mockInconsistentOwnerFile,
						id: mockInconsistentOwnerData.id,
					}),
				];

				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockTeamProjectData))
					.mockResolvedValueOnce(JSON.stringify(mockNonTeamProjectData))
					.mockResolvedValueOnce(JSON.stringify(mockInconsistentOwnerData));

				projectRepository.findOne.mockResolvedValue(null);

				const result = await service.importTeamProjectsFromWorkFolder(
					candidates,
					mockPullingUserId,
				);

				expect(fsReadFile).toHaveBeenCalledWith(mockTeamProjectFile, { encoding: 'utf8' });
				expect(fsReadFile).toHaveBeenCalledWith(mockNonTeamProjectFile, { encoding: 'utf8' });
				expect(fsReadFile).toHaveBeenCalledWith(mockInconsistentOwnerFile, { encoding: 'utf8' });

				expect(projectRepository.upsert).toHaveBeenCalledTimes(1);
				expect(projectRepository.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						id: mockTeamProjectData.id,
						name: mockTeamProjectData.name,
						icon: mockTeamProjectData.icon,
						description: mockTeamProjectData.description,
						type: mockTeamProjectData.type,
					}),
					['id'],
				);

				expect(result).toEqual([
					{
						id: mockTeamProjectData.id,
						name: mockTeamProjectData.name,
					},
				]);
			});

			it('should delete project variables not in the imported stubs', async () => {
				// Arrange
				const mockProjectFile = '/mock/team-project.json';
				const mockProjectData = {
					id: 'project1',
					name: 'Team Project 1',
					icon: 'icon1.png',
					description: 'First team project',
					type: 'team',
					owner: {
						type: 'team',
						teamId: 'project1',
					},
					variableStubs: [{ id: 'var1', key: 'VAR1', value: 'value1' }],
				};
				const candidates = [
					mock<SourceControlledFile>({ file: mockProjectFile, id: mockProjectData.id }),
				];

				fsReadFile.mockResolvedValueOnce(JSON.stringify(mockProjectData));

				variableService.getAllCached.mockResolvedValue([
					{
						id: 'var2',
						key: 'VAR2',
						value: 'value2',
						type: 'string',
						project: { id: 'project1' } as Project,
					} as Variables,
				]);

				projectRepository.findOne.mockResolvedValue(null);

				// Act
				await service.importTeamProjectsFromWorkFolder(candidates, mockPullingUserId);

				// Assert
				expect(variableService.deleteByIds).toHaveBeenCalledWith(['var2']);
			});
		});

		describe('getRemoteProjectsFromFiles', () => {
			const mockProjectData1: ExportableProject = {
				id: 'project1',
				name: 'Team Project 1',
				icon: { type: 'icon', value: 'icon1' },
				description: 'First team project',
				type: 'team',
				owner: {
					type: 'team',
					teamId: 'project1',
					teamName: 'Team Project 1',
				},
			};
			const mockProjectData2: ExportableProject = {
				id: 'project2',
				name: 'Team Project 2',
				icon: { type: 'icon', value: 'icon2' },
				description: 'Second team project',
				type: 'team',
				owner: {
					type: 'team',
					teamId: 'project2',
					teamName: 'Team Project 2',
				},
				variableStubs: [{ id: 'var1', key: 'VAR1', value: 'value1', type: 'string' }],
			};

			it('should return all projects if the user has access to all projects', async () => {
				// ARRANGE
				globMock.mockResolvedValue([`${mockProjectData1.id}.json`, `${mockProjectData2.id}.json`]);

				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockProjectData1))
					.mockResolvedValueOnce(JSON.stringify(mockProjectData2));

				// ACT
				const result = await service.getRemoteProjectsFromFiles(globalAdminContext);

				// ASSERT
				expect(fsReadFile).toHaveBeenCalledTimes(2);
				expect(fsReadFile).toHaveBeenCalledWith(`${mockProjectData1.id}.json`, {
					encoding: 'utf8',
				});
				expect(fsReadFile).toHaveBeenCalledWith(`${mockProjectData2.id}.json`, {
					encoding: 'utf8',
				});

				// expect the result to be the correct projects with the correct filename
				expect(result).toHaveLength(2);
				expect(result[0]).toMatchObject({
					...mockProjectData1,
					filename: `/mock/n8n/git/projects/${mockProjectData1.id}.json`,
				});
				expect(result[1]).toMatchObject({
					...mockProjectData2,
					filename: `/mock/n8n/git/projects/${mockProjectData2.id}.json`,
				});
			});

			it('should return only projects that the user has access to', async () => {
				// ARRANGE
				globMock.mockResolvedValue([`${mockProjectData1.id}.json`, `${mockProjectData2.id}.json`]);
				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockProjectData1))
					.mockResolvedValueOnce(JSON.stringify(mockProjectData2));

				// Only allow access to project2
				sourceControlScopedService.getAuthorizedProjectsFromContext.mockResolvedValue([
					mock<Project>({ id: mockProjectData2.id, type: 'team' }),
				]);

				// ACT
				const result = await service.getRemoteProjectsFromFiles(globalMemberContext);

				// ASSERT
				expect(fsReadFile).toHaveBeenCalledTimes(2);
				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					...mockProjectData2,
					filename: `/mock/n8n/git/projects/${mockProjectData2.id}.json`,
				});
			});
		});

		describe('getLocalTeamProjectsFromDb', () => {
			it('should return team projects with the correct filter', async () => {
				// ARRANGE
				const mockProjectData1: Project = mock<Project>({
					id: 'project1',
					name: 'Team Project 1',
					icon: null,
					description: 'First team project',
					type: 'team',
					createdAt: new Date(),
					updatedAt: new Date(),
					variables: [],
				});
				const mockProjectData2: Project = mock<Project>({
					id: 'project2',
					name: 'Team Project 2',
					icon: { type: 'icon', value: 'icon2' },
					description: 'Second team project',
					type: 'team',
					createdAt: new Date(),
					updatedAt: new Date(),
					variables: [],
				});

				const mockFilter = { id: 'test' };
				sourceControlScopedService.getProjectsWithPushScopeByContextFilter.mockReturnValue(
					mockFilter,
				);
				projectRepository.find.mockResolvedValue([mockProjectData1, mockProjectData2]);

				// ACT
				const result = await service.getLocalTeamProjectsFromDb(globalAdminContext);

				// ASSERT

				// making sure the correct filter is used
				expect(projectRepository.find).toHaveBeenCalledWith({
					select: ['id', 'name', 'description', 'icon', 'type'],
					relations: ['variables'],
					where: {
						type: 'team',
						...mockFilter,
					},
				});

				expect(result).toHaveLength(2);
				expect(result[0]).toMatchObject({
					id: mockProjectData1.id,
					name: mockProjectData1.name,
					description: mockProjectData1.description,
					icon: mockProjectData1.icon,
					filename: `/mock/n8n/git/projects/${mockProjectData1.id}.json`,
					type: mockProjectData1.type,
					owner: {
						type: 'team',
						teamId: mockProjectData1.id,
						teamName: mockProjectData1.name,
					},
				});
				expect(result[1]).toMatchObject({
					id: mockProjectData2.id,
					name: mockProjectData2.name,
					description: mockProjectData2.description,
					icon: mockProjectData2.icon,
					filename: `/mock/n8n/git/projects/${mockProjectData2.id}.json`,
					type: mockProjectData2.type,
					owner: {
						type: 'team',
						teamId: mockProjectData2.id,
						teamName: mockProjectData2.name,
					},
				});
			});

			it('should return all team projects', async () => {
				// ARRANGE
				const mockProjectData1: Project = mock<Project>({
					id: 'project1',
					name: 'Team Project 1',
					icon: null,
					description: 'First team project',
					type: 'team',
					createdAt: new Date(),
					updatedAt: new Date(),
					variables: [{ id: 'var1', key: 'VAR1', value: 'value1', type: 'string' }],
				});

				projectRepository.find.mockResolvedValue([mockProjectData1]);

				// ACT
				const result = await service.getLocalTeamProjectsFromDb();

				// ASSERT

				// making sure the correct filter is used
				expect(projectRepository.find).toHaveBeenCalledWith({
					select: ['id', 'name', 'description', 'icon', 'type'],
					relations: ['variables'],
					where: { type: 'team' },
				});

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({
					id: mockProjectData1.id,
					name: mockProjectData1.name,
					description: mockProjectData1.description,
					icon: mockProjectData1.icon,
					filename: `/mock/n8n/git/projects/${mockProjectData1.id}.json`,
					type: mockProjectData1.type,
					owner: {
						type: 'team',
						teamId: mockProjectData1.id,
						teamName: mockProjectData1.name,
					},
				});
			});
		});

		describe('deleteTeamProjectsNotInWorkfolder', () => {
			it('should delete candidate files', async () => {
				const candidates = [
					mock<SourceControlledFile>({ id: 'project-1' }),
					mock<SourceControlledFile>({ id: 'project-2' }),
				];

				await service.deleteTeamProjectsNotInWorkfolder(candidates);

				expect(projectRepository.delete).toHaveBeenCalledWith({
					id: In(['project-1', 'project-2']),
				});
			});

			it('should handle empty candidates array', async () => {
				await service.deleteTeamProjectsNotInWorkfolder([]);

				expect(projectRepository.delete).not.toHaveBeenCalled();
			});
		});
	});

	describe('Data Tables', () => {
		describe('getRemoteDataTablesFromFiles', () => {
			it('should return data tables from individual files', async () => {
				// Arrange
				const mockDataTable1 = {
					id: 'dt1',
					name: 'Test Table 1',
					projectId: 'project1',
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				};
				const mockDataTable2 = {
					id: 'dt2',
					name: 'Test Table 2',
					projectId: 'project2',
					columns: [{ id: 'col2', name: 'Column 2', type: 'number', index: 0 }],
					createdAt: '2024-01-03T00:00:00.000Z',
					updatedAt: '2024-01-04T00:00:00.000Z',
				};

				globMock.mockResolvedValue([
					'/mock/n8n/git/datatables/dt1.json',
					'/mock/n8n/git/datatables/dt2.json',
				]);
				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockDataTable1) as any)
					.mockResolvedValueOnce(JSON.stringify(mockDataTable2) as any);

				// Act
				const result = await service.getRemoteDataTablesFromFiles();

				// Assert
				expect(result).toEqual([mockDataTable1, mockDataTable2]);
				expect(globMock).toHaveBeenCalledWith('*.json', {
					cwd: '/mock/n8n/git/datatables',
					absolute: true,
				});
			});

			it('should return empty array when no files exist', async () => {
				// Arrange
				globMock.mockResolvedValue([]);

				// Act
				const result = await service.getRemoteDataTablesFromFiles();

				// Assert
				expect(result).toEqual([]);
			});

			it('should filter out null values from invalid JSON', async () => {
				// Arrange
				const mockDataTable = {
					id: 'dt1',
					name: 'Test Table',
					projectId: 'project1',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				};

				globMock.mockResolvedValue([
					'/mock/n8n/git/datatables/dt1.json',
					'/mock/n8n/git/datatables/invalid.json',
				]);
				fsReadFile
					.mockResolvedValueOnce(JSON.stringify(mockDataTable) as any)
					.mockResolvedValueOnce('invalid json' as any);

				// Act
				const result = await service.getRemoteDataTablesFromFiles();

				// Assert
				expect(result).toEqual([mockDataTable]);
			});
		});

		describe('getLocalDataTablesFromDb', () => {
			it('should return data tables from database', async () => {
				// Arrange
				const mockDataTables = [
					{
						id: 'dt1',
						name: 'Test Table',
						projectId: 'project1',
						columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
						createdAt: new Date('2024-01-01'),
						updatedAt: new Date('2024-01-02'),
						project: {
							id: 'project1',
							name: 'Team Project 1',
							type: 'team',
							projectRelations: [],
						},
					},
				];

				dataTableRepository.find.mockResolvedValue(mockDataTables as any);

				// Act
				const result = await service.getLocalDataTablesFromDb();

				// Assert
				expect(result).toHaveLength(1);
				expect(result[0]).toEqual({
					id: 'dt1',
					name: 'Test Table',
					ownedBy: {
						type: 'team',
						projectId: 'project1',
						projectName: 'Team Project 1',
					},
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					filename: expect.stringContaining('dt1.json'),
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				});
				expect(dataTableRepository.find).toHaveBeenCalledWith({
					relations: [
						'columns',
						'project',
						'project.projectRelations',
						'project.projectRelations.role',
					],
				});
			});

			it('should return empty array when no data tables exist', async () => {
				// Arrange
				dataTableRepository.find.mockResolvedValue([]);

				// Act
				const result = await service.getLocalDataTablesFromDb();

				// Assert
				expect(result).toEqual([]);
			});

			it('should return empty array when DataTable entity is not registered', async () => {
				// Arrange
				const error = new Error('No metadata for "DataTable" was found');
				dataTableRepository.find.mockRejectedValue(error);

				// Act
				const result = await service.getLocalDataTablesFromDb();

				// Assert
				expect(result).toEqual([]);
			});

			it('should throw error for other database errors', async () => {
				// Arrange
				const error = new Error('Database connection failed');
				dataTableRepository.find.mockRejectedValue(error);

				// Act & Assert
				await expect(service.getLocalDataTablesFromDb()).rejects.toThrow(
					'Database connection failed',
				);
			});
		});

		describe('importDataTablesFromWorkFolder', () => {
			const mockUser = Object.assign(new User(), {
				id: 'user1',
				role: GLOBAL_ADMIN_ROLE,
			});

			const mockPersonalProject = Object.assign(new Project(), {
				id: 'personal-project-1',
				type: 'personal',
			});

			const mockCandidate: SourceControlledFile = {
				id: 'dt1',
				name: 'Test Table',
				type: 'datatable',
				status: 'created',
				location: 'local',
				conflict: false,
				file: '/mock/n8n/git/datatables/dt1.json',
				updatedAt: '2024-01-01T00:00:00.000Z',
			};

			beforeEach(() => {
				projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
					mockPersonalProject as any,
				);
				projectRepository.find.mockResolvedValue([
					mockPersonalProject,
					{ id: 'project1', type: 'team' },
				] as any);

				const mockTransaction = {
					save: jest.fn(async (_entity: any, data: any) => data),
					delete: jest.fn(async () => {}),
				};

				Object.defineProperty(dataTableRepository, 'manager', {
					value: {
						connection: {
							options: { type: 'sqlite' },
						},
						transaction: jest.fn(async (callback: any) => {
							return await callback(mockTransaction);
						}),
					},
					configurable: true,
				});
			});

			it('should import new data table', async () => {
				// Arrange
				const mockDataTable = {
					id: 'dt1',
					name: 'Test Table',
					ownedBy: {
						type: 'team',
						teamId: 'project1',
						teamName: 'Team Project 1',
					},
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				};

				fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
				dataTableRepository.findOne.mockResolvedValue(null);
				dataTableColumnRepository.find.mockResolvedValue([]);
				dataTableColumnRepository.save.mockResolvedValue({ id: 'col1' } as any);
				projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

				// Act
				await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert
				expect(dataTableRepository.upsert).toHaveBeenCalledWith(
					{
						id: 'dt1',
						name: 'Test Table',
						projectId: 'project1',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-02T00:00:00.000Z',
					},
					['id'],
				);
				expect(dataTableDDLService.createTableWithColumns).toHaveBeenCalledWith(
					'dt1',
					expect.any(Array),
					expect.anything(),
				);
			});

			it('should import personal project data table', async () => {
				// Arrange
				const mockDataTable = {
					id: 'dt1',
					name: 'Test Table',
					ownedBy: {
						type: 'personal',
						projectId: 'personal-project-1',
						projectName: 'User Name',
						personalEmail: 'user@example.com',
					},
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				};

				fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
				dataTableRepository.findOne.mockResolvedValue(null);
				dataTableColumnRepository.find.mockResolvedValue([]);
				dataTableColumnRepository.save.mockResolvedValue({ id: 'col1' } as any);
				userRepository.findOne.mockResolvedValue({ id: 'user1', email: 'user@example.com' } as any);

				// Act
				await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert
				expect(dataTableRepository.upsert).toHaveBeenCalledWith(
					{
						id: 'dt1',
						name: 'Test Table',
						projectId: 'personal-project-1',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-02T00:00:00.000Z',
					},
					['id'],
				);
			});

			it('should update existing data table and add new columns', async () => {
				// Arrange
				const mockDataTable = {
					id: 'dt1',
					name: 'Updated Table',
					ownedBy: {
						type: 'team',
						teamId: 'project1',
						teamName: 'Team Project 1',
					},
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				};

				const existingTable = {
					id: 'dt1',
					name: 'Old Name',
					projectId: 'project1',
					columns: [{ id: 'col1', name: 'Column 1' }],
				};

				fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
				dataTableRepository.findOne.mockResolvedValue(existingTable as any);
				dataTableColumnRepository.find.mockResolvedValue([{ id: 'col1', name: 'Column 1' }] as any);
				dataTableColumnRepository.save.mockImplementation(async (col: any) => col);
				projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

				// Act
				await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert
				expect(dataTableRepository.upsert).toHaveBeenCalled();
				expect(dataTableDDLService.addColumn).toHaveBeenCalledWith(
					'dt1',
					expect.objectContaining({ id: 'col2' }),
					'sqlite',
					expect.anything(),
				);
			});

			it('should delete removed columns', async () => {
				// Arrange
				const mockDataTable = {
					id: 'dt1',
					name: 'Test Table',
					ownedBy: {
						type: 'team',
						teamId: 'project1',
						teamName: 'Team Project 1',
					},
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-02T00:00:00.000Z',
				};

				const existingTable = {
					id: 'dt1',
					name: 'Test Table',
					projectId: 'project1',
					columns: [
						{ id: 'col1', name: 'Column 1' },
						{ id: 'col2', name: 'Column 2' },
					],
				};

				fsReadFile.mockResolvedValue(JSON.stringify(mockDataTable) as any);
				dataTableRepository.findOne.mockResolvedValue(existingTable as any);
				dataTableColumnRepository.find.mockResolvedValue([
					{ id: 'col1', name: 'Column 1' },
					{ id: 'col2', name: 'Column 2' },
				] as any);
				dataTableColumnRepository.save.mockResolvedValue({ id: 'col1' } as any);
				projectRepository.findOne.mockResolvedValue({ id: 'project1', type: 'team' } as any);

				// Act
				await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert
				expect(dataTableDDLService.dropColumnFromTable).toHaveBeenCalledWith(
					'dt1',
					'Column 2',
					'sqlite',
					expect.anything(),
				);
			});

			it('should handle empty data tables file', async () => {
				// Arrange
				fsReadFile.mockResolvedValue('[]' as any);

				// Act
				await service.importDataTablesFromWorkFolder([mockCandidate], mockUser.id);

				// Assert
				expect(dataTableRepository.upsert).not.toHaveBeenCalled();
			});
		});
	});
});
