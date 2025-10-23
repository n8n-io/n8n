import type { SourceControlledFile } from '@n8n/api-types';
import { isContainedWithin } from '@n8n/backend-common';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, User, type WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { PushResult } from 'simple-git';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';
import type { SourceControlExportService } from '../source-control-export.service.ee';
import type { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlImportService } from '../source-control-import.service.ee';
import type { SourceControlScopedService } from '../source-control-scoped.service';
import type { ExportResult } from '../types/export-result';

// Mock the status service to avoid complex dependency issues
const mockStatusService = {
	getStatus: jest.fn(),
};

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
	const gitService = mock<SourceControlGitService>();
	const eventService = mock<EventService>();
	const sourceControlService = new SourceControlService(
		mock(), // logger
		gitService,
		preferencesService,
		sourceControlExportService,
		sourceControlImportService,
		sourceControlScopedService,
		eventService, // event service
		mockStatusService as any, // status service
	);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(sourceControlService, 'sanityCheck').mockResolvedValue(undefined);
		// Reset mock implementations
		mockStatusService.getStatus.mockReset();
	});

	describe('pushWorkfolder', () => {
		it('should push the workfolder', async () => {
			const mockExportResult = mock<ExportResult>();
			// Arrange
			const user = Object.assign(new User(), {
				role: GLOBAL_ADMIN_ROLE,
			});

			const mockPushResult = mock<PushResult>();
			const now = new Date().toISOString();

			// Prepare a set of files of all types, some deleted, some not
			const files: SourceControlledFile[] = [
				{
					file: 'workflow-1.json',
					id: 'wf-1',
					name: 'Workflow 1',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'credential-1.json',
					id: 'cred-1',
					name: 'Credential 1',
					type: 'credential',
					status: 'created',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'project-1.json',
					id: 'proj-1',
					name: 'Project 1',
					type: 'project',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'folders.json',
					id: 'folders',
					name: 'Folders',
					type: 'folders',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'variables.json',
					id: 'variables',
					name: 'Variables',
					type: 'variables',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'tags.json',
					id: 'tags',
					name: 'Tags',
					type: 'tags',
					status: 'modified',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				// Deleted resources
				{
					file: 'workflow-2.json',
					id: 'wf-2',
					name: 'Workflow 2',
					type: 'workflow',
					status: 'deleted',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'credential-2.json',
					id: 'cred-2',
					name: 'Credential 2',
					type: 'credential',
					status: 'deleted',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
				{
					file: 'project-2.json',
					id: 'proj-2',
					name: 'Project 2',
					type: 'project',
					status: 'deleted',
					location: 'local',
					conflict: false,
					updatedAt: now,
				},
			];

			// The status service should return all these files as allowed
			mockStatusService.getStatus.mockResolvedValueOnce(files);

			// Mock all export and delete methods
			sourceControlExportService.exportWorkflowsToWorkFolder.mockResolvedValueOnce(
				mockExportResult,
			);
			sourceControlExportService.exportCredentialsToWorkFolder.mockResolvedValueOnce({
				count: 1,
				missingIds: [],
				folder: '',
				files: [],
			});
			sourceControlExportService.exportTeamProjectsToWorkFolder.mockResolvedValueOnce(
				mockExportResult,
			);
			sourceControlExportService.exportTagsToWorkFolder.mockResolvedValueOnce(mockExportResult);
			sourceControlExportService.exportFoldersToWorkFolder.mockResolvedValueOnce(mockExportResult);
			sourceControlExportService.exportVariablesToWorkFolder.mockResolvedValueOnce(
				mockExportResult,
			);
			sourceControlExportService.exportFoldersToWorkFolder.mockResolvedValueOnce(mockExportResult);
			sourceControlExportService.exportVariablesToWorkFolder.mockResolvedValueOnce(
				mockExportResult,
			);

			(isContainedWithin as jest.Mock).mockReturnValue(true);

			gitService.push.mockResolvedValueOnce(mockPushResult);

			const commitMessage = 'Test commit message';

			// Act
			const result = await sourceControlService.pushWorkfolder(user, {
				fileNames: files.map((f) => ({
					file: f.file,
					id: f.id,
					name: f.name,
					type: f.type,
					status: f.status,
					location: f.location,
					conflict: f.conflict,
					updatedAt: f.updatedAt,
				})),
				commitMessage,
			});

			// Assert
			// All export methods for non-deleted resources should be called
			expect(sourceControlExportService.exportWorkflowsToWorkFolder).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'wf-1' })]),
			);
			expect(sourceControlExportService.exportCredentialsToWorkFolder).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'cred-1' })]),
			);
			expect(sourceControlExportService.exportTeamProjectsToWorkFolder).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ id: 'proj-1' })]),
			);
			expect(sourceControlExportService.exportTagsToWorkFolder).toHaveBeenCalled();
			expect(sourceControlExportService.exportFoldersToWorkFolder).toHaveBeenCalled();
			expect(sourceControlExportService.exportVariablesToWorkFolder).toHaveBeenCalled();

			// Deleted resources should be passed to rmFilesFromExportFolder
			expect(sourceControlExportService.rmFilesFromExportFolder).toHaveBeenCalledWith(
				new Set([
					`${preferencesService.gitFolder}/workflow-2.json`,
					`${preferencesService.gitFolder}/credential-2.json`,
					`${preferencesService.gitFolder}/project-2.json`,
				]),
			);

			// Git operations should be called
			expect(gitService.stage).toHaveBeenCalledWith(
				new Set([
					`${preferencesService.gitFolder}/workflow-1.json`,
					`${preferencesService.gitFolder}/credential-1.json`,
					`${preferencesService.gitFolder}/project-1.json`,
					`${preferencesService.gitFolder}/folders.json`,
					`${preferencesService.gitFolder}/variables.json`,
					`${preferencesService.gitFolder}/tags.json`,
				]),
				new Set([
					`${preferencesService.gitFolder}/workflow-2.json`,
					`${preferencesService.gitFolder}/credential-2.json`,
					`${preferencesService.gitFolder}/project-2.json`,
				]),
			);
			expect(gitService.commit).toHaveBeenCalledWith(commitMessage);
			expect(gitService.push).toHaveBeenCalledWith({
				branch: 'main', // default branch
				force: false,
			});

			// The result should include the status and push result
			expect(result).toMatchObject({
				statusCode: 200,
			});
		});

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

			expect(gitService.stage).not.toHaveBeenCalled();
			expect(gitService.commit).not.toHaveBeenCalled();
			expect(gitService.push).not.toHaveBeenCalled();
		});

		it('should include the tags file even if not explicitly specified', async () => {
			// ARRANGE
			const user = mock<User>();
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

			mockStatusService.getStatus.mockResolvedValueOnce([mockFile]);
			sourceControlExportService.exportCredentialsToWorkFolder.mockResolvedValueOnce({
				count: 0,
				missingIds: [],
				folder: '',
				files: [],
			});
			eventService.emit.mockReturnValueOnce(true);

			const mockPushResult = mock<PushResult>();
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
			mockStatusService.getStatus.mockResolvedValueOnce(statuses);

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
			mockStatusService.getStatus.mockResolvedValueOnce(statuses);

			// ACT
			const result = await sourceControlService.pullWorkfolder(user, {});

			// ASSERT
			expect(result).toMatchObject({ statusCode: 409, statusResult: statuses });
		});
	});

	describe('getStatus', () => {
		it('ensure updatedAt field for last deleted tag', async () => {
			// ARRANGE
			const user = mock<User>({
				role: GLOBAL_ADMIN_ROLE,
			});

			const mockResult = [
				{
					type: 'tags',
					updatedAt: new Date().toISOString(),
					status: 'deleted',
					location: 'remote',
					conflict: false,
					pushed: false,
					file: 'tags.json',
					id: 'test-tag',
					name: 'test tag name',
				},
			];

			mockStatusService.getStatus.mockResolvedValue(mockResult);

			// ACT
			const pushResult = await sourceControlService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT
			expect(mockStatusService.getStatus).toHaveBeenCalledWith(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

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

			const mockResult = [
				{
					type: 'folders',
					updatedAt: new Date().toISOString(),
					status: 'deleted',
					location: 'remote',
					conflict: false,
					pushed: false,
					file: 'folders.json',
					id: 'test-folder',
					name: 'test folder name',
				},
			];

			mockStatusService.getStatus.mockResolvedValue(mockResult);

			// ACT
			const pushResult = await sourceControlService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT
			expect(mockStatusService.getStatus).toHaveBeenCalledWith(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

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

			const mockPullResult = [
				{ type: 'workflow', conflict: true },
				{ type: 'credential', conflict: true },
				{ type: 'variables', conflict: true },
				{ type: 'tags', conflict: true },
				{ type: 'folders', conflict: true },
			];

			const mockPushResult = [
				{ type: 'workflow', conflict: false },
				{ type: 'credential', conflict: false },
				{ type: 'variables', conflict: false },
				{ type: 'tags', conflict: false },
				{ type: 'folders', conflict: false },
			];

			mockStatusService.getStatus
				.mockResolvedValueOnce(mockPullResult)
				.mockResolvedValueOnce(mockPushResult);

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
			expect(mockStatusService.getStatus).toHaveBeenCalledTimes(2);
			expect(mockStatusService.getStatus).toHaveBeenCalledWith(user, {
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			});
			expect(mockStatusService.getStatus).toHaveBeenCalledWith(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

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

			mockStatusService.getStatus.mockRejectedValue(
				new ForbiddenError('You do not have permission to pull from source control'),
			);

			// ACT
			await expect(
				sourceControlService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				}),
			).rejects.toThrowError(ForbiddenError);

			// ASSERT
			expect(mockStatusService.getStatus).toHaveBeenCalledWith(user, {
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			});
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

	describe('disconnect', () => {
		beforeEach(() => {
			// Common mock setup
			preferencesService.setPreferences = jest.fn().mockResolvedValue(undefined);
			sourceControlExportService.deleteRepositoryFolder.mockResolvedValue(undefined);
			preferencesService.deleteHttpsCredentials = jest.fn().mockResolvedValue(undefined);
			preferencesService.deleteKeyPair = jest.fn().mockResolvedValue(undefined);
			gitService.resetService.mockReturnValue(undefined);
		});

		it('should reset the preferences', async () => {
			const mockPreferences = {
				connected: true,
				branchName: 'feature-branch',
				repositoryUrl: 'https://github.com/test/repo.git',
				connectionType: 'https' as const,
			};
			preferencesService.getPreferences = jest.fn().mockReturnValue(mockPreferences);

			const result = await sourceControlService.disconnect();

			expect(preferencesService.setPreferences).toHaveBeenCalledWith({
				connected: false,
				branchName: '',
				repositoryUrl: '',
				connectionType: 'https',
			});
			expect(result).toEqual(preferencesService.sourceControlPreferences);
		});

		it('should delete the repository folder', async () => {
			const mockPreferences = {
				connected: true,
				branchName: 'main',
				repositoryUrl: 'https://github.com/test/repo.git',
				connectionType: 'https' as const,
			};
			preferencesService.getPreferences = jest.fn().mockReturnValue(mockPreferences);

			await sourceControlService.disconnect();

			expect(sourceControlExportService.deleteRepositoryFolder).toHaveBeenCalledTimes(1);
		});

		it('should delete the HTTPS credentials when connection type is HTTPS', async () => {
			const mockPreferences = {
				connected: true,
				branchName: 'main',
				repositoryUrl: 'https://github.com/test/repo.git',
				connectionType: 'https' as const,
			};
			preferencesService.getPreferences = jest.fn().mockReturnValue(mockPreferences);

			await sourceControlService.disconnect();

			expect(preferencesService.deleteHttpsCredentials).toHaveBeenCalledTimes(1);
		});

		it('should delete the SSH key pair when connection type is SSH and keepKeyPair is false', async () => {
			const mockPreferences = {
				connected: true,
				branchName: 'main',
				repositoryUrl: 'git@github.com:test/repo.git',
				connectionType: 'ssh' as const,
			};
			preferencesService.getPreferences = jest.fn().mockReturnValue(mockPreferences);

			await sourceControlService.disconnect({ keepKeyPair: false });

			expect(preferencesService.deleteKeyPair).toHaveBeenCalledTimes(1);
		});

		it('should not delete the SSH key pair when connection type is SSH and keepKeyPair is true', async () => {
			const mockPreferences = {
				connected: true,
				branchName: 'main',
				repositoryUrl: 'git@github.com:test/repo.git',
				connectionType: 'ssh' as const,
			};
			preferencesService.getPreferences = jest.fn().mockReturnValue(mockPreferences);

			await sourceControlService.disconnect({ keepKeyPair: true });

			expect(preferencesService.deleteKeyPair).not.toHaveBeenCalled();
		});

		it('should set git client to null', async () => {
			const mockPreferences = {
				connected: true,
				branchName: 'main',
				repositoryUrl: 'https://github.com/test/repo.git',
				connectionType: 'https' as const,
			};
			preferencesService.getPreferences = jest.fn().mockReturnValue(mockPreferences);

			// ACT
			await sourceControlService.disconnect();

			// ASSERT
			expect(gitService.resetService).toHaveBeenCalledTimes(1);
		});
	});
});
