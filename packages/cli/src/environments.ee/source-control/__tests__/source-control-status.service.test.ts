import { mockLogger } from '@n8n/backend-test-utils';
import {
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	type FolderRepository,
	type FolderWithWorkflowAndSubFolderCount,
	type TagEntity,
	type TagRepository,
	type User,
	type Variables,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';

import type { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlImportService } from '../source-control-import.service.ee';
import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlStatusService } from '../source-control-status.service.ee';
import type { StatusExportableCredential } from '../types/exportable-credential';
import type { SourceControlWorkflowVersionId } from '../types/source-control-workflow-version-id';

describe('getStatus', () => {
	const sourceControlImportService = mock<SourceControlImportService>();
	const tagRepository = mock<TagRepository>();
	const folderRepository = mock<FolderRepository>();

	const preferencesService = new SourceControlPreferencesService(
		Container.get(InstanceSettings),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	const sourceControlStatusService = new SourceControlStatusService(
		mockLogger(),
		mock<SourceControlGitService>(),
		sourceControlImportService,
		preferencesService,
		tagRepository,
		folderRepository,
		mock<EventService>(),
	);

	it('ensure updatedAt field for last deleted tag', async () => {
		// ARRANGE
		const user = mock<User>({
			role: GLOBAL_ADMIN_ROLE,
		});

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
		const pushResult = await sourceControlStatusService.getStatus(user, {
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
		const user = mock<User>({
			role: GLOBAL_ADMIN_ROLE,
		});

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
		const pushResult = await sourceControlStatusService.getStatus(user, {
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
		const user = mock<User>({
			role: GLOBAL_ADMIN_ROLE,
		});

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
		const pullResult = await sourceControlStatusService.getStatus(user, {
			direction: 'pull',
			verbose: false,
			preferLocalVersion: false,
		});

		const pushResult = await sourceControlStatusService.getStatus(user, {
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
		const user = mock<User>({
			role: GLOBAL_MEMBER_ROLE,
		});

		// ACT
		await expect(
			sourceControlStatusService.getStatus(user, {
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			}),
		).rejects.toThrowError(ForbiddenError);
	});
});
