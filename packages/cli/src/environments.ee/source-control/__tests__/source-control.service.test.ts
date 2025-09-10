import type { SourceControlledFile } from '@n8n/api-types';
import { isContainedWithin } from '@n8n/backend-common';
import {
	type FolderRepository,
	type FolderWithWorkflowAndSubFolderCount,
	type TagEntity,
	type TagRepository,
	type User,
	type Variables,
	type WorkflowEntity,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { PushResult } from 'simple-git';

import type { SourceControlExportService } from '../source-control-export.service.ee';
import type { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlImportService } from '../source-control-import.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import type { StatusExportableCredential } from '../types/exportable-credential';
import type { SourceControlWorkflowVersionId } from '../types/source-control-workflow-version-id';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';

jest.mock('@n8n/backend-common', () => ({
	...jest.requireActual('@n8n/backend-common'),
	isContainedWithin: jest.fn(() => true),
}));

describe('SourceControlService', () => {
	const preferencesService = new SourceControlPreferencesService(
		Container.get(InstanceSettings),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	const sourceControlImportService = mock<SourceControlImportService>();
	const sourceControlExportService = mock<SourceControlExportService>();
	const sourceControlScopedService = mock<SourceControlScopedService>();
	const tagRepository = mock<TagRepository>();
	const folderRepository = mock<FolderRepository>();
	const gitService = mock<SourceControlGitService>();
	const eventService = mock<EventService>();
	const sourceControlService = new SourceControlService(
		mock(),
		gitService,
		preferencesService,
		sourceControlExportService,
		sourceControlImportService,
		sourceControlScopedService,
		tagRepository,
		folderRepository,
		eventService,
	);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(sourceControlService, 'sanityCheck').mockResolvedValue(undefined);
	});

	describe('pushWorkfolder', () => {
		it('should throw an error if file path validation fails', async () => {
			const user = mock<User>();
			(isContainedWithin as jest.Mock).mockReturnValueOnce(false);

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

		it('should include the tags file even if not explicitly specified', async () => {
			// ARRANGE
			const user = mock<User>();
			const mockPushResult = mock<PushResult>();
			const mockFile: SourceControlledFile = {
				file: 'some-workflow.json',
				id: 'test',
				name: 'some-workflow',
				type: 'workflow',
				status: 'modified',
				location: 'local',
				conflict: false,
				updatedAt: new Date().toISOString(),
			};

			jest.spyOn(sourceControlService, 'getStatus').mockResolvedValueOnce([mockFile]);
			sourceControlExportService.exportCredentialsToWorkFolder.mockResolvedValueOnce({
				count: 0,
				missingIds: [],
				folder: '',
				files: [],
			});
			eventService.emit.mockReturnValueOnce(true);
			gitService.push.mockResolvedValueOnce(mockPushResult);
			(isContainedWithin as jest.Mock).mockReturnValueOnce(true);

			const expectedTagsPath = `${preferencesService.gitFolder}/tags.json`;
			const expectedFilePath = `${preferencesService.gitFolder}/some-workflow.json`;

			// ACT
			const result = await sourceControlService.pushWorkfolder(user, {
				fileNames: [mockFile],
				commitMessage: 'A commit message',
			});

			// ASSERT
			expect(gitService.stage).toHaveBeenCalledWith(
				new Set([expectedFilePath, expectedTagsPath]),
				new Set(),
			);
			expect(gitService.commit).toHaveBeenCalledWith('A commit message');
			expect(gitService.push).toHaveBeenCalledWith({
				branch: 'main', // default branch
				force: false,
			});
			expect(result).toHaveProperty('statusCode', 200);
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
			const user = mock<User>({
				role: GLOBAL_MEMBER_ROLE,
			});

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

	describe('getFileContent', () => {
		it.each([{ type: 'workflow' as SourceControlledFile['type'], id: '1234', content: '{}' }])(
			'should return file content for $type',
			async ({ type, id, content }) => {
				jest.spyOn(gitService, 'getFileContent').mockResolvedValue(content);
				const user = mock<User>({ id: 'user-id', role: GLOBAL_ADMIN_ROLE });

				const result = await sourceControlService.getRemoteFileEntity({ user, type, id });

				expect(result).toEqual(JSON.parse(content));
			},
		);

		it.each<SourceControlledFile['type']>(['folders', 'credential', 'tags', 'variables'])(
			'should throw an error if the file type is not handled',
			async (type) => {
				const user = mock<User>({ id: 'user-id', role: GLOBAL_ADMIN_ROLE });
				await expect(
					sourceControlService.getRemoteFileEntity({ user, type, id: 'unknown' }),
				).rejects.toThrow(`Unsupported file type: ${type}`);
			},
		);

		it('should fail if the git service fails to get the file content', async () => {
			jest.spyOn(gitService, 'getFileContent').mockRejectedValue(new Error('Git service error'));
			const user = mock<User>({ id: 'user-id', role: GLOBAL_ADMIN_ROLE });

			await expect(
				sourceControlService.getRemoteFileEntity({ user, type: 'workflow', id: '1234' }),
			).rejects.toThrow('Git service error');
		});

		it('should throw an error if the user does not have access to the project', async () => {
			const user = mock<User>({
				id: 'user-id',
				role: GLOBAL_MEMBER_ROLE,
			});
			jest
				.spyOn(sourceControlScopedService, 'getWorkflowsInAdminProjectsFromContext')
				.mockResolvedValue([]);

			await expect(
				sourceControlService.getRemoteFileEntity({ user, type: 'workflow', id: '1234' }),
			).rejects.toThrow('You are not allowed to access workflow with id 1234');
		});

		it('should return content for an authorized workflow', async () => {
			const user = mock<User>({ id: 'user-id', role: GLOBAL_MEMBER_ROLE });
			jest
				.spyOn(sourceControlScopedService, 'getWorkflowsInAdminProjectsFromContext')
				.mockResolvedValue([{ id: '1234' } as WorkflowEntity]);
			jest.spyOn(gitService, 'getFileContent').mockResolvedValue('{}');
			const result = await sourceControlService.getRemoteFileEntity({
				user,
				type: 'workflow',
				id: '1234',
			});
			expect(result).toEqual({});
		});
	});
});
