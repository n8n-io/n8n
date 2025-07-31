import type { SourceControlledFile } from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	createWorkflow,
	randomCredentialPayload,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import {
	type CredentialsEntity,
	CredentialsRepository,
	type Folder,
	type Project,
	type TagEntity,
	TagRepository,
	type User,
	type WorkflowEntity,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import {
	FolderRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import * as fastGlob from 'fast-glob';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';
import type { InstanceSettings } from 'n8n-core';
import * as utils from 'n8n-workflow';
import { nanoid } from 'nanoid';
import fsp from 'node:fs/promises';

import { SourceControlImportService } from '@/environments.ee/source-control/source-control-import.service.ee';
import { SourceControlScopedService } from '@/environments.ee/source-control/source-control-scoped.service';
import type { ExportableCredential } from '@/environments.ee/source-control/types/exportable-credential';
import { SourceControlContext } from '@/environments.ee/source-control/types/source-control-context';
import type { IWorkflowToImport } from '@/interfaces';
import { createFolder } from '@test-integration/db/folders';
import { assignTagToWorkflow, createTag } from '@test-integration/db/tags';

import { createCredentials, saveCredential } from '../shared/db/credentials';
import { createAdmin, createMember, createOwner, getGlobalOwner } from '../shared/db/users';

jest.mock('fast-glob');

describe('SourceControlImportService', () => {
	let credentialsRepository: CredentialsRepository;
	let projectRepository: ProjectRepository;
	let sharedCredentialsRepository: SharedCredentialsRepository;
	let userRepository: UserRepository;
	let folderRepository: FolderRepository;
	let service: SourceControlImportService;
	let workflowRepository: WorkflowRepository;
	let tagRepository: TagRepository;
	let workflowTagMappingRepository: WorkflowTagMappingRepository;
	let sourceControlScopedService: SourceControlScopedService;

	const cipher = mockInstance(Cipher);

	beforeAll(async () => {
		await testDb.init();

		credentialsRepository = Container.get(CredentialsRepository);
		projectRepository = Container.get(ProjectRepository);
		sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		userRepository = Container.get(UserRepository);
		folderRepository = Container.get(FolderRepository);
		workflowRepository = Container.get(WorkflowRepository);
		tagRepository = Container.get(TagRepository);
		workflowTagMappingRepository = Container.get(WorkflowTagMappingRepository);
		sourceControlScopedService = Container.get(SourceControlScopedService);
		service = new SourceControlImportService(
			mock(),
			mock(),
			mock(),
			mock(),
			credentialsRepository,
			projectRepository,
			tagRepository,
			mock(),
			sharedCredentialsRepository,
			userRepository,
			mock(),
			workflowRepository,
			workflowTagMappingRepository,
			mock(),
			mock(),
			mock(),
			folderRepository,
			mock<InstanceSettings>({ n8nFolder: '/some-path' }),
			sourceControlScopedService,
		);
	});

	afterEach(async () => {
		await testDb.truncate(['CredentialsEntity', 'SharedCredentials']);

		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getRemoteVersionIdsFromFiles()', () => {
		const mockWorkflow1File = '/mock/workflow1.json';
		const mockWorkflow2File = '/mock/workflow2.json';
		const mockWorkflow3File = '/mock/workflow3.json';
		const mockWorkflow4File = '/mock/workflow4.json';
		const mockWorkflow5File = '/mock/workflow5.json';

		const mockWorkflow1Data: Partial<IWorkflowToImport> = {
			id: 'workflow1',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'personal',
				personalEmail: 'someuser@example.com',
			},
		};
		const mockWorkflow2Data: Partial<IWorkflowToImport> = {
			id: 'workflow2',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};
		const mockWorkflow3Data: Partial<IWorkflowToImport> = {
			id: 'workflow3',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'team',
				teamId: 'team2',
				teamName: 'Team 2',
			},
		};
		const mockWorkflow4Data: Partial<IWorkflowToImport> = {
			id: 'workflow4',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'personal',
				personalEmail: 'someotheruser@example.com',
			},
		};
		const mockWorkflow5Data: Partial<IWorkflowToImport> = {
			id: 'workflow5',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};

		const globMock = fastGlob.default as unknown as jest.Mock<Promise<string[]>, string[]>;
		const fsReadFile = jest.spyOn(fsp, 'readFile');

		let globalAdmin: User;
		let globalOwner: User;
		let globalMember: User;
		let teamAdmin: User;
		let team1: Project;

		beforeAll(async () => {
			[globalAdmin, globalOwner, globalMember, teamAdmin] = await Promise.all([
				createAdmin(),
				createOwner(),
				createMember(),
				createMember(),
			]);

			team1 = await createTeamProject('Team 1', teamAdmin);
		});

		beforeEach(async () => {
			globMock.mockImplementation(async () => [
				mockWorkflow1File,
				mockWorkflow2File,
				mockWorkflow3File,
				mockWorkflow4File,
				mockWorkflow5File,
			]);

			fsReadFile.mockImplementation(async (path) => {
				switch (path) {
					case mockWorkflow1File:
						return JSON.stringify({
							...mockWorkflow1Data,
							owner: {
								type: 'personal',
								personalEmail: teamAdmin.email,
							},
						});
					case mockWorkflow2File:
						return JSON.stringify({
							...mockWorkflow2Data,
							owner: {
								type: 'team',
								teamId: team1.id,
								teamName: team1.name,
							},
						});
					case mockWorkflow3File:
						return JSON.stringify(mockWorkflow3Data);
					case mockWorkflow4File:
						return JSON.stringify(mockWorkflow4Data);
					case mockWorkflow5File:
						return JSON.stringify({
							...mockWorkflow5Data,
							owner: {
								type: 'team',
								teamId: team1.id,
								teamName: team1.name,
							},
						});
				}
				throw new Error(`Trying to access invalid file in test: ${path}`);
			});
		});

		it('should show all remote workflows for instance admins', async () => {
			const result = await service.getRemoteVersionIdsFromFiles(
				new SourceControlContext(globalAdmin),
			);

			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set(
					[
						mockWorkflow1Data,
						mockWorkflow2Data,
						mockWorkflow3Data,
						mockWorkflow4Data,
						mockWorkflow5Data,
					].map((r) => r.id),
				),
			);
		});

		it('should show all remote workflows for instance owners', async () => {
			const result = await service.getRemoteVersionIdsFromFiles(
				new SourceControlContext(globalOwner),
			);

			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set(
					[
						mockWorkflow1Data,
						mockWorkflow2Data,
						mockWorkflow3Data,
						mockWorkflow4Data,
						mockWorkflow5Data,
					].map((r) => r.id),
				),
			);
		});

		it('should return no remote workflows for instance members', async () => {
			const result = await service.getRemoteVersionIdsFromFiles(
				new SourceControlContext(globalMember),
			);

			expect(result).toBeEmptyArray();
		});

		it('should return only remote workflows that belong to team project', async () => {
			const result = await service.getRemoteVersionIdsFromFiles(
				new SourceControlContext(teamAdmin),
			);

			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set([mockWorkflow2Data, mockWorkflow5Data].map((r) => r.id)),
			);
		});
	});

	describe('getLocalVersionIdsFromDb()', () => {
		let instanceOwner: User;
		let projectAdmin: User;
		let projectMember: User;
		let teamProjectA: Project;
		let teamProjectB: Project;
		let teamAWorkflows: WorkflowEntity[];
		let teamBWorkflows: WorkflowEntity[];
		let instanceOwnerWorkflows: WorkflowEntity[];
		let projectAdminWorkflows: WorkflowEntity[];
		let projectMemberWorkflows: WorkflowEntity[];

		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				getGlobalOwner(),
				createMember(),
				createMember(),
				createTeamProject(),
				createTeamProject(),
			]);

			await linkUserToProject(projectAdmin, teamProjectA, 'project:admin');
			await linkUserToProject(projectMember, teamProjectA, 'project:editor');
			await linkUserToProject(projectAdmin, teamProjectB, 'project:editor');
			await linkUserToProject(projectMember, teamProjectB, 'project:editor');

			teamAWorkflows = await Promise.all([
				await createWorkflow({}, teamProjectA),
				await createWorkflow({}, teamProjectA),
				await createWorkflow({}, teamProjectA),
			]);

			teamBWorkflows = await Promise.all([
				await createWorkflow({}, teamProjectB),
				await createWorkflow({}, teamProjectB),
				await createWorkflow({}, teamProjectB),
			]);

			instanceOwnerWorkflows = await Promise.all([
				await createWorkflow({}, instanceOwner),
				await createWorkflow({}, instanceOwner),
				await createWorkflow({}, instanceOwner),
			]);

			projectAdminWorkflows = await Promise.all([
				await createWorkflow({}, projectAdmin),
				await createWorkflow({}, projectAdmin),
				await createWorkflow({}, projectAdmin),
			]);

			projectMemberWorkflows = await Promise.all([
				await createWorkflow({}, projectMember),
				await createWorkflow({}, projectMember),
				await createWorkflow({}, projectMember),
			]);
		});

		describe('if user is an instance owner', () => {
			it('should get all available workflows on the instance', async () => {
				const versions = await service.getLocalVersionIdsFromDb(
					new SourceControlContext(instanceOwner),
				);

				expect(new Set(versions.map((v) => v.id))).toEqual(
					new Set([
						...teamAWorkflows.map((w) => w.id),
						...teamBWorkflows.map((w) => w.id),
						...instanceOwnerWorkflows.map((w) => w.id),
						...projectAdminWorkflows.map((w) => w.id),
						...projectMemberWorkflows.map((w) => w.id),
					]),
				);
			});
		});

		describe('if user is a project admin of a team project', () => {
			it('should only get all available workflows from the team project', async () => {
				const versions = await service.getLocalVersionIdsFromDb(
					new SourceControlContext(projectAdmin),
				);

				expect(new Set(versions.map((v) => v.id))).toEqual(
					new Set([...teamAWorkflows.map((w) => w.id)]),
				);
			});
		});

		describe('if user is a project member of a team project', () => {
			it('should not get any workflows', async () => {
				const versions = await service.getLocalVersionIdsFromDb(
					new SourceControlContext(projectMember),
				);

				expect(versions).toBeEmptyArray();
			});
		});
	});

	describe('getRemoteCredentialsFromFiles()', () => {
		const mockCredential1File = '/mock/credential1.json';
		const mockCredential2File = '/mock/credential2.json';
		const mockCredential3File = '/mock/credential3.json';
		const mockCredential4File = '/mock/credential4.json';
		const mockCredential5File = '/mock/credential5.json';

		const mockCredential1Data: Partial<ExportableCredential> = {
			id: 'credentials1',
			name: 'Test Workflow',
			ownedBy: {
				type: 'personal',
				personalEmail: 'someuser@example.com',
			},
		};
		const mockCredential2Data: Partial<ExportableCredential> = {
			id: 'credentials2',
			name: 'Test Workflow',
			ownedBy: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};
		const mockCredential3Data: Partial<ExportableCredential> = {
			id: 'credentials3',
			name: 'Test Workflow',
			ownedBy: {
				type: 'team',
				teamId: 'team2',
				teamName: 'Team 2',
			},
		};
		const mockCredential4Data: Partial<ExportableCredential> = {
			id: 'credentials4',
			name: 'Test Workflow',
			ownedBy: {
				type: 'personal',
				personalEmail: 'someotheruser@example.com',
			},
		};
		const mockCredential5Data: Partial<ExportableCredential> = {
			id: 'credentials5',
			name: 'Test Workflow',
			ownedBy: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};

		const globMock = fastGlob.default as unknown as jest.Mock<Promise<string[]>, string[]>;
		const fsReadFile = jest.spyOn(fsp, 'readFile');

		let globalAdmin: User;
		let globalOwner: User;
		let globalMember: User;
		let teamAdmin: User;
		let team1: Project;

		beforeAll(async () => {
			[globalAdmin, globalOwner, globalMember, teamAdmin] = await Promise.all([
				createAdmin(),
				createOwner(),
				createMember(),
				createMember(),
			]);

			team1 = await createTeamProject('Team 1', teamAdmin);
		});

		beforeEach(async () => {
			globMock.mockImplementation(async () => [
				mockCredential1File,
				mockCredential2File,
				mockCredential3File,
				mockCredential4File,
				mockCredential5File,
			]);

			fsReadFile.mockImplementation(async (path) => {
				switch (path) {
					case mockCredential1File:
						return JSON.stringify({
							...mockCredential1Data,
							ownedBy: {
								type: 'personal',
								personalEmail: teamAdmin.email,
							},
						});
					case mockCredential2File:
						return JSON.stringify({
							...mockCredential2Data,
							ownedBy: {
								type: 'team',
								teamId: team1.id,
								teamName: team1.name,
							},
						});
					case mockCredential3File:
						return JSON.stringify(mockCredential3Data);
					case mockCredential4File:
						return JSON.stringify(mockCredential4Data);
					case mockCredential5File:
						return JSON.stringify({
							...mockCredential5Data,
							ownedBy: {
								type: 'team',
								teamId: team1.id,
								teamName: team1.name,
							},
						});
				}
				throw new Error(`Trying to access invalid file in test: ${path}`);
			});
		});

		it('should show all remote credentials for instance admins', async () => {
			const result = await service.getRemoteCredentialsFromFiles(
				new SourceControlContext(globalAdmin),
			);

			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set(
					[
						mockCredential1Data,
						mockCredential2Data,
						mockCredential3Data,
						mockCredential4Data,
						mockCredential5Data,
					].map((r) => r.id),
				),
			);
		});

		it('should show all remote credentials for instance owners', async () => {
			const result = await service.getRemoteCredentialsFromFiles(
				new SourceControlContext(globalOwner),
			);

			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set(
					[
						mockCredential1Data,
						mockCredential2Data,
						mockCredential3Data,
						mockCredential4Data,
						mockCredential5Data,
					].map((r) => r.id),
				),
			);
		});

		it('should return no remote credentials for instance members', async () => {
			const result = await service.getRemoteCredentialsFromFiles(
				new SourceControlContext(globalMember),
			);

			expect(result).toBeEmptyArray();
		});

		it('should return only remote credentials that belong to team project', async () => {
			const result = await service.getRemoteCredentialsFromFiles(
				new SourceControlContext(teamAdmin),
			);

			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set([mockCredential2Data, mockCredential5Data].map((r) => r.id)),
			);
		});
	});

	describe('getLocalCredentialsFromDb', () => {
		let instanceOwner: User;
		let projectAdmin: User;
		let projectMember: User;
		let teamProjectA: Project;
		let teamProjectB: Project;
		let teamACredentials: CredentialsEntity[];
		let teamBCredentials: CredentialsEntity[];

		beforeEach(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				getGlobalOwner(),
				createMember(),
				createMember(),
				createTeamProject(),
				createTeamProject(),
			]);

			await linkUserToProject(projectAdmin, teamProjectA, 'project:admin');
			await linkUserToProject(projectMember, teamProjectA, 'project:editor');
			await linkUserToProject(projectAdmin, teamProjectB, 'project:editor');
			await linkUserToProject(projectMember, teamProjectB, 'project:editor');

			teamACredentials = await Promise.all([
				await createCredentials(
					{
						name: 'credential1',
						data: '',
						type: 'test',
					},
					teamProjectA,
				),
				await createCredentials(
					{
						name: 'credential2',
						data: '',
						type: 'test',
					},
					teamProjectA,
				),
				await createCredentials(
					{
						name: 'credential3',
						data: '',
						type: 'test',
					},
					teamProjectA,
				),
			]);

			teamBCredentials = await Promise.all([
				await createCredentials(
					{
						name: 'credential4',
						data: '',
						type: 'test',
					},
					teamProjectB,
				),
				await createCredentials(
					{
						name: 'credential5',
						data: '',
						type: 'test',
					},
					teamProjectB,
				),
				await createCredentials(
					{
						name: 'credential6',
						data: '',
						type: 'test',
					},
					teamProjectB,
				),
			]);
		});

		it('should get all available credentials on the instance, for an instance owner', async () => {
			const versions = await service.getLocalCredentialsFromDb(
				new SourceControlContext(instanceOwner),
			);

			expect(new Set(versions.map((v) => v.id))).toEqual(
				new Set([...teamACredentials.map((w) => w.id), ...teamBCredentials.map((w) => w.id)]),
			);
		});

		it('should only get all available credentials from the team project, for a project admin', async () => {
			const versions = await service.getLocalCredentialsFromDb(
				new SourceControlContext(projectAdmin),
			);

			expect(new Set(versions.map((v) => v.id))).toEqual(
				new Set([...teamACredentials.map((w) => w.id)]),
			);
		});

		it('should not get any workflows, for a project member', async () => {
			const versions = await service.getLocalCredentialsFromDb(
				new SourceControlContext(projectMember),
			);

			expect(versions).toBeEmptyArray();
		});
	});

	describe('getLocalFoldersAndMappingsFromDb()', () => {
		let instanceOwner: User;
		let projectAdmin: User;
		let projectMember: User;
		let teamProjectA: Project;
		let teamProjectB: Project;
		let foldersProjectA: Folder[];
		let foldersProjectB: Folder[];

		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				getGlobalOwner(),
				createMember(),
				createMember(),
				createTeamProject(),
				createTeamProject(),
			]);

			await linkUserToProject(projectAdmin, teamProjectA, 'project:admin');
			await linkUserToProject(projectMember, teamProjectA, 'project:editor');
			await linkUserToProject(projectAdmin, teamProjectB, 'project:editor');
			await linkUserToProject(projectMember, teamProjectB, 'project:editor');

			foldersProjectA = await Promise.all([
				await createFolder(teamProjectA, {
					name: 'folder1',
				}),
				await createFolder(teamProjectA, {
					name: 'folder2',
				}),
				await createFolder(teamProjectA, {
					name: 'folder3',
				}),
			]);

			foldersProjectA.push(
				await createFolder(teamProjectA, {
					name: 'folder1.1',
					parentFolder: foldersProjectA[0],
				}),
			);

			foldersProjectB = await Promise.all([
				await createFolder(teamProjectB, {
					name: 'folder1',
				}),
				await createFolder(teamProjectB, {
					name: 'folder2',
				}),
				await createFolder(teamProjectB, {
					name: 'folder3',
				}),
			]);
		});

		it('should get all available folders on the instance, for an instance owner', async () => {
			const folders = await service.getLocalFoldersAndMappingsFromDb(
				new SourceControlContext(instanceOwner),
			);

			expect(new Set(folders.folders.map((v) => v.id))).toEqual(
				new Set([...foldersProjectA.map((w) => w.id), ...foldersProjectB.map((w) => w.id)]),
			);
		});

		it('should only get all available folders from the team project, for a project admin', async () => {
			const versions = await service.getLocalFoldersAndMappingsFromDb(
				new SourceControlContext(projectAdmin),
			);

			expect(new Set(versions.folders.map((v) => v.id))).toEqual(
				new Set([...foldersProjectA.map((w) => w.id)]),
			);
		});

		it('should not get any folders, for a project member', async () => {
			const versions = await service.getLocalFoldersAndMappingsFromDb(
				new SourceControlContext(projectMember),
			);

			expect(versions.folders).toBeEmptyArray();
		});
	});

	describe('getRemoteTagsAndMappingsFromFile()', () => {
		const mockTagsFile = '/mock/tags.json';

		const mockTagData: {
			tags: Array<{ id: string; name: string }>;
			mappings: Array<{ workflowId: string; tagId: string }>;
		} = {
			tags: [
				{
					id: 'tag1',
					name: 'Tag 1',
				},
				{
					id: 'tag2',
					name: 'Tag 2',
				},
				{
					id: 'tag3',
					name: 'Tag 3',
				},
			],
			mappings: [
				{
					tagId: 'tag1',
					workflowId: 'wf1',
				},
				{
					tagId: 'tag2',
					workflowId: 'wf2',
				},
				{
					tagId: 'tag3',
					workflowId: 'wf3',
				},
				{
					tagId: 'tag1',
					workflowId: 'wf4',
				},
				{
					tagId: 'tag2',
					workflowId: 'wf5',
				},
			],
		};

		const globMock = fastGlob.default as unknown as jest.Mock<Promise<string[]>, string[]>;
		const fsReadFile = jest.spyOn(fsp, 'readFile');

		let globalAdmin: User;
		let globalOwner: User;
		let globalMember: User;
		let teamAdmin: User;
		let team1: Project;
		let team2: Project;
		let workflowTeam1: WorkflowEntity[];

		beforeEach(async () => {
			[globalAdmin, globalOwner, globalMember, teamAdmin] = await Promise.all([
				createAdmin(),
				createOwner(),
				createMember(),
				createMember(),
			]);

			globMock.mockResolvedValue([mockTagsFile]);

			fsReadFile.mockResolvedValue(JSON.stringify(mockTagData));

			[team1, team2] = await Promise.all([
				await createTeamProject('Team 1', teamAdmin),
				await createTeamProject('Team 2'),
			]);

			workflowTeam1 = await Promise.all([
				await createWorkflow(
					{
						id: 'wf1',
						name: 'Workflow 1',
					},
					team1,
				),
				await createWorkflow(
					{
						id: 'wf2',
						name: 'Workflow 2',
					},
					team1,
				),
				await createWorkflow(
					{
						id: 'wf3',
						name: 'Workflow 3',
					},
					team1,
				),
			]);

			await Promise.all([
				await createWorkflow(
					{
						id: 'wf4',
						name: 'Workflow 4',
					},
					team2,
				),
				await createWorkflow(
					{
						id: 'wf5',
						name: 'Workflow 5',
					},
					team2,
				),
				await createWorkflow(
					{
						id: 'wf6',
						name: 'Workflow 6',
					},
					team2,
				),
			]);
		});

		beforeEach(async () => {});

		it('should show all remote tags and all remote mappings for instance admins', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new SourceControlContext(globalAdmin),
			);

			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(new Set(result.mappings)).toEqual(new Set(mockTagData.mappings));
		});

		it('should show all remote tags and all remote mappings for instance owners', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new SourceControlContext(globalOwner),
			);

			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(new Set(result.mappings)).toEqual(new Set(mockTagData.mappings));
		});

		it('should return all remote tags and no remote mappings for instance members', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new SourceControlContext(globalMember),
			);

			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(result.mappings).toBeEmptyArray();
		});

		it('should return all remote tags and only remote mappings for in scope team for team admin', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new SourceControlContext(teamAdmin),
			);

			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(new Set(result.mappings)).toEqual(
				new Set(
					mockTagData.mappings.filter((mapping) =>
						workflowTeam1.some((wf) => wf.id === mapping.workflowId),
					),
				),
			);
		});
	});

	describe('getLocalTagsAndMappingsFromDb()', () => {
		let instanceOwner: User;
		let projectAdmin: User;
		let projectMember: User;
		let teamProjectA: Project;
		let teamProjectB: Project;
		let tags: TagEntity[];
		let workflowsProjectA: WorkflowEntity[];
		let workflowsProjectB: WorkflowEntity[];
		let mappings: Array<[TagEntity, WorkflowEntity]>;

		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				getGlobalOwner(),
				createMember(),
				createMember(),
				createTeamProject(),
				createTeamProject(),
			]);

			await linkUserToProject(projectAdmin, teamProjectA, 'project:admin');
			await linkUserToProject(projectMember, teamProjectA, 'project:editor');
			await linkUserToProject(projectAdmin, teamProjectB, 'project:editor');
			await linkUserToProject(projectMember, teamProjectB, 'project:editor');

			tags = await Promise.all([
				await createTag({
					name: 'tag1',
				}),
				await createTag({
					name: 'tag2',
				}),
				await createTag({
					name: 'tag3',
				}),
			]);

			workflowsProjectA = await Promise.all([
				await createWorkflow(
					{
						id: 'workflow1',
						name: 'Workflow 1',
					},
					teamProjectA,
				),
				await createWorkflow(
					{
						id: 'workflow2',
						name: 'Workflow 2',
					},
					teamProjectA,
				),
				await createWorkflow(
					{
						id: 'workflow3',
						name: 'Workflow 3',
					},
					teamProjectA,
				),
			]);

			workflowsProjectB = await Promise.all([
				await createWorkflow(
					{
						id: 'workflow4',
						name: 'Workflow 4',
					},
					teamProjectB,
				),
				await createWorkflow(
					{
						id: 'workflow5',
						name: 'Workflow 5',
					},
					teamProjectB,
				),
				await createWorkflow(
					{
						id: 'workflow6',
						name: 'Workflow 6',
					},
					teamProjectB,
				),
			]);

			mappings = [
				[tags[0], workflowsProjectA[0]],
				[tags[1], workflowsProjectA[0]],
				[tags[0], workflowsProjectA[1]],
				[tags[0], workflowsProjectB[0]],
				[tags[1], workflowsProjectB[1]],
				[tags[2], workflowsProjectB[2]],
			];

			await Promise.all(
				mappings.map(async ([tag, workflow]) => await assignTagToWorkflow(tag, workflow)),
			);
		});

		it('should get all available tags and mappings on the instance, for an instance owner', async () => {
			const result = await service.getLocalTagsAndMappingsFromDb(
				new SourceControlContext(instanceOwner),
			);

			expect(new Set(result.tags.map((v) => v.id))).toEqual(new Set([...tags.map((w) => w.id)]));
			expect(
				new Set(
					result.mappings.map((m) => {
						return [m.tagId, m.workflowId];
					}),
				),
			).toEqual(
				new Set(
					mappings.map(([tag, workflow]) => {
						return [tag.id, workflow.id];
					}),
				),
			);
		});

		it('should only get all available tags and only mappings from the team project, for a project admin', async () => {
			const result = await service.getLocalTagsAndMappingsFromDb(
				new SourceControlContext(projectAdmin),
			);

			expect(new Set(result.tags.map((v) => v.id))).toEqual(new Set([...tags.map((w) => w.id)]));

			expect(
				new Set(
					result.mappings.map((m) => {
						return [m.tagId, m.workflowId];
					}),
				),
			).toEqual(
				new Set(
					mappings
						.filter((w) => workflowsProjectA.includes(w[1]))
						.map(([tag, workflow]) => {
							return [tag.id, workflow.id];
						}),
				),
			);
		});

		it('should get all available tags but no mappings, for a project member', async () => {
			const result = await service.getLocalTagsAndMappingsFromDb(
				new SourceControlContext(projectMember),
			);

			expect(new Set(result.tags.map((v) => v.id))).toEqual(new Set([...tags.map((w) => w.id)]));

			expect(result.mappings).toBeEmptyArray();
		});
	});

	describe('importCredentialsFromWorkFolder()', () => {
		describe('if user email specified by `ownedBy` exists at target instance', () => {
			it('should assign credential ownership to original user', async () => {
				const [importingUser, member] = await Promise.all([getGlobalOwner(), createMember()]);

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: member.email, // user at source instance owns credential
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const personalProject = await getPersonalProject(member);

				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // same user at target instance owns credential
			});
		});

		describe('if user email specified by `ownedBy` is `null`', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await getGlobalOwner();

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: null,
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const personalProject = await getPersonalProject(importingUser);

				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // original user has no email, so importing user owns credential
			});
		});

		describe('if user email specified by `ownedBy` does not exist at target instance', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await getGlobalOwner();

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: 'user@test.com', // user at source instance owns credential
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const personalProject = await getPersonalProject(importingUser);

				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
			});
		});
	});

	describe('if owner specified by `ownedBy` does not exist at target instance', () => {
		it('should assign the credential ownership to the importing user if it was owned by a personal project in the source instance', async () => {
			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const CREDENTIAL_ID = nanoid();

			const stub: ExportableCredential = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'personal',
					personalEmail: 'test@example.com',
				}, // user at source instance owns credential
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			cipher.encrypt.mockReturnValue('some-encrypted-data');

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
				importingUser.id,
			);

			const personalProject = await getPersonalProject(importingUser);

			const sharing = await sharedCredentialsRepository.findOneBy({
				credentialsId: CREDENTIAL_ID,
				projectId: personalProject.id,
				role: 'credential:owner',
			});

			expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
		});

		it('should create a new team project if the credential was owned by a team project in the source instance', async () => {
			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const CREDENTIAL_ID = nanoid();

			const stub: ExportableCredential = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: '1234-asdf',
					teamName: 'Marketing',
				}, // user at source instance owns credential
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			cipher.encrypt.mockReturnValue('some-encrypted-data');

			{
				const project = await projectRepository.findOne({
					where: [
						{
							id: '1234-asdf',
						},
						{ name: 'Marketing' },
					],
				});

				expect(project?.id).not.toBe('1234-asdf');
				expect(project?.name).not.toBe('Marketing');
			}

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
				importingUser.id,
			);

			const sharing = await sharedCredentialsRepository.findOne({
				where: {
					credentialsId: CREDENTIAL_ID,
					role: 'credential:owner',
				},
				relations: { project: true },
			});

			expect(sharing?.project.id).toBe('1234-asdf');
			expect(sharing?.project.name).toBe('Marketing');
			expect(sharing?.project.type).toBe('team');

			expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
		});
	});

	describe('if owner specified by `ownedBy` does exist at target instance', () => {
		it('should use the existing team project if credential owning project is found', async () => {
			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const CREDENTIAL_ID = nanoid();

			const project = await createTeamProject('Sales');

			const stub: ExportableCredential = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: project.id,
					teamName: 'Sales',
				},
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			cipher.encrypt.mockReturnValue('some-encrypted-data');

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
				importingUser.id,
			);

			const sharing = await sharedCredentialsRepository.findOneBy({
				credentialsId: CREDENTIAL_ID,
				projectId: project.id,
				role: 'credential:owner',
			});

			expect(sharing).toBeTruthy();
		});

		it('should not change the owner if the credential is owned by somebody else on the target instance', async () => {
			cipher.encrypt.mockReturnValue('some-encrypted-data');

			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const targetProject = await createTeamProject('Marketing');
			const credential = await saveCredential(randomCredentialPayload(), {
				project: targetProject,
				role: 'credential:owner',
			});

			const sourceProjectId = nanoid();

			const stub: ExportableCredential = {
				id: credential.id,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: sourceProjectId,
					teamName: 'Sales',
				},
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: credential.id })],
				importingUser.id,
			);

			await expect(
				sharedCredentialsRepository.findBy({
					credentialsId: credential.id,
				}),
			).resolves.toMatchObject([
				{
					projectId: targetProject.id,
					role: 'credential:owner',
				},
			]);
			await expect(
				credentialsRepository.findBy({
					id: credential.id,
				}),
			).resolves.toMatchObject([
				{
					name: stub.name,
					type: stub.type,
					data: 'some-encrypted-data',
				},
			]);
		});
	});
});
