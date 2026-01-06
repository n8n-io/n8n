import type { SourceControlledFile } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	type Variables,
	type VariablesRepository,
	type FolderRepository,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	Project,
	type ProjectRelation,
	type ProjectRelationRepository,
	type ProjectRepository,
	type SharedWorkflowRepository,
	User,
	WorkflowEntity,
	type WorkflowRepository,
} from '@n8n/db';
import { In } from '@n8n/typeorm';
import * as fastGlob from 'fast-glob';
import { mock } from 'jest-mock-extended';
import { type InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

import type { VariablesService } from '@/environments.ee/variables/variables.service.ee';

import { SourceControlImportService } from '../source-control-import.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import type { ExportableFolder } from '../types/exportable-folders';
import type { ExportableProject } from '../types/exportable-project';
import { SourceControlContext } from '../types/source-control-context';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';

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
	const mockLogger = mock<Logger>();
	const sourceControlScopedService = mock<SourceControlScopedService>();
	const variableService = mock<VariablesService>();
	const variablesRepository = mock<VariablesRepository>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const service = new SourceControlImportService(
		mockLogger,
		mock(),
		variableService,
		activeWorkflowManager,
		mock(),
		projectRepository,
		projectRelationRepository,
		mock(),
		sharedWorkflowRepository,
		mock(),
		mock(),
		variablesRepository,
		workflowRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		folderRepository,
		mock<InstanceSettings>({ n8nFolder: '/mock/n8n' }),
		sourceControlScopedService,
		mock(),
		mock(),
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

		it('should set new workflows as inactive with null activeVersionId', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'New Workflow',
				nodes: [],
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

			await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			expect(workflowRepository.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'workflow1',
					active: false,
					activeVersionId: null,
				}),
				['id'],
			);
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		it('should keep existing inactive workflows inactive', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Existing Workflow',
				nodes: [],
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
			expect(activeWorkflowManager.remove).not.toHaveBeenCalled();
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		it('should reactivate existing active workflows', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Active Workflow',
				nodes: [],
				parentFolderId: null,
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					name: 'Active Workflow',
					active: true,
					activeVersionId: 'version-123',
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
					activeVersionId: 'version-123',
				}),
				['id'],
			);
			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('workflow1');
			expect(activeWorkflowManager.add).toHaveBeenCalledWith('workflow1', 'activate');
		});

		it('should call publishVersion with the new version when reactivating workflows', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const newVersionId = 'new-version-456';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Active Workflow',
				nodes: [],
				parentFolderId: null,
				versionId: newVersionId,
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					name: 'Active Workflow',
					active: true,
					activeVersionId: 'old-version-123',
				}),
			]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow1' }],
				generatedMaps: [],
				raw: [],
			});
			workflowRepository.publishVersion.mockResolvedValue({
				generatedMaps: [],
				raw: [],
				affected: 1,
			});
			workflowRepository.update.mockResolvedValue({
				generatedMaps: [],
				raw: [],
				affected: 1,
			});

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

			await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			// Verify publishVersion is called with the new version
			expect(workflowRepository.publishVersion).toHaveBeenCalledWith('workflow1', newVersionId);
			// Verify the workflow is deactivated before reactivation
			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('workflow1');
			// Verify the workflow is reactivated
			expect(activeWorkflowManager.add).toHaveBeenCalledWith('workflow1', 'activate');
			// Verify the versionId is updated
			expect(workflowRepository.update).toHaveBeenCalledWith(
				{ id: 'workflow1' },
				{ versionId: newVersionId },
			);
		});

		it('should deactivate archived workflows even if they were previously active', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Archived Workflow',
				nodes: [],
				parentFolderId: null,
				isArchived: true,
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
			expect(activeWorkflowManager.remove).toHaveBeenCalledWith('workflow1');
			expect(activeWorkflowManager.add).not.toHaveBeenCalled();
		});

		it('should handle activation errors gracefully', async () => {
			const mockUserId = 'user-id-123';
			const mockWorkflowFile = '/mock/workflow1.json';
			const mockWorkflowData = {
				id: 'workflow1',
				name: 'Workflow with activation error',
				nodes: [],
				parentFolderId: null,
			};
			const candidates = [mock<SourceControlledFile>({ file: mockWorkflowFile, id: 'workflow1' })];

			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue(
				Object.assign(new Project(), { id: 'project1', type: 'personal' }),
			);
			workflowRepository.findByIds.mockResolvedValue([
				Object.assign(new WorkflowEntity(), {
					id: 'workflow1',
					name: 'Workflow with activation error',
					active: true,
					activeVersionId: 'version-123',
				}),
			]);
			folderRepository.find.mockResolvedValue([]);
			sharedWorkflowRepository.findWithFields.mockResolvedValue([]);
			workflowRepository.upsert.mockResolvedValue({
				identifiers: [{ id: 'workflow1' }],
				generatedMaps: [],
				raw: [],
			});
			workflowRepository.update.mockResolvedValue({
				generatedMaps: [],
				raw: [],
				affected: 1,
			});
			activeWorkflowManager.add.mockRejectedValue(new Error('Activation failed'));

			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));

			const result = await service.importWorkflowFromWorkFolder(candidates, mockUserId);

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to activate workflow workflow1',
				expect.any(Object),
			);
			expect(workflowRepository.update).toHaveBeenCalled();
			expect(result).toEqual([{ id: 'workflow1', name: mockWorkflowFile }]);
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
});
