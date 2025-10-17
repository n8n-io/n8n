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
import type { ExportableProjectWithFileName } from '../types/exportable-project';
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

	beforeEach(() => {
		jest.clearAllMocks();

		// version ids (workflows)
		sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
		sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
		sourceControlImportService.getAllLocalVersionIdsFromDb.mockResolvedValue([]);
		sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);

		// credentials
		sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
		sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([]);

		// variables
		sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
		sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([]);

		// folders
		// Define a folder that does only exist remotely.
		// Pushing this means it was deleted.
		sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
			folders: [],
		});
		sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
			folders: [],
		});

		// tags
		sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
			tags: [],
			mappings: [],
		});
		sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
			tags: [],
			mappings: [],
		});

		// projects
		sourceControlImportService.getRemoteProjectsFromFiles.mockResolvedValue([]);
		sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([]);

		// repositories
		tagRepository.find.mockResolvedValue([]);
		folderRepository.find.mockResolvedValue([]);
	});

	it('ensure updatedAt field for last deleted tag', async () => {
		// ARRANGE
		const user = mock<User>({
			role: GLOBAL_ADMIN_ROLE,
		});

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

		// Define a folder that does only exist remotely.
		// Pushing this means it was deleted.
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

		// Define a project that does only exist locally.
		// Pulling this would delete it so it should be marked as a conflict.
		// Pushing this is conflict free.

		sourceControlImportService.getRemoteProjectsFromFiles.mockResolvedValue([]);
		sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
			mock<ExportableProjectWithFileName>(),
		]);

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

		expect(pullResult).toHaveLength(6);
		expect(pushResult).toHaveLength(6);

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

		expect(pullResult.find((i) => i.type === 'project')).toHaveProperty('conflict', true);
		expect(pushResult.find((i) => i.type === 'project')).toHaveProperty('conflict', false);
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

	describe('project status', () => {
		// Mock data for reusable test scenarios
		const mockProjects: Record<string, ExportableProjectWithFileName> = {
			basic: {
				id: 'project1',
				name: 'Test Project 1',
				description: 'Test Description 1',
				icon: { type: 'emoji', value: '🚀' },
				type: 'team',
				owner: {
					type: 'team',
					teamId: 'team1',
					teamName: 'Team 1',
				},
				filename: '/mock/n8n/git/projects/project1.json',
			},
			withoutIcon: {
				id: 'project2',
				name: 'Test Project 2',
				description: 'Test Description 2',
				icon: null,
				type: 'team',
				owner: {
					type: 'team',
					teamId: 'team2',
					teamName: 'Team 2',
				},
				filename: '/mock/n8n/git/projects/project2.json',
			},
		};

		const mockUsers = {
			globalAdmin: mock<User>({
				role: GLOBAL_ADMIN_ROLE,
			}),
			limitedUser: mock<User>({
				role: GLOBAL_MEMBER_ROLE,
			}),
		};

		const setupProjectMocks = ({
			remote,
			local,
			hiddenLocal = [],
		}: {
			remote: ExportableProjectWithFileName[];
			local: ExportableProjectWithFileName[];
			hiddenLocal?: ExportableProjectWithFileName[];
		}) => {
			sourceControlImportService.getRemoteProjectsFromFiles.mockResolvedValue(remote);
			sourceControlImportService.getLocalTeamProjectsFromDb.mockImplementation(async (context) => {
				if (context) {
					return local;
				}
				return [...local, ...hiddenLocal];
			});
		};

		it('should return empty arrays when no projects exist locally or remotely', async () => {
			// ARRANGE
			const user = mockUsers.globalAdmin;
			setupProjectMocks({
				remote: [],
				local: [],
			});

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			expect(result).toMatchObject({
				projectsRemote: [],
				projectsLocal: [],
				projectsMissingInLocal: [],
				projectsMissingInRemote: [],
				projectsModifiedInEither: [],
				sourceControlledFiles: [],
			});
		});

		it('should identify projects missing in local (remote only)', async () => {
			// ARRANGE
			const user = mockUsers.globalAdmin;
			const remoteProject = mockProjects.basic;

			// only remote project exists
			setupProjectMocks({
				remote: [remoteProject],
				local: [],
			});

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'pull',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) {
				fail('Expected result to be an object.');
			}

			expect(result).toMatchObject({
				projectsRemote: [remoteProject],
				projectsLocal: [],
				projectsMissingInLocal: [remoteProject],
				projectsMissingInRemote: [],
				projectsModifiedInEither: [],
				sourceControlledFiles: [
					expect.objectContaining({
						id: remoteProject.id,
					}),
				],
			});
		});

		it('should identify projects missing in remote (local only)', async () => {
			// ARRANGE
			const user = mockUsers.globalAdmin;
			const localProject = mockProjects.basic;

			// only local project exists
			setupProjectMocks({
				remote: [],
				local: [localProject],
			});

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) {
				fail('Expected result to be an object.');
			}

			expect(result).toMatchObject({
				projectsRemote: [],
				projectsLocal: [localProject],
				projectsMissingInRemote: [localProject],
				projectsMissingInLocal: [],
				projectsModifiedInEither: [],
				sourceControlledFiles: [
					expect.objectContaining({
						id: localProject.id,
					}),
				],
			});
		});

		it('should identify projects modified in either location', async () => {
			// ARRANGE
			const user = mockUsers.globalAdmin;
			const localProject = mockProjects.basic;
			const remoteProject: ExportableProjectWithFileName = {
				...mockProjects.basic,
				icon: { type: 'icon', value: 'icon-modified' },
			};

			// both projects exist but are different
			setupProjectMocks({
				remote: [remoteProject],
				local: [localProject],
			});

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) {
				fail('Expected result to be an object.');
			}

			expect(result).toMatchObject({
				projectsRemote: [remoteProject],
				projectsLocal: [localProject],
				projectsMissingInLocal: [],
				projectsMissingInRemote: [],
				projectsModifiedInEither: [remoteProject],
				sourceControlledFiles: [
					expect.objectContaining({
						id: remoteProject.id,
						conflict: true,
					}),
				],
			});
		});

		it('should prevent out of scope projects from being deleted for non-global users', async () => {
			// ARRANGE
			const user = mockUsers.limitedUser;
			const visibleProjects = [
				{
					...mockProjects.basic,
					id: 'project-1',
				},
				{
					...mockProjects.withoutIcon,
					id: 'project-2',
				},
			];

			const hiddenProjects = [
				{
					...mockProjects.basic,
					id: 'project-3',
				},
				{
					...mockProjects.basic,
					id: 'project-4',
				},
			];

			setupProjectMocks({
				remote: [...visibleProjects, ...hiddenProjects].map((project, index) => ({
					...project,
					name: `${project.name} changed ${index}`,
				})),
				local: visibleProjects,
				hiddenLocal: hiddenProjects,
			});

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT
			if (!Array.isArray(result)) {
				fail('Expected result to be an array.');
			}

			expect(result).toHaveLength(visibleProjects.length);
			expect(result).toEqual(
				expect.arrayContaining(
					visibleProjects.map((project) =>
						expect.objectContaining({ id: project.id, status: 'modified' }),
					),
				),
			);
		});

		describe('direction-based behavior', () => {
			const user = mockUsers.globalAdmin;
			const localProject1 = {
				...mockProjects.basic,
				id: 'project-1',
			};
			const localProject2 = {
				...mockProjects.basic,
				id: 'project-2',
				name: 'Project 2',
			};
			const localOnlyProject = {
				...mockProjects.basic,
				id: 'project-3',
				name: 'Project 3',
			};
			const remoteProject1 = {
				...mockProjects.basic,
				id: 'project-1',
				name: 'Remote 1',
			};
			const remoteProject2 = {
				...mockProjects.basic,
				id: 'project-2',
				name: 'Project 2',
				description: 'Different description',
			};
			const remoteOnlyProject = {
				...mockProjects.basic,
				id: 'project-4',
				name: 'Project 4',
			};

			it('should set correct status and conflict flags for push direction', async () => {
				// ARRANGE
				setupProjectMocks({
					remote: [remoteProject1, remoteProject2, remoteOnlyProject],
					local: [localProject1, localProject2, localOnlyProject],
				});

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: true,
				});

				// ASSERT
				if (!Array.isArray(result)) {
					fail('Expected result to be an array.');
				}

				expect(result).toHaveLength(4);
				expect(result).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							id: localProject1.id,
							name: `${localProject1.name} (Remote: ${remoteProject1.name})`,
							conflict: true,
							location: 'local',
							status: 'modified',
						}),
						expect.objectContaining({
							id: localProject2.id,
							name: localProject2.name,
							conflict: true,
							location: 'local',
							status: 'modified',
						}),
						expect.objectContaining({
							id: localOnlyProject.id,
							name: localOnlyProject.name,
							conflict: false,
							location: 'local',
							status: 'created',
						}),
						expect.objectContaining({
							id: remoteOnlyProject.id,
							name: remoteOnlyProject.name,
							conflict: false,
							location: 'local',
							status: 'deleted',
						}),
					]),
				);
			});

			it('should set correct status and conflict flags for pull direction', async () => {
				// ARRANGE
				setupProjectMocks({
					remote: [remoteProject1, remoteProject2, remoteOnlyProject],
					local: [localProject1, localProject2, localOnlyProject],
				});

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT
				if (!Array.isArray(result)) {
					fail('Expected result to be an array.');
				}

				expect(result).toHaveLength(4);
				expect(result).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							id: remoteProject1.id,
							name: `${remoteProject1.name} (Local: ${localProject1.name})`,
							status: 'modified',
							location: 'remote',
							conflict: true,
						}),
						expect.objectContaining({
							id: remoteProject2.id,
							name: remoteProject2.name,
							status: 'modified',
							location: 'remote',
							conflict: true,
						}),
						expect.objectContaining({
							id: localOnlyProject.id,
							name: localOnlyProject.name,
							status: 'deleted',
							location: 'remote',
							conflict: true,
						}),
						expect.objectContaining({
							id: remoteOnlyProject.id,
							name: remoteOnlyProject.name,
							status: 'created',
							location: 'remote',
							conflict: false,
						}),
					]),
				);
			});
		});
	});

	describe('detect owner changes', () => {
		describe('credentials', () => {
			const mockCredentials = {
				withOwner: {
					id: 'cred1',
					name: 'Test Credential',
					type: 'testApi',
					data: {},
					filename: '/mock/n8n/git/credentials/cred1.json',
					ownedBy: {
						type: 'personal' as const,
						projectId: 'project1',
						projectName: 'Project 1',
					},
				} as StatusExportableCredential,
				withDifferentOwner: {
					id: 'cred1',
					name: 'Test Credential',
					type: 'testApi',
					data: {},
					filename: '/mock/n8n/git/credentials/cred1.json',
					ownedBy: {
						type: 'personal' as const,
						projectId: 'project2',
						projectName: 'Project 2',
					},
				} as StatusExportableCredential,
			};

			const user = mock<User>({ role: GLOBAL_ADMIN_ROLE });

			it('should detect credential as modified when owner changes', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([
					mockCredentials.withDifferentOwner,
				]);
				sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([
					mockCredentials.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.credModifiedInEither).toHaveLength(1);
				expect(result.credModifiedInEither[0]).toMatchObject({
					id: mockCredentials.withOwner.id,
					name: mockCredentials.withDifferentOwner.name,
					type: mockCredentials.withOwner.type,
				});
			});

			it('should not detect change when there is no change', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([
					mockCredentials.withOwner,
				]);
				sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([
					mockCredentials.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.credModifiedInEither).toHaveLength(0);
				expect(result.sourceControlledFiles.filter((f) => f.type === 'credential')).toHaveLength(0);
			});

			it('should correctly populate owner field in sourceControlledFiles for modified credentials', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([
					mockCredentials.withDifferentOwner,
				]);
				sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([
					mockCredentials.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT
				if (!Array.isArray(result)) {
					fail('Expected result to be an array.');
				}

				const credentialFile = result.find((f) => f.type === 'credential');
				expect(credentialFile).toBeDefined();
				expect(credentialFile?.owner).toEqual(mockCredentials.withOwner.ownedBy);
				expect(credentialFile?.status).toBe('modified');
				expect(credentialFile?.conflict).toBe(true);
			});

			it('should detect modifications when both name/type and owner change', async () => {
				// ARRANGE
				const remoteCredential = {
					...mockCredentials.withDifferentOwner,
					name: 'Different Name',
					type: 'differentApi',
				};

				sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([
					remoteCredential,
				]);
				sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([
					mockCredentials.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.credModifiedInEither).toHaveLength(1);
				expect(result.credModifiedInEither[0]).toMatchObject({
					id: mockCredentials.withOwner.id,
					name: remoteCredential.name,
					type: mockCredentials.withOwner.type,
				});
			});
		});

		describe('workflows', () => {
			const mockWorkflows = {
				withOwner: {
					id: 'wf1',
					name: 'Test Workflow',
					versionId: 'version1',
					filename: 'workflows/wf1.json',
					parentFolderId: 'folder1',
					updatedAt: '2023-07-10T10:10:59.000Z',
					owner: {
						type: 'personal' as const,
						projectId: 'project1',
						projectName: 'Project 1',
					},
				},
				withDifferentOwner: {
					id: 'wf1',
					name: 'Test Workflow',
					versionId: 'version1',
					filename: 'workflows/wf1.json',
					parentFolderId: 'folder1',
					updatedAt: '2023-07-10T10:10:59.000Z',
					owner: {
						type: 'team' as const,
						projectId: 'team1',
						projectName: 'Team 1',
					},
				},
			};

			const user = mock<User>({ role: GLOBAL_ADMIN_ROLE });

			it('should detect workflow as modified when owner changes', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([
					mockWorkflows.withDifferentOwner,
				]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([
					mockWorkflows.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.wfModifiedInEither).toHaveLength(1);
				expect(result.wfModifiedInEither[0]).toMatchObject({
					id: mockWorkflows.withOwner.id,
					versionId: mockWorkflows.withDifferentOwner.versionId,
				});
			});

			it('should not detect workflow as modified when versionId, parentFolderId, and owner are the same', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([
					mockWorkflows.withOwner,
				]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([
					mockWorkflows.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.wfModifiedInEither).toHaveLength(0);
				expect(result.sourceControlledFiles.filter((f) => f.type === 'workflow')).toHaveLength(0);
			});

			it('should correctly populate owner field in sourceControlledFiles for modified workflows', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([
					mockWorkflows.withDifferentOwner,
				]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([
					mockWorkflows.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT
				if (!Array.isArray(result)) {
					fail('Expected result to be an array.');
				}

				const workflowFile = result.find((f) => f.type === 'workflow');
				expect(workflowFile).toBeDefined();
				expect(workflowFile?.owner).toEqual(mockWorkflows.withOwner.owner);
				expect(workflowFile?.status).toBe('modified');
				expect(workflowFile?.conflict).toBe(true);
			});

			it('should detect modifications when both versionId/parentFolderId and owner change', async () => {
				// ARRANGE
				const remoteWorkflow = {
					...mockWorkflows.withDifferentOwner,
					versionId: 'version2',
					parentFolderId: 'folder2',
				};

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remoteWorkflow]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([
					mockWorkflows.withOwner,
				]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.wfModifiedInEither).toHaveLength(1);
				expect(result.wfModifiedInEither[0]).toMatchObject({
					id: mockWorkflows.withOwner.id,
					versionId: remoteWorkflow.versionId,
				});
			});
		});

		describe('folders', () => {
			const mockFolders = {
				withProject: {
					id: 'folder1',
					name: 'Test Folder',
					homeProjectId: 'project1',
					parentFolderId: null,
					createdAt: '2023-07-10T10:10:59.000Z',
					updatedAt: '2023-07-10T10:10:59.000Z',
				},
				withDifferentProject: {
					id: 'folder1',
					name: 'Test Folder',
					homeProjectId: 'project2',
					parentFolderId: null,
					createdAt: '2023-07-10T10:10:59.000Z',
					updatedAt: '2023-07-10T10:10:59.000Z',
				},
			};

			const user = mock<User>({ role: GLOBAL_ADMIN_ROLE });

			it('should detect folder as modified when homeProjectId changes', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [mockFolders.withDifferentProject],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [mockFolders.withProject],
				});

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.foldersModifiedInEither).toHaveLength(1);
				expect(result.foldersModifiedInEither[0]).toMatchObject({
					id: mockFolders.withProject.id,
					homeProjectId: mockFolders.withDifferentProject.homeProjectId,
				});
			});

			it('should not detect folder as modified when name, parentFolderId, and homeProjectId are the same', async () => {
				// ARRANGE
				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [mockFolders.withProject],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [mockFolders.withProject],
				});

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.foldersModifiedInEither).toHaveLength(0);
				expect(result.sourceControlledFiles.filter((f) => f.type === 'folders')).toHaveLength(0);
			});

			it('should detect modifications when both name/parentFolderId and homeProjectId change', async () => {
				// ARRANGE
				const remoteFolder = {
					...mockFolders.withDifferentProject,
					name: 'Different Folder Name',
					parentFolderId: 'parent1',
				};

				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [remoteFolder],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [mockFolders.withProject],
				});

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) {
					fail('Expected result to be an object.');
				}

				expect(result.foldersModifiedInEither).toHaveLength(1);
				expect(result.foldersModifiedInEither[0]).toMatchObject({
					id: mockFolders.withProject.id,
					name: remoteFolder.name,
					homeProjectId: remoteFolder.homeProjectId,
				});
			});
		});
	});
});
