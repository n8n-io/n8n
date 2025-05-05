import type { SourceControlledFile } from '@n8n/api-types';
import type { Variables } from '@n8n/db';
import type { FolderWithWorkflowAndSubFolderCount } from '@n8n/db';
import type { TagEntity } from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import type { FolderRepository } from '@/databases/repositories/folder.repository';
import type { TagRepository } from '@/databases/repositories/tag.repository';
import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';

import type { SourceControlImportService } from '../source-control-import.service.ee';
import type { ExportableCredential } from '../types/exportable-credential';
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
		it('conflict depends on the value of `direction`', async () => {
			// ARRANGE
			const user = mock<User>();

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
				mock<ExportableCredential & { filename: string }>(),
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
	});
});
