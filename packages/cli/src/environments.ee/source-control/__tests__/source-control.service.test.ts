import type { SourceControlledFile } from '@n8n/api-types';
import type { Variables } from '@n8n/db';
import type { FolderWithWorkflowAndSubFolderCount } from '@n8n/db';
import type { TagEntity } from '@n8n/db';
import type { User } from '@n8n/db';
import type { FolderRepository } from '@n8n/db';
import type { TagRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { SourceControlImportService } from '../source-control-import.service.ee';
import type { StatusExportableCredential } from '../types/exportable-credential';
import type { SourceControlWorkflowVersionId } from '../types/source-control-workflow-version-id';

describe('SourceControlService', () => {
	const preferencesService = new SourceControlPreferencesService(
		Container.get(InstanceSettings),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	const sourceControlImportService = mock<SourceControlImportService>();
	const tagRepository = mock<TagRepository>();
	const folderRepository = mock<FolderRepository>();
	const sourceControlService = new SourceControlService(
		mock(),
		mock(),
		preferencesService,
		mock(),
		sourceControlImportService,
		tagRepository,
		folderRepository,
		mock(),
	);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(sourceControlService, 'sanityCheck').mockResolvedValue(undefined);
	});

	describe('pushWorkfolder', () => {
		it('should throw an error if a file is given that is not in the workfolder', async () => {
			const user = mock<User>();
			await expect(
				sourceControlService.pushWorkfolder(user, {
					fileNames: [
						{
							file: '/etc/passwd',
							id: 'test',
							name: 'secret-file',
							type: 'file',
							status: 'modified',
							location: 'local',
							conflict: false,
							updatedAt: new Date().toISOString(),
							pushed: false,
						},
					],
				}),
			).rejects.toThrow('File path /etc/passwd is invalid');
		});
	});

	describe('pullWorkfolder', () => {
		it('does not filter locally created credentials', async () => {
			// ARRANGE
			const user = mock<User>();
			const statuses = [
				mock<SourceControlledFile>({
					status: 'created',
					location: 'local',
					type: 'credential',
				}),
				mock<SourceControlledFile>({
					status: 'created',
					location: 'local',
					type: 'workflow',
				}),
			];
			jest.spyOn(sourceControlService, 'getStatus').mockResolvedValueOnce(statuses);

			// ACT
			const result = await sourceControlService.pullWorkfolder(user, {});

			// ASSERT
			expect(result).toMatchObject({ statusCode: 409, statusResult: statuses });
		});

		it('does not filter remotely deleted credentials', async () => {
			// ARRANGE
			const user = mock<User>();
			const statuses = [
				mock<SourceControlledFile>({
					status: 'deleted',
					location: 'remote',
					type: 'credential',
				}),
				mock<SourceControlledFile>({
					status: 'created',
					location: 'local',
					type: 'workflow',
				}),
			];
			jest.spyOn(sourceControlService, 'getStatus').mockResolvedValueOnce(statuses);

			// ACT
			const result = await sourceControlService.pullWorkfolder(user, {});

			// ASSERT
			expect(result).toMatchObject({ statusCode: 409, statusResult: statuses });
		});

		it('should throw an error if a file is given that is not in the workfolder', async () => {
			const user = mock<User>();
			await expect(
				sourceControlService.pushWorkfolder(user, {
					fileNames: [
						{
							file: '/etc/passwd',
							id: 'test',
							name: 'secret-file',
							type: 'file',
							status: 'modified',
							location: 'local',
							conflict: false,
							updatedAt: new Date().toISOString(),
							pushed: false,
						},
					],
				}),
			).rejects.toThrow('File path /etc/passwd is invalid');
		});
	});

	describe('getStatus', () => {
		it('ensure updatedAt field for last deleted tag', async () => {
			// ARRANGE
			const user = mock<User>();
			user.role = 'global:admin';

			sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
			sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([]);

			tagRepository.find.mockResolvedValue([]);

			// Define a tag that does only exist remotely.
			// Pushing this means it was deleted.
			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [
					{
						id: 'tag-id',
						name: 'some name',
					} as TagEntity,
				],
				mappings: [],
			});
			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [],
				mappings: [],
			});

			folderRepository.find.mockResolvedValue([]);
			sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
				folders: [],
			});
			sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
				folders: [],
			});

			// ACT
			const pushResult = await sourceControlService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT

			if (!Array.isArray(pushResult)) {
				fail('Expected pushResult to be an array.');
			}

			expect(pushResult).toHaveLength(1);
			expect(pushResult.find((i) => i.type === 'tags')?.updatedAt).toBeDefined();
		});

		it('ensure updatedAt field for last deleted folder', async () => {
			// ARRANGE
			const user = mock<User>();
			user.role = 'global:admin';

			sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
			sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([]);

			tagRepository.find.mockResolvedValue([]);
			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [],
				mappings: [],
			});
			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [],
				mappings: [],
			});

			// Define a folder that does only exist remotely.
			// Pushing this means it was deleted.
			folderRepository.find.mockResolvedValue([]);
			sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
				folders: [
					{
						id: 'test-folder',
						name: 'test folder name',
						homeProjectId: 'some-id',
						parentFolderId: null,
						createdAt: '',
						updatedAt: '',
					},
				],
			});
			sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
				folders: [],
			});

			// ACT
			const pushResult = await sourceControlService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT

			if (!Array.isArray(pushResult)) {
				fail('Expected pushResult to be an array.');
			}

			expect(pushResult).toHaveLength(1);
			expect(pushResult.find((i) => i.type === 'folders')?.updatedAt).toBeDefined();
		});

		it('conflict depends on the value of `direction`', async () => {
			// ARRANGE
			const user = mock<User>();
			user.role = 'global:admin';

			// Define a credential that does only exist locally.
			// Pulling this would delete it so it should be marked as a conflict.
			// Pushing this is conflict free.
			sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([
				mock<SourceControlWorkflowVersionId>(),
			]);

			// Define a credential that does only exist locally.
			// Pulling this would delete it so it should be marked as a conflict.
			// Pushing this is conflict free.
			sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([
				mock<StatusExportableCredential>(),
			]);

			// Define a variable that does only exist locally.
			// Pulling this would delete it so it should be marked as a conflict.
			// Pushing this is conflict free.
			sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
			sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([mock<Variables>()]);

			// Define a tag that does only exist locally.
			// Pulling this would delete it so it should be marked as a conflict.
			// Pushing this is conflict free.
			const tag = mock<TagEntity>({ updatedAt: new Date() });
			tagRepository.find.mockResolvedValue([tag]);
			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [],
				mappings: [],
			});
			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [tag],
				mappings: [],
			});

			// Define a folder that does only exist locally.
			// Pulling this would delete it so it should be marked as a conflict.
			// Pushing this is conflict free.
			const folder = mock<FolderWithWorkflowAndSubFolderCount>({
				updatedAt: new Date(),
				createdAt: new Date(),
			});
			folderRepository.find.mockResolvedValue([folder]);
			sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
				folders: [],
			});
			sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
				folders: [
					{
						id: folder.id,
						name: folder.name,
						parentFolderId: folder.parentFolder?.id ?? '',
						homeProjectId: folder.homeProject.id,
						createdAt: folder.createdAt.toISOString(),
						updatedAt: folder.updatedAt.toISOString(),
					},
				],
			});

			// ACT
			const pullResult = await sourceControlService.getStatus(user, {
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			});

			const pushResult = await sourceControlService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT

			if (!Array.isArray(pullResult)) {
				fail('Expected pullResult to be an array.');
			}
			if (!Array.isArray(pushResult)) {
				fail('Expected pushResult to be an array.');
			}

			expect(pullResult).toHaveLength(5);
			expect(pushResult).toHaveLength(5);

			expect(pullResult.find((i) => i.type === 'workflow')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'workflow')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'credential')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'credential')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'variables')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'variables')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'tags')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'tags')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'folders')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'folders')).toHaveProperty('conflict', false);
		});

		it('should throw `ForbiddenError` if direction is pull and user is not allowed to globally pull', async () => {
			// ARRANGE
			const user = mock<User>();
			user.role = 'global:member';

			// ACT
			await expect(
				sourceControlService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				}),
			).rejects.toThrowError(ForbiddenError);
		});
	});
});
