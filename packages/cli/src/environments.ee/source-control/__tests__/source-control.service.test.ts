import type { SourceControlledFile } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import type { TagEntity } from '@/databases/entities/tag-entity';
import type { User } from '@/databases/entities/user';
import type { Variables } from '@/databases/entities/variables';
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
	const sourceControlService = new SourceControlService(
		mock(),
		mock(),
		preferencesService,
		mock(),
		sourceControlImportService,
		tagRepository,
		mock(),
	);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(sourceControlService, 'sanityCheck').mockResolvedValue(undefined);
	});

	describe('pushWorkfolder', () => {
		it('should throw an error if a file is given that is not in the workfolder', async () => {
			await expect(
				sourceControlService.pushWorkfolder({
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
			await expect(
				sourceControlService.pushWorkfolder({
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

			// ACT
			const pullResult = await sourceControlService.getStatus({
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			});

			const pushResult = await sourceControlService.getStatus({
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT
			console.log(pullResult);
			console.log(pushResult);

			if (!Array.isArray(pullResult)) {
				fail('Expected pullResult to be an array.');
			}
			if (!Array.isArray(pushResult)) {
				fail('Expected pushResult to be an array.');
			}

			expect(pullResult).toHaveLength(4);
			expect(pushResult).toHaveLength(4);

			expect(pullResult.find((i) => i.type === 'workflow')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'workflow')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'credential')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'credential')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'variables')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'variables')).toHaveProperty('conflict', false);

			expect(pullResult.find((i) => i.type === 'tags')).toHaveProperty('conflict', true);
			expect(pushResult.find((i) => i.type === 'tags')).toHaveProperty('conflict', false);
		});
	});
});
