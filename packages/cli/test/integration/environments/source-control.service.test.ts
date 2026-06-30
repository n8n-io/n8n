import type { SourceControlledFile } from '@n8n/api-types';
import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import {
	CredentialsEntity,
	type Folder,
	GLOBAL_ADMIN_ROLE,
	GLOBAL_CHAT_USER_ROLE,
	GLOBAL_MEMBER_ROLE,
	GLOBAL_OWNER_ROLE,
	Project,
	type TagEntity,
	type User,
	WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import * as fastGlob from 'fast-glob';
import { Cipher } from 'n8n-core';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, isAbsolute } from 'node:path';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { DataTable } from '@/modules/data-table/data-table.entity';
import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER,
	SOURCE_CONTROL_FOLDERS_EXPORT_FILE,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from '@/modules/source-control.ee/constants';
import { SourceControlContextFactory } from '@/modules/source-control.ee/source-control-context.factory';
import { SourceControlExportService } from '@/modules/source-control.ee/source-control-export.service.ee';
import type { SourceControlGitService } from '@/modules/source-control.ee/source-control-git.service.ee';
import { SourceControlImportService } from '@/modules/source-control.ee/source-control-import.service.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import { SourceControlStatusService } from '@/modules/source-control.ee/source-control-status.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import type { ExportableCredential } from '@/modules/source-control.ee/types/exportable-credential';
import type { ExportableDataTable } from '@/modules/source-control.ee/types/exportable-data-table';
import type { ExportableFolder } from '@/modules/source-control.ee/types/exportable-folders';
import type { ExportableWorkflow } from '@/modules/source-control.ee/types/exportable-workflow';
import type { RemoteResourceOwner } from '@/modules/source-control.ee/types/resource-owner';
import { createCredentials } from '@test-integration/db/credentials';
import { createDataTable } from '@test-integration/db/data-tables';
import { createFolder } from '@test-integration/db/folders';
import { assignTagToWorkflow, createTag, updateTag } from '@test-integration/db/tags';
import { createUser } from '@test-integration/db/users';

vi.mock('fast-glob');

// `readFile`/`writeFile` are imported as named bindings by the service, which `vi.spyOn` on a
// default/namespace import can't intercept under Vitest. Mock them at the module level and keep
// the other fs/promises exports real.
vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs/promises')>();
	const readFile = vi.fn(actual.readFile);
	const writeFile = vi.fn(actual.writeFile);
	return { ...actual, readFile, writeFile, default: { ...actual, readFile, writeFile } };
});

type Scope = {
	workflows: WorkflowEntity[];
	credentials: CredentialsEntity[];
	dataTables: DataTable[];
	folders: Folder[];
};

let sourceControlPreferencesService: SourceControlPreferencesService;

function toExportableFolder(folder: Folder): ExportableFolder {
	return {
		id: folder.id,
		name: folder.name,
		homeProjectId: folder.homeProject.id,
		parentFolderId: folder.parentFolderId,
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt.toISOString(),
	};
}

function toExportableCredential(
	cred: CredentialsEntity,
	owner: Project | User,
): ExportableCredential {
	let resourceOwner: RemoteResourceOwner;

	if (owner instanceof Project) {
		resourceOwner = {
			type: 'team',
			teamId: owner.id,
			teamName: owner.name,
		};
	} else {
		resourceOwner = {
			type: 'personal',
			personalEmail: owner.email,
		};
	}

	return {
		id: cred.id,
		data: {},
		name: cred.name,
		type: cred.type,
		ownedBy: resourceOwner,
		isGlobal: cred.isGlobal ?? false,
	};
}

function toExportableWorkflow(
	wf: WorkflowEntity,
	owner: Project | User,
	versionId?: string,
): ExportableWorkflow {
	let resourceOwner: RemoteResourceOwner;

	if (owner instanceof Project) {
		resourceOwner = {
			type: 'team',
			teamId: owner.id,
			teamName: owner.name,
		};
	} else {
		resourceOwner = {
			type: 'personal',
			personalEmail: owner.email,
		};
	}

	return {
		id: wf.id,
		name: wf.name,
		connections: wf.connections,
		isArchived: wf.isArchived,
		nodes: wf.nodes,
		owner: resourceOwner,
		triggerCount: wf.triggerCount,
		parentFolderId: null,
		versionId: versionId ?? wf.versionId,
		nodeGroups: wf.nodeGroups ?? [],
	};
}

function toExportableDataTable(table: DataTable, owner: Project | User): ExportableDataTable {
	let resourceOwner: NonNullable<ExportableDataTable['ownedBy']>;

	if (owner instanceof Project) {
		resourceOwner = {
			type: 'team',
			teamId: owner.id,
			teamName: owner.name,
		};
	} else {
		resourceOwner = {
			type: 'personal',
			projectId: owner.id,
			projectName: owner.createPersonalProjectName(),
			personalEmail: owner.email,
		};
	}

	return {
		id: table.id,
		name: table.name,
		columns: (table.columns ?? [])
			.sort((a, b) => a.index - b.index)
			.map((column) => ({
				id: column.id,
				name: column.name,
				type: column.type,
				index: column.index,
			})),
		ownedBy: resourceOwner,
		createdAt: table.createdAt.toISOString(),
		updatedAt: table.updatedAt.toISOString(),
	};
}

describe('SourceControlService', () => {
	/*
			Test scenarios (push):
				1. 	globalAdmin
						sees everything, workflows in different projects, credentials in different projects, tags and mappings in different projects, folders in different projects
				2. 	globalOwner
						same as global Admin
				3.  globalMember
						sees nothing ...
				4. 	projectAdmin (global member)
						sees workflows in his team projects only, credentials in his team projects only, same for mappings and folders, sees all tags
				5.  projectMember
						sees nothing

			Test scenarios (pull):
				TBD!
		*/

	let globalAdmin: User;
	let globalOwner: User;
	let globalMember: User;
	let globalChatUser: User;
	let projectAdmin: User;

	let projectA: Project;
	let projectB: Project;

	let globalAdminScope: Scope;
	let globalOwnerScope: Scope;
	let globalMemberScope: Scope;
	let projectAdminScope: Scope;
	let projectAScope: Scope;
	let projectBScope: Scope;

	let allWorkflows: WorkflowEntity[];
	let tags: TagEntity[];
	let gitFiles: Record<string, unknown>;

	let movedOutOfScopeWorkflow: WorkflowEntity;
	let movedIntoScopeWorkflow: WorkflowEntity;

	let deletedOutOfScopeWorkflow: WorkflowEntity;
	let deletedInScopeWorkflow: WorkflowEntity;

	let movedOutOfScopeCredential: CredentialsEntity;
	let movedIntoScopeCredential: CredentialsEntity;

	let deletedOutOfScopeCredential: CredentialsEntity;
	let deletedInScopeCredential: CredentialsEntity;

	let remoteOutOfScopeDataTable: DataTable;
	let remoteInScopeDataTable: DataTable;

	let gitService: SourceControlGitService;
	let service: SourceControlService;
	let statusService: SourceControlStatusService;

	let cipher: Cipher;

	const globMock = fastGlob.default as unknown as Mock<
		(...args: [fastGlob.Pattern | fastGlob.Pattern[], fastGlob.Options]) => Promise<string[]>
	>;
	const fsReadFile = vi.mocked(readFile);
	const fsWriteFile = vi.mocked(writeFile);

	beforeAll(async () => {
		await testModules.loadModules(['data-table']);
		await testDb.init();

		cipher = Container.get(Cipher);

		sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
		await sourceControlPreferencesService.setPreferences({
			connected: true,
			keyGeneratorType: 'rsa',
		});

		/*
				Set up test conditions:
				5 users:
					globalAdmin
					globalOwner
					globalMember
					globalChatUser
					projectAdmin

				2 Team projects:
					ProjectA (admin == projectAdmin)
					ProjectB

				2 Workflows per Team and User
				2 Credentials per Team
				3 Tags
				Mappings to all workflows
				for each project 3 folders 2 top level, 1 child

				1. Workflow moved in git to other project
			*/

		[globalAdmin, globalOwner, globalMember, projectAdmin, globalChatUser] = await Promise.all([
			createUser({ role: GLOBAL_ADMIN_ROLE }),
			createUser({ role: GLOBAL_OWNER_ROLE }),
			createUser({ role: GLOBAL_MEMBER_ROLE }),
			createUser({ role: GLOBAL_MEMBER_ROLE }),
			createUser({ role: GLOBAL_CHAT_USER_ROLE }),
		]);

		[projectA, projectB] = await Promise.all([
			createTeamProject('ProjectA', projectAdmin),
			createTeamProject('ProjectB'),
		]);

		const [
			globalAdminWorkflows,
			globalOwnerWorkflows,
			globalMemberWorkflows,
			projectAdminWorkflows,
			projectAWorkflows,
			projectBWorkflows,
		] = await Promise.all(
			[globalAdmin, globalOwner, globalMember, projectAdmin, projectA, projectB].map(
				async (owner) => [
					await createWorkflow(
						{
							name: `${owner.id}-WFA`,
						},
						owner,
					),
					await createWorkflow(
						{
							name: `${owner.id}-WFB`,
						},
						owner,
					),
				],
			),
		);

		allWorkflows = [
			...globalAdminWorkflows,
			...globalOwnerWorkflows,
			...globalMemberWorkflows,
			...projectAdminWorkflows,
			...projectAWorkflows,
			...projectBWorkflows,
		];

		deletedOutOfScopeWorkflow = Object.assign(new WorkflowEntity(), {
			id: 'deletedOutOfScope',
			name: 'deletedOutOfScope',
		});

		deletedInScopeWorkflow = Object.assign(new WorkflowEntity(), {
			id: 'deletedInScope',
			name: 'deletedInScope',
		});

		deletedInScopeCredential = Object.assign(new CredentialsEntity(), {
			id: 'deletedInScope',
			name: 'deletedInScope',
			data: cipher.encrypt({}),
			type: '',
		});

		deletedOutOfScopeCredential = Object.assign(new CredentialsEntity(), {
			id: 'deletedOutOfScope',
			name: 'deletedOutOfScope',
			data: cipher.encrypt({}),
			type: '',
		});

		[
			movedOutOfScopeCredential,
			movedIntoScopeCredential,
			movedOutOfScopeWorkflow,
			movedIntoScopeWorkflow,
		] = await Promise.all([
			await createCredentials(
				{
					name: 'OutOfScope',
					data: cipher.encrypt({}),
					type: '',
				},
				projectB,
			),
			await createCredentials(
				{
					name: 'IntoScope',
					data: cipher.encrypt({}),
					type: '',
				},
				projectA,
			),
			await createWorkflow(
				{
					name: 'OutOfScope',
				},
				projectB,
			),
			await createWorkflow(
				{
					name: 'IntoScope',
				},
				projectA,
			),
		]);

		const [projectACredentials, projectBCredentials] = await Promise.all(
			[projectA, projectB].map(async (project) => [
				await createCredentials(
					{
						name: `${project.name}-CredA`,
						data: cipher.encrypt({}),
						type: '',
					},
					project,
				),
				await createCredentials(
					{
						name: `${project.name}-CredB‚`,
						data: cipher.encrypt({}),
						type: '',
					},
					project,
				),
			]),
		);

		const [projectADataTables, projectBDataTables] = await Promise.all(
			[projectA, projectB].map(async (project) => [
				await createDataTable(project, {
					name: `${project.name}-DataTableA`,
					columns: [{ name: 'name', type: 'string' }],
				}),
				await createDataTable(project, {
					name: `${project.name}-DataTableB`,
					columns: [{ name: 'value', type: 'number' }],
				}),
			]),
		);

		const remoteDataTableDate = new Date('2024-01-01T00:00:00.000Z');
		remoteInScopeDataTable = Object.assign(new DataTable(), {
			id: 'remoteInScopeDataTable',
			name: 'Remote In Scope Data Table',
			columns: [],
			project: projectA,
			projectId: projectA.id,
			createdAt: remoteDataTableDate,
			updatedAt: remoteDataTableDate,
		});
		remoteOutOfScopeDataTable = Object.assign(new DataTable(), {
			id: 'remoteOutOfScopeDataTable',
			name: 'Remote Out Of Scope Data Table',
			columns: [],
			project: projectB,
			projectId: projectB.id,
			createdAt: remoteDataTableDate,
			updatedAt: remoteDataTableDate,
		});

		tags = await Promise.all([
			createTag({
				name: 'testTag1',
			}),
			createTag({
				name: 'testTag2',
			}),
			createTag({
				name: 'testTag3',
			}),
		]);

		await Promise.all(
			tags.map(async (tag) => {
				await Promise.all(
					allWorkflows.map(async (workflow) => {
						await assignTagToWorkflow(tag, workflow);
					}),
				);
			}),
		);

		const [projectAFolders, projectBFolders] = await Promise.all(
			[projectA, projectB].map(async (project) => {
				const parent = await createFolder(project, {
					name: `${project.name}-FolderA`,
				});

				return [
					parent,
					await createFolder(project, {
						name: `${project.name}-FolderB`,
					}),
					await createFolder(project, {
						name: `${project.name}-FolderA.1`,
						parentFolder: parent,
					}),
				];
			}),
		);

		globalAdminScope = {
			credentials: [],
			dataTables: [],
			workflows: globalAdminWorkflows,
			folders: [],
		};

		globalOwnerScope = {
			credentials: [],
			dataTables: [],
			workflows: globalOwnerWorkflows,
			folders: [],
		};

		globalMemberScope = {
			credentials: [],
			dataTables: [],
			workflows: globalMemberWorkflows,
			folders: [],
		};

		projectAdminScope = {
			credentials: [],
			dataTables: [],
			workflows: projectAdminWorkflows,
			folders: [],
		};

		projectAScope = {
			credentials: projectACredentials,
			dataTables: projectADataTables,
			folders: projectAFolders,
			workflows: projectAWorkflows,
		};

		projectBScope = {
			credentials: projectBCredentials,
			dataTables: projectBDataTables,
			folders: projectBFolders,
			workflows: projectBWorkflows,
		};

		gitService = mock<SourceControlGitService>();
		statusService = Container.get(SourceControlStatusService);

		service = new SourceControlService(
			mock(),
			gitService,
			sourceControlPreferencesService,
			Container.get(SourceControlExportService),
			Container.get(SourceControlImportService),
			Container.get(SourceControlContextFactory),
			Container.get(SourceControlScopedService),
			Container.get(EventService),
			statusService,
		);

		// Skip actual git operations
		service.sanityCheck = async () => {};
		statusService['resetWorkfolder'] = async () => undefined;
		(statusService as any).gitService = gitService;
		(gitService.getHistoricallyTrackedFiles as Mock).mockResolvedValue(new Set<string>());

		// Git mocking
		gitFiles = {
			'workflows/deletedOutOfScope.json': toExportableWorkflow(deletedOutOfScopeWorkflow, projectB),
			'workflows/deletedInScope.json': toExportableWorkflow(deletedInScopeWorkflow, projectA),
			'workflows/globalAdminWFA.json': toExportableWorkflow(globalAdminWorkflows[0], globalAdmin),
			'workflows/globalOwnerWFA.json': toExportableWorkflow(globalOwnerWorkflows[0], globalOwner),
			'workflows/globalMemberWFA.json': toExportableWorkflow(
				globalMemberWorkflows[0],
				globalMember,
			),
			'workflows/projectAdminWFA.json': toExportableWorkflow(
				projectAdminWorkflows[0],
				projectAdmin,
			),
			'workflows/projectAWFA.json': toExportableWorkflow(projectAWorkflows[0], projectA),
			'workflows/projectBWFA.json': toExportableWorkflow(projectBWorkflows[0], projectB),
			'workflows/outofscope.json': toExportableWorkflow(
				movedOutOfScopeWorkflow,
				projectA,
				'otherID',
			),
			'workflows/intoscope.json': toExportableWorkflow(movedIntoScopeWorkflow, projectB, 'otherID'),
			'credential_stubs/AcredA.json': toExportableCredential(projectACredentials[0], projectA),
			'credential_stubs/BcredA.json': toExportableCredential(projectBCredentials[0], projectB),
			'credential_stubs/movedOutOfScopeCred.json': toExportableCredential(
				movedOutOfScopeCredential,
				projectB,
			),
			'credential_stubs/movedIntoScopeCred.json': toExportableCredential(
				movedIntoScopeCredential,
				projectA,
			),
			'credential_stubs/deletedOutOfScopeCred.json': toExportableCredential(
				deletedOutOfScopeCredential,
				projectB,
			),
			'credential_stubs/deletedIntoScopeCred.json': toExportableCredential(
				deletedInScopeCredential,
				projectA,
			),
			'datatables/remoteInScopeDataTable.json': toExportableDataTable(
				remoteInScopeDataTable,
				projectA,
			),
			'datatables/remoteOutOfScopeDataTable.json': toExportableDataTable(
				remoteOutOfScopeDataTable,
				projectB,
			),
			'folders.json': {
				folders: [toExportableFolder(projectAFolders[0]), toExportableFolder(projectBFolders[0])],
			},
			'tags.json': {
				tags: tags.map((t) => {
					return {
						id: t.id,
						name: t.name,
					};
				}),
				mappings: [
					...globalAdminWorkflows.map((m) => {
						return {
							workflowId: m.id,
							tagId: tags[0].id,
						};
					}),
				],
			},
		};

		globMock.mockImplementation(async (path, opts) => {
			if (opts.cwd?.endsWith(SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER)) {
				// asking for workflows
				return Object.keys(gitFiles).filter((file) =>
					file.startsWith(SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER),
				);
			} else if (opts.cwd?.endsWith(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER)) {
				// asking for credentials
				return Object.keys(gitFiles).filter((file) =>
					file.startsWith(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER),
				);
			} else if (opts.cwd?.endsWith(SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER)) {
				// asking for data tables
				return Object.keys(gitFiles).filter((file) =>
					file.startsWith(SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER),
				);
			} else if (path === SOURCE_CONTROL_FOLDERS_EXPORT_FILE) {
				// asking for folders
				return ['folders.json'];
			} else if (path === SOURCE_CONTROL_TAGS_EXPORT_FILE) {
				// asking for folders
				return ['tags.json'];
			}

			return [];
		});

		fsReadFile.mockImplementation(async (path) => {
			const pathStr = String(path);
			const pathWithoutCwd = isAbsolute(pathStr) ? basename(pathStr) : pathStr;
			return JSON.stringify(gitFiles[pathWithoutCwd]);
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getStatus', () => {
		describe('direction: push', () => {
			describe('global:admin user', () => {
				it('should see all workflows', async () => {
					const result = await service.getStatus(globalAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					// not existing in get status response
					const notExisting = result.filter((wf) => {
						return [
							globalAdminScope.workflows[0],
							globalOwnerScope.workflows[0],
							globalMemberScope.workflows[0],
							projectAdminScope.workflows[0],
							projectAScope.workflows[0],
							projectBScope.workflows[0],
						]
							.map((wf) => wf.id)
							.some((id) => wf.id === id);
					});

					expect(notExisting).toBeEmptyArray();

					const deletedWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'deleted',
					);

					// The created workflows‚
					expect(new Set(deletedWorkflows.map((wf) => wf.id))).toEqual(
						new Set([deletedOutOfScopeWorkflow.id, deletedInScopeWorkflow.id]),
					);

					const newWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'created',
					);

					// The created workflows‚
					expect(new Set(newWorkflows.map((wf) => wf.id))).toEqual(
						new Set([
							globalAdminScope.workflows[1].id,
							globalOwnerScope.workflows[1].id,
							globalMemberScope.workflows[1].id,
							projectAdminScope.workflows[1].id,
							projectAScope.workflows[1].id,
							projectBScope.workflows[1].id,
						]),
					);

					const modifiedWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'modified',
					);

					// The modified workflows‚
					expect(new Set(modifiedWorkflows.map((wf) => wf.id))).toEqual(
						new Set([movedOutOfScopeWorkflow.id, movedIntoScopeWorkflow.id]),
					);
				});

				it('should see all credentials', async () => {
					const result = await service.getStatus(globalAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const newCredentials = result.filter(
						(r) => r.type === 'credential' && r.status === 'created',
					);
					const deletedCredentials = result.filter(
						(r) => r.type === 'credential' && r.status === 'deleted',
					);
					const modifiedCredentials = result.filter(
						(r) => r.type === 'credential' && r.status === 'modified',
					);

					expect(new Set(newCredentials.map((c) => c.id))).toEqual(
						new Set([projectAScope.credentials[1].id, projectBScope.credentials[1].id]),
					);

					expect(new Set(deletedCredentials.map((c) => c.id))).toEqual(
						new Set([deletedInScopeCredential.id, deletedOutOfScopeCredential.id]),
					);

					expect(modifiedCredentials).toBeEmptyArray();

					// Make sure we checked all credential entries!
					expect(result.filter((r) => r.type === 'credential')).toHaveLength(4);
				});

				it('should see all folder', async () => {
					const result = await service.getStatus(globalAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const folders = result.filter((r) => r.type === 'folders');

					expect(new Set(folders.map((f) => f.id))).toEqual(
						new Set([
							projectAScope.folders[1].id,
							projectAScope.folders[2].id,
							projectBScope.folders[1].id,
							projectBScope.folders[2].id,
						]),
					);
				});

				it('should see all data tables', async () => {
					const result = await service.getStatus(globalAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const dataTables = result.filter((r) => r.type === 'datatable' && r.status === 'created');

					expect(new Set(dataTables.map((dataTable) => dataTable.id))).toEqual(
						new Set([
							...projectAScope.dataTables.map((dataTable) => dataTable.id),
							...projectBScope.dataTables.map((dataTable) => dataTable.id),
						]),
					);
				});
			});

			describe('global:member user', () => {
				it('should not be allowed to get push status', async () => {
					await expect(
						service.getStatus(globalMember, {
							direction: 'push',
							preferLocalVersion: true,
							verbose: false,
						}),
					).rejects.toThrow(ForbiddenError);
				});
			});

			describe('global:chatUser user', () => {
				it('should not be allowed to get push status', async () => {
					await expect(
						service.getStatus(globalChatUser, {
							direction: 'push',
							preferLocalVersion: true,
							verbose: false,
						}),
					).rejects.toThrow(ForbiddenError);
				});
			});

			describe('project:Admin user', () => {
				it('should see only workflows in correct scope', async () => {
					const result = await service.getStatus(projectAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					// not existing in get status response
					const notExisting = result.filter((wf) => {
						return [
							globalAdminScope.workflows[0],
							globalOwnerScope.workflows[0],
							globalMemberScope.workflows[0],
							projectAdminScope.workflows[0],
							globalAdminScope.workflows[1],
							globalOwnerScope.workflows[1],
							globalMemberScope.workflows[1],
							projectAdminScope.workflows[1],
							projectAScope.workflows[0],
							projectBScope.workflows[0],
							movedOutOfScopeWorkflow,
						]
							.map((wf) => wf.id)
							.some((id) => wf.id === id);
					});

					expect(notExisting).toBeEmptyArray();

					const deletedWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'deleted',
					);

					// The created workflows‚
					expect(new Set(deletedWorkflows.map((wf) => wf.id))).toEqual(
						new Set([deletedInScopeWorkflow.id]),
					);

					const newWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'created',
					);

					// The created workflows‚
					expect(new Set(newWorkflows.map((wf) => wf.id))).toEqual(
						new Set([projectAScope.workflows[1].id, movedIntoScopeWorkflow.id]),
					);

					const modifiedWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'modified',
					);

					// No modified workflows‚
					expect(modifiedWorkflows).toBeEmptyArray();
				});

				it('should see only credentials in correct scope', async () => {
					const result = await service.getStatus(projectAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const newCredentials = result.filter(
						(r) => r.type === 'credential' && r.status === 'created',
					);
					const deletedCredentials = result.filter(
						(r) => r.type === 'credential' && r.status === 'deleted',
					);
					const modifiedCredentials = result.filter(
						(r) => r.type === 'credential' && r.status === 'modified',
					);

					expect(new Set(newCredentials.map((c) => c.id))).toEqual(
						new Set([projectAScope.credentials[1].id]),
					);

					expect(new Set(deletedCredentials.map((c) => c.id))).toEqual(
						new Set([deletedInScopeCredential.id]),
					);

					expect(modifiedCredentials).toBeEmptyArray();

					// Make sure we checked all credential entries!
					expect(result.filter((r) => r.type === 'credential')).toHaveLength(2);
				});

				it('should see only folders in correct scope', async () => {
					const result = await service.getStatus(projectAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const folders = result.filter((r) => r.type === 'folders');

					expect(new Set(folders.map((f) => f.id))).toEqual(
						new Set([projectAScope.folders[1].id, projectAScope.folders[2].id]),
					);
				});

				it('should see only data tables in correct scope', async () => {
					const result = await service.getStatus(projectAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const dataTables = result.filter((r) => r.type === 'datatable');

					expect(new Set(dataTables.map((dataTable) => dataTable.id))).toEqual(
						new Set(projectAScope.dataTables.map((dataTable) => dataTable.id)),
					);
					expect(dataTables.every((dataTable) => dataTable.status === 'created')).toBe(true);
					expect(
						dataTables.some((dataTable) =>
							projectBScope.dataTables.some((outOfScope) => outOfScope.id === dataTable.id),
						),
					).toBe(false);
				});
			});
		});

		describe('remote data tables', () => {
			describe('project:Admin user', () => {
				it('should see only tracked remote data tables in correct scope', async () => {
					(gitService.getHistoricallyTrackedFiles as Mock).mockResolvedValueOnce(
						new Set([
							`${SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER}/${remoteInScopeDataTable.id}.json`,
							`${SOURCE_CONTROL_DATATABLES_EXPORT_FOLDER}/${remoteOutOfScopeDataTable.id}.json`,
						]),
					);

					const result = await service.getStatus(projectAdmin, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(Array.isArray(result)).toBe(true);

					if (!Array.isArray(result)) {
						throw new Error('Cannot reach this, only needed as type guard');
					}

					const dataTables = result.filter((r) => r.type === 'datatable');

					expect(dataTables).toHaveLength(projectAScope.dataTables.length + 1);
					expect(dataTables).toContainEqual(
						expect.objectContaining({
							id: remoteInScopeDataTable.id,
							type: 'datatable',
							status: 'deleted',
						}),
					);
					expect(dataTables).not.toContainEqual(
						expect.objectContaining({
							id: remoteOutOfScopeDataTable.id,
						}),
					);
				});
			});
		});
	});

	describe('pushWorkfolder', () => {
		const updatedFiles: Record<string, string> = {};
		beforeAll(async () => {
			// Reset the git service mock for tags
			gitFiles['tags.json'] = {
				tags: [],
				mappings: [],
			};
		});

		beforeEach(() => {
			fsWriteFile.mockImplementation(async (path, data) => {
				updatedFiles[path as string] = data as string;
			});
		});

		afterEach(() => {
			fsWriteFile.mockReset();
			for (const key in updatedFiles) {
				delete updatedFiles[key];
			}
		});

		describe('on readonly instance', () => {
			beforeAll(async () => {
				await sourceControlPreferencesService.setPreferences({
					connected: true,
					keyGeneratorType: 'rsa',
					branchReadOnly: true,
				});
			});

			afterAll(async () => {
				await sourceControlPreferencesService.setPreferences({
					connected: true,
					keyGeneratorType: 'rsa',
					branchReadOnly: false,
				});
			});

			it('should fail with BadRequest', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				await expect(
					service.pushWorkfolder(globalMember, {
						fileNames: allChanges,
						commitMessage: 'Test',
					}),
				).rejects.toThrowError(BadRequestError);
			});
		});

		describe('global:admin user', () => {
			it('should update all workflows, credentials, data tables, tags and folder', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				const result = await service.pushWorkfolder(globalAdmin, {
					fileNames: allChanges,
					commitMessage: 'Test',
					force: true,
				});

				const workflowFiles = result.statusResult
					.filter((change) => change.type === 'workflow' && change.status !== 'deleted')
					.map((change) => change.file);
				const credentialFiles = result.statusResult
					.filter((change) => change.type === 'credential' && change.status !== 'deleted')
					.map((change) => change.file);

				const projectFiles = result.statusResult
					.filter((change) => change.type === 'project' && change.status !== 'deleted')
					.map((change) => change.file);
				const dataTableFiles = result.statusResult
					.filter((change) => change.type === 'datatable' && change.status !== 'deleted')
					.map((change) => change.file);

				expect(workflowFiles).toHaveLength(8);
				expect(credentialFiles).toHaveLength(2);
				expect(projectFiles).toHaveLength(2);
				expect(dataTableFiles).toHaveLength(4);

				expect(gitService.push).toBeCalled();
				expect(fsWriteFile).toBeCalledTimes(
					workflowFiles.length +
						credentialFiles.length +
						projectFiles.length +
						dataTableFiles.length +
						2,
				); // folders + tags
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(workflowFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(credentialFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(dataTableFiles));
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([expect.stringMatching(SOURCE_CONTROL_FOLDERS_EXPORT_FILE)]),
				);
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([expect.stringMatching(SOURCE_CONTROL_TAGS_EXPORT_FILE)]),
				);
			});

			it('should update all workflows and credentials without arguments', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				const result = await service.pushWorkfolder(globalAdmin, {
					fileNames: [],
					commitMessage: 'Test',
					force: true,
				});

				const workflowFiles = result.statusResult
					.filter((change) => change.type === 'workflow' && change.status !== 'deleted')
					.map((change) => change.file);
				const credentialFiles = result.statusResult
					.filter((change) => change.type === 'credential' && change.status !== 'deleted')
					.map((change) => change.file);
				const projectFiles = result.statusResult
					.filter((change) => change.type === 'project' && change.status !== 'deleted')
					.map((change) => change.file);
				const dataTableFiles = result.statusResult
					.filter((change) => change.type === 'datatable' && change.status !== 'deleted')
					.map((change) => change.file);

				expect(workflowFiles).toHaveLength(8);
				expect(credentialFiles).toHaveLength(2);
				expect(projectFiles).toHaveLength(2);
				expect(dataTableFiles).toHaveLength(4);
				const numberFilesToWrite =
					workflowFiles.length +
					credentialFiles.length +
					projectFiles.length +
					dataTableFiles.length +
					2; // folders + tags

				const filesToWrite =
					allChanges.filter(
						(change) =>
							(change.type === 'workflow' ||
								change.type === 'credential' ||
								change.type === 'project' ||
								change.type === 'datatable') &&
							change.status !== 'deleted',
					).length + 2; // folders + tags

				expect(numberFilesToWrite).toBe(filesToWrite);
				expect(fsWriteFile).toBeCalledTimes(filesToWrite);

				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(workflowFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(credentialFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(projectFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(dataTableFiles));
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([expect.stringMatching(SOURCE_CONTROL_FOLDERS_EXPORT_FILE)]),
				);
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([expect.stringMatching(SOURCE_CONTROL_TAGS_EXPORT_FILE)]),
				);

				const tagFile = result.statusResult.find(
					(change) => change.type === 'tags' && change.status !== 'deleted',
				);
				const tagsFile = JSON.parse(updatedFiles[tagFile!.file]);
				expect(tagsFile.mappings).toHaveLength(
					allWorkflows.length * tags.length, // all workflows have all tags assigned
				);
			});
		});

		describe('project:admin', () => {
			it('should update selected workflows, credentials, data tables, tags and folders', async () => {
				const allChanges = (await service.getStatus(projectAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				const result = await service.pushWorkfolder(projectAdmin, {
					fileNames: allChanges,
					commitMessage: 'Test',
					force: true,
				});

				const workflowFiles = result.statusResult
					.filter((change) => change.type === 'workflow' && change.status !== 'deleted')
					.map((change) => change.file);
				const credentialFiles = result.statusResult
					.filter((change) => change.type === 'credential' && change.status !== 'deleted')
					.map((change) => change.file);
				const projectFiles = result.statusResult
					.filter((change) => change.type === 'project' && change.status !== 'deleted')
					.map((change) => change.file);
				const dataTableFiles = result.statusResult
					.filter((change) => change.type === 'datatable' && change.status !== 'deleted')
					.map((change) => change.file);

				expect(workflowFiles).toHaveLength(2);
				expect(credentialFiles).toHaveLength(1);
				expect(projectFiles).toHaveLength(1);
				expect(dataTableFiles).toHaveLength(2);

				// folders + tags
				expect(fsWriteFile).toBeCalledTimes(
					workflowFiles.length +
						credentialFiles.length +
						projectFiles.length +
						dataTableFiles.length +
						2,
				);
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(workflowFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(credentialFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(dataTableFiles));
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([expect.stringMatching(SOURCE_CONTROL_FOLDERS_EXPORT_FILE)]),
				);
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([expect.stringMatching(SOURCE_CONTROL_TAGS_EXPORT_FILE)]),
				);
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(projectFiles));
			});

			it('should throw ForbiddenError when trying to push workflows out of scope', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				const workflowOutOfScope = allChanges.find(
					(wf) =>
						wf.type === 'workflow' && !projectAdminScope.workflows.some((w) => w.id === wf.id),
				);

				await expect(
					service.pushWorkfolder(projectAdmin, {
						fileNames: [workflowOutOfScope!],
						commitMessage: 'Test',
						force: true,
					}),
				).rejects.toThrowError(ForbiddenError);
			});

			it('should throw ForbiddenError when trying to push credentials out of scope', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				const credentialOutOfScope = allChanges.find(
					(cred) =>
						cred.type === 'credential' &&
						!projectAdminScope.credentials.some((c) => c.id === cred.id),
				);

				await expect(
					service.pushWorkfolder(projectAdmin, {
						fileNames: [credentialOutOfScope!],
						commitMessage: 'Test',
						force: true,
					}),
				).rejects.toThrowError(ForbiddenError);
			});

			it('should update tag mappings in scope and keep out of scope ones', async () => {
				// Reset the git service mock for tags
				gitFiles['tags.json'] = {
					tags: tags.map((t) => ({
						id: t.id,
						name: t.name,
					})),
					mappings: allWorkflows.map((wf) => ({
						workflowId: wf.id,
						tagId: tags[0].id,
					})),
				};

				// Update a tag name
				await updateTag(tags[0], { name: 'updatedTag1' });

				// Add a new tag to newly assigned workflow
				await assignTagToWorkflow(tags[1], movedIntoScopeWorkflow);

				const allChanges = (await service.getStatus(projectAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];
				const tagsFile = allChanges.find((file) =>
					file.file.includes(SOURCE_CONTROL_TAGS_EXPORT_FILE),
				);
				expect(tagsFile).toBeDefined();

				const result = await service.pushWorkfolder(projectAdmin, {
					fileNames: [tagsFile!],
					commitMessage: 'Test',
					force: true,
				});
				expect(result.statusResult).toHaveLength(1);
				expect(result.statusResult[0].type).toBe('tags');
				expect(result.statusResult[0].status).toBe('modified');
				expect(result.statusResult[0].file).toContain(SOURCE_CONTROL_TAGS_EXPORT_FILE);

				const tagsFileContent = JSON.parse(updatedFiles[result.statusResult[0].file]);
				expect(tagsFileContent.tags).toHaveLength(3);
				expect(tagsFileContent.tags.find((t: any) => t.id === tags[0].id).name).toBe('updatedTag1'); // updated tag name
				// all workflows have all 1 tag assigned on git files
				// + 2 new mapping for project A workflows
				// + 1 new mapping for moved into scope workflow
				expect(tagsFileContent.mappings).toHaveLength(allWorkflows.length + 2 * 2 + 1);
			});

			it('should update folders in scope and keep out of scope ones', async () => {
				const allChanges = (await service.getStatus(projectAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];
				const foldersFile = allChanges.find((file) =>
					file.file.includes(SOURCE_CONTROL_FOLDERS_EXPORT_FILE),
				);
				expect(foldersFile).toBeDefined();

				const result = await service.pushWorkfolder(projectAdmin, {
					fileNames: [foldersFile!],
					commitMessage: 'Test',
					force: true,
				});
				expect(result.statusResult).toHaveLength(1);
				expect(result.statusResult[0].type).toBe('folders');
				expect(result.statusResult[0].status).toBe('created');
				expect(result.statusResult[0].file).toContain(SOURCE_CONTROL_FOLDERS_EXPORT_FILE);

				const foldersFileContent = JSON.parse(updatedFiles[result.statusResult[0].file]);
				expect(foldersFileContent.folders).toHaveLength(4);

				// We make sure that we still hold the folder that belongs to project B
				// to which this user doesn't have access
				expect(
					foldersFileContent.folders.find((t: any) => t.homeProjectId === projectB.id).id,
				).toBe(projectBScope.folders[0].id);

				// Ensure that all folders from project A are written to the git file
				expect(foldersFileContent.folders.map((f: any) => f.id)).toEqual(
					expect.arrayContaining(projectAScope.folders.map((f) => f.id)),
				);
			});
		});

		describe('global:member', () => {
			it('should deny all changes', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				await expect(
					service.pushWorkfolder(globalMember, {
						fileNames: allChanges,
						commitMessage: 'Test',
					}),
				).rejects.toThrowError(ForbiddenError);
			});

			it('should deny any changes', async () => {
				const allChanges = (await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				})) as SourceControlledFile[];

				await expect(
					service.pushWorkfolder(globalMember, {
						fileNames: [allChanges[0]],
						commitMessage: 'Test',
					}),
				).rejects.toThrowError(ForbiddenError);
			});
		});
	});

	describe('isGlobal flag modification detection', () => {
		let testGlobalOwner: User;
		let testProject: Project;

		beforeAll(async () => {
			testGlobalOwner = await createUser({ role: GLOBAL_OWNER_ROLE });
			testProject = await createTeamProject('TestProjectForGlobal', testGlobalOwner);
		});

		afterEach(() => {
			globMock.mockClear();
			fsReadFile.mockClear();
		});

		const setupMocksForCredential = (
			credential: CredentialsEntity,
			remoteCredential: ExportableCredential,
		) => {
			const testGitFiles = {
				[`${SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER}/${credential.id}.json`]: remoteCredential,
				[SOURCE_CONTROL_TAGS_EXPORT_FILE]: { tags: [], mappings: [] },
				[SOURCE_CONTROL_FOLDERS_EXPORT_FILE]: { folders: [] },
			};

			globMock.mockImplementation(async (path, opts) => {
				if (opts.cwd?.endsWith(SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER)) {
					return [];
				} else if (opts.cwd?.endsWith(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER)) {
					return Object.keys(testGitFiles).filter((file) =>
						file.startsWith(SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER),
					);
				} else if (path === SOURCE_CONTROL_FOLDERS_EXPORT_FILE) {
					return [SOURCE_CONTROL_FOLDERS_EXPORT_FILE];
				} else if (path === SOURCE_CONTROL_TAGS_EXPORT_FILE) {
					return [SOURCE_CONTROL_TAGS_EXPORT_FILE];
				}
				return [];
			});

			fsReadFile.mockImplementation(async (file) => {
				const fileName = basename(file as string);
				const fullPath = Object.keys(testGitFiles).find((key) => key.endsWith(fileName));
				if (fullPath) {
					return Buffer.from(JSON.stringify(testGitFiles[fullPath]));
				}
				return Buffer.from('{}');
			});
		};

		it('should detect credential as modified when isGlobal changes from false to true', async () => {
			// Create a test credential with isGlobal: false
			const credential = await createCredentials(
				{
					name: 'Test Credential isGlobal false->true',
					type: 'testType',
					data: cipher.encrypt({}),
					isGlobal: false,
				},
				testProject,
			);

			// Setup: Mock remote credential with isGlobal: true
			const remoteCredential = toExportableCredential(credential, testProject);
			remoteCredential.isGlobal = true;
			setupMocksForCredential(credential, remoteCredential);

			// Act
			const result = (await service.getStatus(testGlobalOwner, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			})) as SourceControlledFile[];

			// Assert
			const modifiedCredentials = result.filter(
				(r: SourceControlledFile) => r.type === 'credential' && r.status === 'modified',
			);

			expect(modifiedCredentials.some((c) => c.id === credential.id)).toBe(true);
		});

		it('should detect credential as modified when isGlobal changes from true to false', async () => {
			const credential = await createCredentials(
				{
					name: 'Test Credential isGlobal true->false',
					type: 'testType',
					data: cipher.encrypt({}),
					isGlobal: true,
				},
				testProject,
			);

			const remoteCredential = toExportableCredential(credential, testProject);
			remoteCredential.isGlobal = false;
			setupMocksForCredential(credential, remoteCredential);

			const result = (await service.getStatus(testGlobalOwner, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			})) as SourceControlledFile[];

			const modifiedCredentials = result.filter(
				(r: SourceControlledFile) => r.type === 'credential' && r.status === 'modified',
			);

			expect(modifiedCredentials.some((c) => c.id === credential.id)).toBe(true);
		});

		it('should NOT detect credential as modified when isGlobal is undefined vs false', async () => {
			const credential = await createCredentials(
				{
					name: 'Test Credential isGlobal undefined vs false',
					type: 'testType',
					data: cipher.encrypt({}),
					isGlobal: false,
				},
				testProject,
			);

			const remoteCredential = toExportableCredential(credential, testProject);
			delete remoteCredential.isGlobal;
			setupMocksForCredential(credential, remoteCredential);

			const result = (await service.getStatus(testGlobalOwner, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			})) as SourceControlledFile[];

			const modifiedCredentials = result.filter(
				(r: SourceControlledFile) => r.type === 'credential' && r.status === 'modified',
			);

			expect(modifiedCredentials.some((c) => c.id === credential.id)).toBe(false);
		});

		it('should detect credential as modified when isGlobal changes from undefined to true', async () => {
			const credential = await createCredentials(
				{
					name: 'Test Credential isGlobal undefined->true',
					type: 'testType',
					data: cipher.encrypt({}),
					isGlobal: false,
				},
				testProject,
			);

			const remoteCredential = toExportableCredential(credential, testProject);
			remoteCredential.isGlobal = true;
			setupMocksForCredential(credential, remoteCredential);

			const result = (await service.getStatus(testGlobalOwner, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			})) as SourceControlledFile[];

			const modifiedCredentials = result.filter(
				(r: SourceControlledFile) => r.type === 'credential' && r.status === 'modified',
			);

			expect(modifiedCredentials.some((c) => c.id === credential.id)).toBe(true);
		});

		it('should NOT detect credential as modified when isGlobal is the same', async () => {
			const credential = await createCredentials(
				{
					name: 'Test Credential isGlobal same value',
					type: 'testType',
					data: cipher.encrypt({}),
					isGlobal: true,
				},
				testProject,
			);

			const remoteCredential = toExportableCredential(credential, testProject);
			remoteCredential.isGlobal = true;
			setupMocksForCredential(credential, remoteCredential);

			const result = (await service.getStatus(testGlobalOwner, {
				direction: 'push',
				preferLocalVersion: true,
				verbose: false,
			})) as SourceControlledFile[];

			const modifiedCredentials = result.filter(
				(r: SourceControlledFile) => r.type === 'credential' && r.status === 'modified',
			);

			expect(modifiedCredentials.some((c) => c.id === credential.id)).toBe(false);
		});
	});
});
