import { mockLogger } from '@n8n/backend-test-utils';
import {
	GLOBAL_ADMIN_ROLE,
	GLOBAL_MEMBER_ROLE,
	type FolderRepository,
	type FolderWithWorkflowAndSubFolderCount,
	type Project,
	type TagEntity,
	type TagRepository,
	type User,
	type Variables,
	type WorkflowEntity,
	type WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { EventService } from '@/events/event.service';

import type { SourceControlContextFactory } from '../source-control-context.factory';
import type { SourceControlGitService } from '../source-control-git.service.ee';
import * as sourceControlHelper from '../source-control-helper.ee';
import type { SourceControlImportService } from '../source-control-import.service.ee';
import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlStatusService } from '../source-control-status.service.ee';
import type { StatusExportableCredential } from '../types/exportable-credential';
import type { ExportableProjectWithFileName } from '../types/exportable-project';
import { SourceControlContext } from '../types/source-control-context';
import type { SourceControlWorkflowVersionId } from '../types/source-control-workflow-version-id';

// Reuse typed user mocks at module scope to avoid performance issues related to recreating nested proxy mocks per test
const globalAdminUser = mock<User>({ role: GLOBAL_ADMIN_ROLE });
const globalAdminUserWithId = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });
const globalMemberUser = mock<User>({ role: GLOBAL_MEMBER_ROLE });

describe('getStatus', () => {
	const gitService = mock<SourceControlGitService>();
	const sourceControlImportService = mock<SourceControlImportService>();
	const tagRepository = mock<TagRepository>();
	const folderRepository = mock<FolderRepository>();
	const workflowRepository = mock<WorkflowRepository>();

	const preferencesService = new SourceControlPreferencesService(
		Container.get(InstanceSettings),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	const sourceControlContextFactory = mock<SourceControlContextFactory>();
	const sourceControlStatusService = new SourceControlStatusService(
		mockLogger(),
		gitService,
		sourceControlImportService,
		preferencesService,
		sourceControlContextFactory,
		tagRepository,
		folderRepository,
		workflowRepository,
		mock<EventService>(),
	);

	beforeEach(() => {
		vi.clearAllMocks();

		sourceControlContextFactory.createContext.mockImplementation(
			async (user) => new SourceControlContext(user, [], []),
		);

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
		sourceControlImportService.getLocalGlobalVariablesFromDb.mockResolvedValue([]);

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

		// data tables
		sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([]);
		sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([]);
		// Mirrors the real resolution: team id for team owners, the pulling
		// user's personal project otherwise
		sourceControlImportService.resolveRemoteDataTableProjectId.mockImplementation(
			async (ownedBy) => (ownedBy?.type === 'team' ? ownedBy.teamId : 'pulling-user-project'),
		);

		// repositories
		tagRepository.find.mockResolvedValue([]);
		folderRepository.find.mockResolvedValue([]);
		workflowRepository.findByIds.mockResolvedValue([]);

		vi.spyOn(sourceControlHelper, 'sourceControlFoldersExistCheck').mockReturnValue(true);
	});

	it('ensure updatedAt field for last deleted tag', async () => {
		// ARRANGE
		const user = globalAdminUser;

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
			expect.fail('Expected pushResult to be an array.');
		}

		expect(pushResult).toHaveLength(1);
		expect(pushResult.find((i) => i.type === 'tags')?.updatedAt).toBeDefined();
	});

	it('ensure updatedAt field for last deleted folder', async () => {
		// ARRANGE
		const user = globalAdminUser;

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
			expect.fail('Expected pushResult to be an array.');
		}

		expect(pushResult).toHaveLength(1);
		expect(pushResult.find((i) => i.type === 'folders')?.updatedAt).toBeDefined();
	});

	it('conflict depends on the value of `direction`', async () => {
		// ARRANGE
		const user = globalAdminUser;

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
		sourceControlImportService.getLocalGlobalVariablesFromDb.mockResolvedValue([mock<Variables>()]);

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

		// Define a project that only exists locally and another that exists both locally and remotely.
		const project1 = mock<ExportableProjectWithFileName>({
			id: 'project-id-1',
			name: 'Project 1 Remote',
			owner: {
				type: 'team',
				teamId: 'team-id-1',
				teamName: 'Team 1',
			},
		});
		sourceControlImportService.getRemoteProjectsFromFiles.mockResolvedValue([
			mock<ExportableProjectWithFileName>({ ...project1 }),
		]);
		sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
			mock<ExportableProjectWithFileName>({
				...project1,
				name: 'Project 1 Local',
			}),
			mock<ExportableProjectWithFileName>({
				id: 'project-id-2',
			}),
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
			expect.fail('Expected pullResult to be an array.');
		}
		if (!Array.isArray(pushResult)) {
			expect.fail('Expected pushResult to be an array.');
		}

		expect(pullResult).toHaveLength(7);
		expect(pushResult).toHaveLength(7);

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

		expect(pullResult.find((i) => i.type === 'project' && i.id === 'project-id-2')).toHaveProperty(
			'conflict',
			true,
		);
		expect(pushResult.find((i) => i.type === 'project' && i.id === 'project-id-2')).toHaveProperty(
			'conflict',
			false,
		);

		expect(pullResult.find((i) => i.type === 'project' && i.id === 'project-id-1')).toHaveProperty(
			'conflict',
			true,
		);
		expect(pushResult.find((i) => i.type === 'project' && i.id === 'project-id-1')).toHaveProperty(
			'conflict',
			true,
		);
	});

	it('should throw `ForbiddenError` if direction is pull and user is not allowed to globally pull', async () => {
		// ARRANGE
		const user = globalMemberUser;

		// ACT
		await expect(
			sourceControlStatusService.getStatus(user, {
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			}),
		).rejects.toThrowError(ForbiddenError);
	});

	it('should throw `ForbiddenError` if direction is push and user has no source control push access', async () => {
		// ARRANGE
		const user = globalMemberUser;

		// ACT
		await expect(
			sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: true,
			}),
		).rejects.toThrowError(ForbiddenError);

		expect(gitService.resetBranch).not.toHaveBeenCalled();
	});

	it('should allow push status for a user with project source control push access', async () => {
		// ARRANGE
		const user = globalMemberUser;
		sourceControlContextFactory.createContext.mockResolvedValueOnce(
			new SourceControlContext(user, [mock<Project>({ id: 'project-1', type: 'team' })], []),
		);

		// ACT
		const result = await sourceControlStatusService.getStatus(user, {
			direction: 'push',
			verbose: false,
			preferLocalVersion: true,
		});

		// ASSERT
		expect(result).toEqual([]);
		expect(sourceControlContextFactory.createContext).toHaveBeenCalledWith(user);
	});

	describe('project', () => {
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
			globalAdmin: globalAdminUser,
			limitedUser: globalMemberUser,
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
				expect.fail('Expected result to be an object.');
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
				expect.fail('Expected result to be an object.');
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
				expect.fail('Expected result to be an object.');
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

		it('should identify projects with modified variables', async () => {
			// ARRANGE
			const user = mockUsers.globalAdmin;
			const localProject = mockProjects.basic;
			const remoteProject: ExportableProjectWithFileName = {
				...mockProjects.basic,
				variableStubs: [{ id: 'var1', key: 'VAR1', value: '', type: 'string' }],
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
				expect.fail('Expected result to be an object.');
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
			sourceControlContextFactory.createContext.mockResolvedValueOnce(
				new SourceControlContext(
					user,
					visibleProjects.map((project) =>
						mock<Project>({ id: project.id, name: project.name, type: 'team' }),
					),
					[],
				),
			);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT
			if (!Array.isArray(result)) {
				expect.fail('Expected result to be an array.');
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
					expect.fail('Expected result to be an array.');
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
					expect.fail('Expected result to be an array.');
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

		it('should not mark projects for deletion when projects folder does not exist (backward compatibility)', async () => {
			// ARRANGE
			const user = mockUsers.globalAdmin;
			const localProjects = [
				{
					id: 'local-project-1',
					name: 'Local Project 1',
					description: 'Local project description',
					icon: null,
					type: 'team' as const,
					owner: {
						type: 'team' as const,
						teamId: 'local-project-1',
						teamName: 'Local Project 1',
					},
					filename: '/mock/n8n/git/projects/local-project-1.json',
				},
			];

			setupProjectMocks({
				remote: [],
				local: localProjects,
			});

			// Override the default mock: folder doesn't exist (backward compatibility scenario)
			vi.spyOn(sourceControlHelper, 'sourceControlFoldersExistCheck').mockReturnValue(false);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'pull',
				verbose: false,
				preferLocalVersion: false,
			});

			// ASSERT
			if (!Array.isArray(result)) {
				expect.fail('Expected result to be an array.');
			}

			// Should NOT include any project deletion entries
			const projectDeletions = result.filter(
				(file) => file.type === 'project' && file.status === 'deleted',
			);
			expect(projectDeletions).toHaveLength(0);
		});
	});

	describe('workflows', () => {
		const user = globalAdminUser;

		const createWorkflow = (
			overrides: Partial<SourceControlWorkflowVersionId> = {},
		): SourceControlWorkflowVersionId => ({
			id: 'wf1',
			name: 'Test Workflow',
			versionId: 'version1',
			filename: 'workflows/wf1.json',
			parentFolderId: 'folder1',
			updatedAt: '2023-07-10T10:10:59.000Z',
			...overrides,
		});

		describe('missing workflows (verbose)', () => {
			it('should include workflows missing in local', async () => {
				const remote = createWorkflow({ id: 'wf-remote', filename: 'workflows/wf-remote.json' });

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.wfMissingInLocal).toMatchObject([remote]);
				expect(result.sourceControlledFiles).toHaveLength(1);
			});

			it('should include workflows missing in remote', async () => {
				const local = createWorkflow({ id: 'wf-local', filename: 'workflows/wf-local.json' });

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([local]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.wfMissingInRemote).toMatchObject([local]);
				expect(result.sourceControlledFiles).toHaveLength(1);
			});
		});

		describe('folder paths', () => {
			it('includes folderPath for remote-only workflow', async () => {
				const remote = createWorkflow({
					id: 'wf-remote-foldered',
					filename: 'workflows/wf-remote-foldered.json',
					parentFolderId: 'child-folder',
				});

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [
						{
							id: 'root-folder',
							name: 'Root',
							parentFolderId: null,
							homeProjectId: 'project1',
							createdAt: '2023-01-01T00:00:00.000Z',
							updatedAt: '2023-01-01T00:00:00.000Z',
						},
						{
							id: 'child-folder',
							name: 'Child',
							parentFolderId: 'root-folder',
							homeProjectId: 'project1',
							createdAt: '2023-01-01T00:00:00.000Z',
							updatedAt: '2023-01-01T00:00:00.000Z',
						},
					],
				});

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				const workflow = result.find((f) => f.id === 'wf-remote-foldered');
				expect(workflow).toBeDefined();
				expect(workflow?.parentFolderId).toBe('child-folder');
				expect(workflow?.folderPath).toEqual(['Root', 'Child']);
			});

			it('uses local folder path for modified workflow when preferLocalVersion is true', async () => {
				const local = createWorkflow({
					id: 'wf-modified-foldered',
					versionId: 'local-v1',
					parentFolderId: 'local-child',
				});
				const remote = createWorkflow({
					id: 'wf-modified-foldered',
					versionId: 'remote-v2',
					parentFolderId: 'remote-child',
				});

				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([local]);
				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [],
				});
				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [
						{
							id: 'remote-child',
							name: 'Remote Child',
							parentFolderId: null,
							homeProjectId: 'project1',
							createdAt: '2023-01-01T00:00:00.000Z',
							updatedAt: '2023-01-01T00:00:00.000Z',
						},
					],
				});

				const folderData = new Map([
					[
						'local-child',
						{ id: 'local-child', name: 'Local Child', parentFolder: { id: 'local-parent' } },
					],
					['local-parent', { id: 'local-parent', name: 'Local Parent', parentFolder: null }],
				]);
				folderRepository.find.mockImplementation(async (options: any) => {
					// populateMissingLocalFolderPathNodes calls with where.id (In(...))
					if (options?.where?.id?._value) {
						const ids = options.where.id._value as string[];
						return ids.map((id: string) => folderData.get(id)).filter(Boolean) as any;
					}
					// Default: return empty for other calls (lastUpdatedFolder, etc.)
					return [];
				});

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: true,
				});

				const workflow = result.find((f) => f.id === 'wf-modified-foldered');
				expect(workflow).toBeDefined();
				expect(workflow?.status).toBe('modified');
				expect(workflow?.parentFolderId).toBe('local-child');
				expect(workflow?.folderPath).toEqual(['Local Parent', 'Local Child']);
			});
		});

		describe('owner changes', () => {
			describe('team project ownership changes (detected)', () => {
				it('should detect when team project changes', async () => {
					const local = createWorkflow({
						owner: { type: 'team', projectId: 'team1', projectName: 'Team 1' },
					});
					const remote = createWorkflow({
						owner: { type: 'team', projectId: 'team2', projectName: 'Team 2' },
					});

					sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.wfModifiedInEither).toHaveLength(1);
				});

				it('should detect when changing from personal to team', async () => {
					const local = createWorkflow({
						owner: { type: 'personal', projectId: 'personal1', projectName: 'Personal 1' },
					});
					const remote = createWorkflow({
						owner: { type: 'team', projectId: 'team1', projectName: 'Team 1' },
					});

					sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.wfModifiedInEither).toHaveLength(1);
				});
			});

			describe('personal project ownership changes (ignored)', () => {
				it('should NOT detect when both are personal projects with different IDs', async () => {
					const local = createWorkflow({
						owner: { type: 'personal', projectId: 'personal1', projectName: 'Personal 1' },
					});
					const remote = createWorkflow({
						owner: { type: 'personal', projectId: 'personal2', projectName: 'Personal 2' },
					});

					sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					// No modification detected because personal projects are not synced
					expect(result.wfModifiedInEither).toHaveLength(0);
				});

				it('should NOT detect when personal owner vs undefined', async () => {
					const local = createWorkflow({
						owner: { type: 'personal', projectId: 'personal1', projectName: 'Personal 1' },
					});
					const remote = createWorkflow({ owner: undefined });

					sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.wfModifiedInEither).toHaveLength(0);
				});
			});

			it('should not detect as modified when everything is the same', async () => {
				const workflow = createWorkflow({
					owner: { type: 'team', projectId: 'team1', projectName: 'Team 1' },
				});

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([workflow]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([workflow]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.wfModifiedInEither).toHaveLength(0);
			});
		});
	});

	describe('credentials', () => {
		describe('owner changes', () => {
			const user = globalAdminUser;

			const createCredential = (
				overrides: Partial<StatusExportableCredential> = {},
			): StatusExportableCredential =>
				({
					id: 'cred1',
					name: 'Test Credential',
					type: 'testApi',
					data: {},
					filename: '/mock/n8n/git/credentials/cred1.json',
					...overrides,
				}) as StatusExportableCredential;

			describe('team project ownership changes (detected)', () => {
				it('should detect when team project changes', async () => {
					const local = createCredential({
						ownedBy: { type: 'team', projectId: 'team1', projectName: 'Team 1' } as any,
					});

					const remote = createCredential({
						ownedBy: { type: 'team', projectId: 'team2', projectName: 'Team 2' } as any,
					});

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(1);
				});

				it('should detect when changing from personal to team', async () => {
					const local = createCredential({
						ownedBy: { type: 'personal', projectId: 'personal1', projectName: 'Personal 1' } as any,
					});
					const remote = createCredential({
						ownedBy: { type: 'team', projectId: 'team1', projectName: 'Team 1' } as any,
					});

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(1);
				});
			});

			describe('personal project ownership changes (ignored)', () => {
				it('should NOT detect when both are personal projects with different IDs', async () => {
					const local = createCredential({
						ownedBy: { type: 'personal', projectId: 'personal1', projectName: 'Personal 1' } as any,
					});
					const remote = createCredential({
						ownedBy: { type: 'personal', projectId: 'personal2', projectName: 'Personal 2' } as any,
					});

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					// No modification detected because personal projects are not synced
					expect(result.credModifiedInEither).toHaveLength(0);
				});

				it('should NOT detect when personal owner vs undefined', async () => {
					const local = createCredential({
						ownedBy: { type: 'personal', projectId: 'personal1', projectName: 'Personal 1' } as any,
					});
					const remote = createCredential({ ownedBy: undefined });

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(0);
				});
			});

			describe('isGlobal changes', () => {
				it('should detect when isGlobal changes from false to true', async () => {
					const local = createCredential({ isGlobal: false });
					const remote = createCredential({ isGlobal: true });

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(1);
				});

				it('should detect when isGlobal changes from true to false', async () => {
					const local = createCredential({ isGlobal: true });
					const remote = createCredential({ isGlobal: false });

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(1);
				});

				it('should detect when isGlobal changes from undefined to true', async () => {
					const local = createCredential({ isGlobal: undefined });
					const remote = createCredential({ isGlobal: true });

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([remote]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([local]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(1);
				});

				it('should not detect changes when isGlobal is the same (both true)', async () => {
					const credential = createCredential({ isGlobal: true });

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([credential]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([credential]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(0);
				});

				it('should not detect changes when isGlobal is the same (both false/undefined)', async () => {
					const credential = createCredential({ isGlobal: false });

					sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([credential]);
					sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([credential]);

					const result = await sourceControlStatusService.getStatus(user, {
						direction: 'push',
						verbose: true,
						preferLocalVersion: false,
					});

					if (Array.isArray(result)) expect.fail('Expected result to be an object.');
					expect(result.credModifiedInEither).toHaveLength(0);
				});
			});

			it('should not detect as modified when everything is the same', async () => {
				const credential = createCredential({
					ownedBy: { type: 'team', projectId: 'team1', projectName: 'Team 1' } as any,
				});

				sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([credential]);
				sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([credential]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.credModifiedInEither).toHaveLength(0);
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

		const user = globalAdminUser;

		it('should detect folder as modified when homeProjectId changes', async () => {
			// ARRANGE
			sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
				{
					id: 'project1',
					name: 'Project 1',
					type: 'team',
					owner: { type: 'team', teamId: 'project1', teamName: 'Project 1' },
				} as ExportableProjectWithFileName,
				{
					id: 'project2',
					name: 'Project 2',
					type: 'team',
					owner: { type: 'team', teamId: 'project2', teamName: 'Project 2' },
				} as ExportableProjectWithFileName,
			]);

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
				expect.fail('Expected result to be an object.');
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
				expect.fail('Expected result to be an object.');
			}

			expect(result.foldersModifiedInEither).toHaveLength(0);
			expect(result.sourceControlledFiles.filter((f) => f.type === 'folders')).toHaveLength(0);
		});

		it('should detect modifications when both name/parentFolderId and homeProjectId change', async () => {
			// ARRANGE
			sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
				{
					id: 'project1',
					name: 'Project 1',
					type: 'team',
					owner: { type: 'team', teamId: 'project1', teamName: 'Project 1' },
				} as ExportableProjectWithFileName,
				{
					id: 'project2',
					name: 'Project 2',
					type: 'team',
					owner: { type: 'team', teamId: 'project2', teamName: 'Project 2' },
				} as ExportableProjectWithFileName,
			]);

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
				expect.fail('Expected result to be an object.');
			}

			expect(result.foldersModifiedInEither).toHaveLength(1);
			expect(result.foldersModifiedInEither[0]).toMatchObject({
				id: mockFolders.withProject.id,
				name: remoteFolder.name,
				homeProjectId: remoteFolder.homeProjectId,
			});
		});

		describe('owner changes', () => {
			const user = globalAdminUser;

			const createFolder = (overrides = {}) => ({
				id: 'folder1',
				name: 'Test Folder',
				homeProjectId: 'project1',
				parentFolderId: null,
				createdAt: '2023-07-10T10:10:59.000Z',
				updatedAt: '2023-07-10T10:10:59.000Z',
				...overrides,
			});

			it('should detect when team project changes for folder', async () => {
				const localFolder = createFolder({ homeProjectId: 'team1' });
				const remoteFolder = createFolder({ homeProjectId: 'team2' });

				// Mock team projects
				sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
					{
						id: 'team1',
						name: 'Team 1',
						type: 'team',
						owner: { type: 'team', teamId: 'team1', teamName: 'Team 1' },
					} as ExportableProjectWithFileName,
					{
						id: 'team2',
						name: 'Team 2',
						type: 'team',
						owner: { type: 'team', teamId: 'team2', teamName: 'Team 2' },
					} as ExportableProjectWithFileName,
				]);

				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [remoteFolder],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [localFolder],
				});

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.foldersModifiedInEither).toHaveLength(1);
			});

			it('should detect when changing folder from personal to team project', async () => {
				const localFolder = createFolder({ homeProjectId: 'personal1' });
				const remoteFolder = createFolder({ homeProjectId: 'team1' });

				sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
					{
						id: 'team1',
						name: 'Team 1',
						type: 'team',
						owner: { type: 'team', teamId: 'team1', teamName: 'Team 1' },
					} as ExportableProjectWithFileName,
				]);

				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [remoteFolder],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [localFolder],
				});

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.foldersModifiedInEither).toHaveLength(1);
			});

			it('should NOT detect when both folders are personal projects with different IDs', async () => {
				const localFolder = createFolder({ homeProjectId: 'personal1' });
				const remoteFolder = createFolder({ homeProjectId: 'personal2' });

				sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([]);

				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [remoteFolder],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [localFolder],
				});

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.foldersModifiedInEither).toHaveLength(0);
			});

			it('should not detect as modified when everything is the same', async () => {
				const folder = createFolder({ homeProjectId: 'team1' });

				sourceControlImportService.getLocalTeamProjectsFromDb.mockResolvedValue([
					{
						id: 'team1',
						name: 'Team 1',
						type: 'team',
						owner: { type: 'team', teamId: 'team1', teamName: 'Team 1' },
					} as ExportableProjectWithFileName,
				]);

				sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
					folders: [folder],
				});
				sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
					folders: [folder],
				});

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				expect(result.foldersModifiedInEither).toHaveLength(0);
			});
		});

		describe('workflow isLocalPublished and isRemoteArchived fields', () => {
			it('should populate isLocalPublished and isRemoteArchived for new workflows', async () => {
				const remoteWorkflow: SourceControlWorkflowVersionId = {
					id: 'wf-new',
					name: 'New Workflow',
					versionId: 'v1',
					filename: 'workflows/wf-new.json',
					parentFolderId: null,
					updatedAt: '2024-01-01T00:00:00.000Z',
					isRemoteArchived: true,
				};

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remoteWorkflow]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
				workflowRepository.findByIds.mockResolvedValue([]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				expect(result).toHaveLength(1);
				const workflow = result.find((f) => f.id === 'wf-new');
				expect(workflow).toBeDefined();
				expect(workflow?.isLocalPublished).toBe(false);
				expect(workflow?.isRemoteArchived).toBe(true);
			});

			it('should populate isLocalPublished for modified published workflows', async () => {
				const workflowId = 'wf-published';
				const localWorkflow: SourceControlWorkflowVersionId = {
					id: workflowId,
					name: 'Published Workflow',
					versionId: 'v1',
					filename: 'workflows/wf-published.json',
					parentFolderId: null,
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteWorkflow: SourceControlWorkflowVersionId = {
					...localWorkflow,
					versionId: 'v2', // Different version to trigger "modified" status
					isRemoteArchived: false,
				};

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remoteWorkflow]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([localWorkflow]);
				const publishedWorkflow: Partial<WorkflowEntity> = {
					id: workflowId,
					activeVersionId: 'active-v1',
				};
				workflowRepository.findByIds.mockResolvedValue([publishedWorkflow as WorkflowEntity]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				expect(result).toHaveLength(1);
				const workflow = result.find((f) => f.id === workflowId);
				expect(workflow).toBeDefined();
				expect(workflow?.isLocalPublished).toBe(true);
				expect(workflow?.isRemoteArchived).toBe(false);
			});

			it('should populate isLocalPublished=false for modified unpublished workflows', async () => {
				const workflowId = 'wf-unpublished';
				const localWorkflow: SourceControlWorkflowVersionId = {
					id: workflowId,
					name: 'Unpublished Workflow',
					versionId: 'v1',
					filename: 'workflows/wf-unpublished.json',
					parentFolderId: null,
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteWorkflow: SourceControlWorkflowVersionId = {
					...localWorkflow,
					versionId: 'v2', // Different version
					isRemoteArchived: false,
				};

				sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([remoteWorkflow]);
				sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([localWorkflow]);

				const unpublishedWorkflow: Partial<WorkflowEntity> = {
					id: workflowId,
					activeVersionId: null,
				};
				workflowRepository.findByIds.mockResolvedValue([unpublishedWorkflow as WorkflowEntity]);

				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				expect(result).toHaveLength(1);
				const workflow = result.find((f) => f.id === workflowId);
				expect(workflow).toBeDefined();
				expect(workflow?.isLocalPublished).toBe(false);
				expect(workflow?.isRemoteArchived).toBe(false);
			});
		});
	});

	describe('tag mappings', () => {
		const user = globalAdminUser;

		it('should detect when a tag mapping is removed locally but still exists remotely', async () => {
			const tag = mock<TagEntity>({ id: 'tag1', name: 'Test Tag', updatedAt: new Date() });
			tagRepository.find.mockResolvedValue([tag]);

			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [tag],
				mappings: [{ tagId: 'tag1', workflowId: 'wf1' }],
			});

			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [tag],
				mappings: [],
			});

			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			if (Array.isArray(result)) {
				expect.fail('Expected result to be an object in verbose mode.');
			}

			expect(result.mappingsMissingInLocal).toHaveLength(1);
			expect(result.mappingsMissingInLocal[0]).toMatchObject({
				tagId: 'tag1',
				workflowId: 'wf1',
			});
			expect(result.mappingsMissingInRemote).toHaveLength(0);
		});
	});

	describe('data tables', () => {
		it('should handle undefined data tables from remote (null safety)', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			// Mock undefined data tables from remote
			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue(undefined as any);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([]);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');
			expect(dataTableFiles).toHaveLength(0);
		});

		it('should handle undefined data tables from local (null safety)', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			// Mock undefined data tables from local
			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue(undefined as any);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');
			expect(dataTableFiles).toHaveLength(0);
		});

		it('should handle both data tables undefined (null safety)', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			// Mock both undefined
			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue(undefined as any);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue(undefined as any);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');
			expect(dataTableFiles).toHaveLength(0);
		});

		it('should identify data tables missing in local (remote only)', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			const remoteDataTable = {
				id: 'dt1',
				name: 'Remote Data Table',
				projectId: 'project1',
				ownedBy: null,
				filename: 'test.json',
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			};

			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([remoteDataTable]);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([]);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFile = result.sourceControlledFiles.find(
				(f) => f.type === 'datatable' && f.id === 'dt1',
			);
			expect(dataTableFile).toBeDefined();
			expect(dataTableFile?.status).toBe('deleted');
			expect(dataTableFile?.location).toBe('local');
		});

		it('should identify data tables missing in remote (local only)', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			const localDataTable = {
				id: 'dt2',
				name: 'Local Data Table',
				projectId: 'project1',
				ownedBy: null,
				filename: 'test.json',
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			};

			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFile = result.sourceControlledFiles.find(
				(f) => f.type === 'datatable' && f.id === 'dt2',
			);
			expect(dataTableFile).toBeDefined();
			expect(dataTableFile?.status).toBe('created');
			expect(dataTableFile?.location).toBe('local');
		});

		it('should identify modified data tables (name changed)', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			const localDataTable = {
				id: 'dt3',
				name: 'Local Name',
				projectId: 'project1',
				ownedBy: null,
				filename: 'test.json',
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			};

			const remoteDataTable = {
				id: 'dt3',
				name: 'Remote Name',
				projectId: 'project1',
				ownedBy: null,
				filename: 'test.json',
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			};

			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([remoteDataTable]);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFile = result.sourceControlledFiles.find(
				(f) => f.type === 'datatable' && f.id === 'dt3',
			);
			expect(dataTableFile).toBeDefined();
			expect(dataTableFile?.status).toBe('modified');
		});

		it('should not detect modifications when data tables are identical', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			const dataTable = {
				id: 'dt4',
				name: 'Identical Table',
				projectId: 'project1',
				ownedBy: null,
				filename: 'test.json',
				columns: [],
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			};

			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([dataTable]);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([dataTable]);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');
			expect(dataTableFiles).toHaveLength(0);
		});

		it('should handle multiple data tables with mixed states', async () => {
			// ARRANGE
			const user = globalAdminUserWithId;

			const localDataTables = [
				{
					id: 'dt5',
					name: 'Local Only',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				{
					id: 'dt6',
					name: 'Modified Local',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				{
					id: 'dt7',
					name: 'Unchanged',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
			];

			const remoteDataTables = [
				{
					id: 'dt6',
					name: 'Modified Remote',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				{
					id: 'dt7',
					name: 'Unchanged',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
				{
					id: 'dt8',
					name: 'Remote Only',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				},
			];

			sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue(remoteDataTables);
			sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue(localDataTables);

			// ACT
			const result = await sourceControlStatusService.getStatus(user, {
				direction: 'push',
				verbose: true,
				preferLocalVersion: false,
			});

			// ASSERT
			if (Array.isArray(result)) expect.fail('Expected result to be an object.');
			const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');

			// Should have: dt5 (created), dt6 (modified), dt8 (deleted)
			expect(dataTableFiles).toHaveLength(3);

			const createdFile = dataTableFiles.find((f) => f.id === 'dt5');
			expect(createdFile?.status).toBe('created');

			const modifiedFile = dataTableFiles.find((f) => f.id === 'dt6');
			expect(modifiedFile?.status).toBe('modified');

			const deletedFile = dataTableFiles.find((f) => f.id === 'dt8');
			expect(deletedFile?.status).toBe('deleted');
		});

		describe('schema change detection', () => {
			const user = globalAdminUserWithId;

			it('should detect column addition', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-1',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
						{ id: 'col3', name: 'Column 3', type: 'boolean', index: 2 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-1',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-1',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});

			it('should detect column deletion', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-2',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-2',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-2',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});

			it('should detect column type change', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-3',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'number', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-3',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'string', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-3',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});

			it('should detect column name change', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-4',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Updated Column Name', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-4',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-4',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});

			it('should detect column reordering (index change)', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-5',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 1 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 0 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-5',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-5',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});

			it('should not detect modifications when schemas are identical', async () => {
				// ARRANGE
				const dataTable = {
					id: 'dt-schema-6',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
						{ id: 'col3', name: 'Column 3', type: 'boolean', index: 2 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([dataTable]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([dataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(0);
			});

			it('should detect combined changes (name and schema)', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-7',
					name: 'Updated Name',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
						{ id: 'col3', name: 'New Column', type: 'boolean', index: 2 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-7',
					name: 'Original Name',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [
						{ id: 'col1', name: 'Column 1', type: 'string', index: 0 },
						{ id: 'col2', name: 'Column 2', type: 'number', index: 1 },
					],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-7',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});

			it('should handle empty columns arrays correctly', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-8',
					name: 'Empty Columns',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-8',
					name: 'Empty Columns',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFiles = result.sourceControlledFiles.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(0);
			});

			it('should detect when one has empty columns and other has columns', async () => {
				// ARRANGE
				const localDataTable = {
					id: 'dt-schema-9',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [{ id: 'col1', name: 'Column 1', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteDataTable = {
					id: 'dt-schema-9',
					name: 'Schema Test',
					projectId: 'project1',
					ownedBy: null,
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: true,
					preferLocalVersion: false,
				});

				// ASSERT
				if (Array.isArray(result)) expect.fail('Expected result to be an object.');
				const dataTableFile = result.sourceControlledFiles.find(
					(f) => f.type === 'datatable' && f.id === 'dt-schema-9',
				);
				expect(dataTableFile).toBeDefined();
				expect(dataTableFile?.status).toBe('modified');
			});
		});

		describe('git as source of truth', () => {
			it('should mark local-only data table as deleted during pull', async () => {
				// ARRANGE
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const localDataTable = {
					id: 'dt-local-only',
					name: 'Local Table',
					ownedBy: { type: 'team' as const, projectId: 'projB', projectName: 'ProjectB' },
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — a table absent from git is deleted on pull, surfaced as a
				// conflict so the non-force pull requires confirmation
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(1);
				expect(dataTableFiles[0]).toMatchObject({
					id: 'dt-local-only',
					status: 'deleted',
					conflict: true,
				});
			});

			it('should mark remote-only data table as deleted during push', async () => {
				// ARRANGE
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteDataTable = {
					id: 'dt-remote-only',
					name: 'Remote Table',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — a table absent locally is offered as a deletion to push
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(1);
				expect(dataTableFiles[0]).toMatchObject({
					id: 'dt-remote-only',
					status: 'deleted',
					location: 'local',
				});
			});

			it('should not treat same-named tables in different projects as a collision during pull', async () => {
				// ARRANGE
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteDataTable = {
					id: 'dt-remote',
					name: 'Table1',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localDataTable = {
					id: 'dt-local',
					name: 'Table1',
					ownedBy: { type: 'team' as const, projectId: 'projB', projectName: 'ProjectB' },
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — same name in DIFFERENT projects is not a collision: the
				// remote table is a plain create, the local one a plain delete
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(2);
				expect(dataTableFiles).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'dt-remote', status: 'created' }),
						expect.objectContaining({ id: 'dt-local', status: 'deleted' }),
					]),
				);
			});

			it('should offer a remote-only table as a deletion during push even when a same-named local table exists in another project', async () => {
				// ARRANGE
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteFromInstanceA = {
					id: 'dt-instance-a',
					name: 'Table1',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localTable = {
					id: 'dt-local',
					name: 'Table1',
					ownedBy: { type: 'team' as const, projectId: 'projB', projectName: 'ProjectB' },
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteFromInstanceA,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — different projects, so no collision: local is a plain
				// create, the remote-only table an offered deletion
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(2);
				expect(dataTableFiles).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'dt-local', status: 'created' }),
						expect.objectContaining({ id: 'dt-instance-a', status: 'deleted' }),
					]),
				);
			});

			it('should emit a single modified entry for a name collision during pull', async () => {
				// ARRANGE
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteDataTable = {
					id: 'dt-remote',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [{ id: 'rc1', name: 'other', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localDataTable = {
					id: 'dt-local',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, projectId: 'projA', projectName: 'ProjectA' },
					filename: 'test.json',
					columns: [{ id: 'lc1', name: 'localOnly', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — exactly ONE "modified" entry carrying the incoming id,
				// flagged like any other schema modification: no "created" for the
				// incoming id, no "deleted" for the old local id
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(1);
				expect(dataTableFiles[0]).toMatchObject({
					id: 'dt-remote',
					name: 'Shared Name',
					status: 'modified',
					conflict: true,
				});
			});

			it('should emit a single modified entry for a personal-project name collision during pull', async () => {
				// ARRANGE — the owner email resolves to the same local personal
				// project the colliding table lives in
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteDataTable = {
					id: 'dt-remote',
					name: 'Shared Name',
					ownedBy: { type: 'personal' as const, personalEmail: 'owner@test.com' },
					columns: [{ id: 'rc1', name: 'col', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localDataTable = {
					id: 'dt-local',
					name: 'Shared Name',
					ownedBy: { type: 'personal' as const, projectId: 'pp-local', projectName: 'Owner' },
					filename: 'test.json',
					columns: [{ id: 'lc1', name: 'col', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);
				sourceControlImportService.resolveRemoteDataTableProjectId.mockResolvedValue('pp-local');

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — one "modified" entry, never a "created" + "deleted" pair
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(1);
				expect(dataTableFiles[0]).toMatchObject({
					id: 'dt-remote',
					status: 'modified',
					conflict: true,
				});
			});

			it('should carry the incoming id on a collision entry regardless of preferLocalVersion', async () => {
				// ARRANGE
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteDataTable = {
					id: 'dt-remote',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [{ id: 'rc1', name: 'other', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localDataTable = {
					id: 'dt-local',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, projectId: 'projA', projectName: 'ProjectA' },
					filename: 'test.json',
					columns: [{ id: 'lc1', name: 'localOnly', type: 'string', index: 0 }],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT — preferLocalVersion true (the UI dry-run flag) must not change
				// which id the entry carries
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: true,
				});

				// ASSERT
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(1);
				expect(dataTableFiles[0]).toMatchObject({
					id: 'dt-remote',
					status: 'modified',
					conflict: true,
				});
			});

			it('should detect a collision even when another project has a same-named remote table', async () => {
				// ARRANGE — the other-project table is listed last so a name-only
				// lookup would mask the real same-project collision
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteSameProject = {
					id: 'dt-remote-a',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const remoteOtherProject = {
					id: 'dt-remote-b',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, teamId: 'projB', teamName: 'ProjectB' },
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localDataTable = {
					id: 'dt-local',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, projectId: 'projA', projectName: 'ProjectA' },
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteSameProject,
					remoteOtherProject,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				});

				// ASSERT — the same-project collision reconciles; the other-project
				// table is an unrelated plain create
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(2);
				expect(dataTableFiles).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'dt-remote-a', status: 'modified', conflict: true }),
						expect.objectContaining({ id: 'dt-remote-b', status: 'created' }),
					]),
				);
			});

			it('should keep the created + conflict entry pair for a name collision during push', async () => {
				// ARRANGE — the single-entry collision shape applies to pull only
				const user = mock<User>({ id: '1', role: GLOBAL_ADMIN_ROLE });

				const remoteDataTable = {
					id: 'dt-remote',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, teamId: 'projA', teamName: 'ProjectA' },
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				const localDataTable = {
					id: 'dt-local',
					name: 'Shared Name',
					ownedBy: { type: 'team' as const, projectId: 'projA', projectName: 'ProjectA' },
					filename: 'test.json',
					columns: [],
					createdAt: '2024-01-01T00:00:00.000Z',
					updatedAt: '2024-01-01T00:00:00.000Z',
				};

				sourceControlImportService.getRemoteDataTablesFromFiles.mockResolvedValue([
					remoteDataTable,
				]);
				sourceControlImportService.getLocalDataTablesFromDb.mockResolvedValue([localDataTable]);

				// ACT
				const result = await sourceControlStatusService.getStatus(user, {
					direction: 'push',
					verbose: false,
					preferLocalVersion: true,
				});

				// ASSERT — the collision keeps its conflict pair; the remote-only id is
				// additionally offered as a deletion (git as source of truth)
				if (!Array.isArray(result)) expect.fail('Expected result to be an array.');
				const dataTableFiles = result.filter((f) => f.type === 'datatable');
				expect(dataTableFiles).toHaveLength(3);
				expect(dataTableFiles).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'dt-local', status: 'modified', conflict: true }),
						expect.objectContaining({ id: 'dt-local', status: 'created' }),
						expect.objectContaining({ id: 'dt-remote', status: 'deleted' }),
					]),
				);
			});
		});
	});
});
