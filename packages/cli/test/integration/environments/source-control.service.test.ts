import {
	CredentialsEntity,
	type Folder,
	Project,
	type TagEntity,
	type User,
	WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import * as fastGlob from 'fast-glob';
import fsp from 'node:fs/promises';

import {
	SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER,
	SOURCE_CONTROL_FOLDERS_EXPORT_FILE,
	SOURCE_CONTROL_TAGS_EXPORT_FILE,
	SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER,
} from '@/environments.ee/source-control/constants';
import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import type { ExportableCredential } from '@/environments.ee/source-control/types/exportable-credential';
import type { ExportableFolder } from '@/environments.ee/source-control/types/exportable-folders';
import type { ExportableWorkflow } from '@/environments.ee/source-control/types/exportable-workflow';
import type { ResourceOwner } from '@/environments.ee/source-control/types/resource-owner';
import { createCredentials } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createTeamProject } from '@test-integration/db/projects';
import { assignTagToWorkflow, createTag } from '@test-integration/db/tags';
import { createUser } from '@test-integration/db/users';
import { createWorkflow } from '@test-integration/db/workflows';

import * as testDb from '../shared/test-db';

jest.mock('fast-glob');

type Scope = {
	workflows: WorkflowEntity[];
	credentials: CredentialsEntity[];
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
	let resourceOwner: ResourceOwner;

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
	};
}

function toExportableWorkflow(
	wf: WorkflowEntity,
	owner: Project | User,
	versionId?: string,
): ExportableWorkflow {
	let resourceOwner: ResourceOwner;

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
	};
}

describe('SourceControlService', () => {
	beforeAll(async () => {
		await testDb.init();

		sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
		await sourceControlPreferencesService.setPreferences({
			connected: true,
			keyGeneratorType: 'rsa',
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getStatus', () => {
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

		let service: SourceControlService;

		const globMock = fastGlob.default as unknown as jest.Mock<
			Promise<string[]>,
			[fastGlob.Pattern | fastGlob.Pattern[], fastGlob.Options]
		>;
		const fsReadFile = jest.spyOn(fsp, 'readFile');

		beforeAll(async () => {
			/*
				Set up test conditions:
				4 users:
					globalAdmin
					globalOwner
					globalMember
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

			[globalAdmin, globalOwner, globalMember, projectAdmin] = await Promise.all([
				await createUser({ role: 'global:admin' }),
				await createUser({ role: 'global:owner' }),
				await createUser({ role: 'global:member' }),
				await createUser({ role: 'global:member' }),
			]);

			[projectA, projectB] = await Promise.all([
				createTeamProject('ProjectA', projectAdmin),
				createTeamProject('ProjectB'),
			]);

			let [
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
				data: '',
				type: '',
			});

			deletedOutOfScopeCredential = Object.assign(new CredentialsEntity(), {
				id: 'deletedOutOfScope',
				name: 'deletedOutOfScope',
				data: '',
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
						data: '',
						type: '',
					},
					projectB,
				),
				await createCredentials(
					{
						name: 'IntoScope',
						data: '',
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

			let [projectACredentials, projectBCredentials] = await Promise.all(
				[projectA, projectB].map(async (project) => [
					await createCredentials(
						{
							name: `${project.name}-CredA`,
							data: '',
							type: '',
						},
						project,
					),
					await createCredentials(
						{
							name: `${project.name}-CredB‚`,
							data: '',
							type: '',
						},
						project,
					),
				]),
			);

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

			let [projectAFolders, projectBFolders] = await Promise.all(
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
				workflows: globalAdminWorkflows,
				folders: [],
			};

			globalOwnerScope = {
				credentials: [],
				workflows: globalOwnerWorkflows,
				folders: [],
			};

			globalMemberScope = {
				credentials: [],
				workflows: globalMemberWorkflows,
				folders: [],
			};

			projectAdminScope = {
				credentials: [],
				workflows: projectAdminWorkflows,
				folders: [],
			};

			projectAScope = {
				credentials: projectACredentials,
				folders: projectAFolders,
				workflows: projectAWorkflows,
			};

			projectBScope = {
				credentials: projectBCredentials,
				folders: projectBFolders,
				workflows: projectBWorkflows,
			};

			service = Container.get(SourceControlService);

			// Skip actual git operations
			service.sanityCheck = async () => {};
			service.resetWorkfolder = async () => undefined;

			// Git mocking
			gitFiles = {
				'workflows/deletedOutOfScope.json': toExportableWorkflow(
					deletedOutOfScopeWorkflow,
					projectB,
				),
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
				'workflows/intoscope.json': toExportableWorkflow(
					movedIntoScopeWorkflow,
					projectB,
					'otherID',
				),
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
				} else if (path === SOURCE_CONTROL_FOLDERS_EXPORT_FILE) {
					// asking for folders
					return ['folders.json'];
				} else if (path === SOURCE_CONTROL_TAGS_EXPORT_FILE) {
					// asking for folders
					return ['tags.json'];
				}

				return [];
			});

			fsReadFile.mockImplementation(async (path: string) => {
				return JSON.stringify(gitFiles[path]);
			});
		});

		describe('direction: push', () => {
			describe('global:admin user', () => {
				it('should see all workflows', async () => {
					let result = await service.getStatus(globalAdmin, {
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
					let result = await service.getStatus(globalAdmin, {
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
					let result = await service.getStatus(globalAdmin, {
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
			});

			describe('global:member user', () => {
				it('should see nothing', async () => {
					let result = await service.getStatus(globalMember, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});

					expect(result).toBeEmptyArray();
				});
			});

			describe('project:Admin user', () => {
				it('should see only workflows in correct scope', async () => {
					let result = await service.getStatus(projectAdmin, {
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
					let result = await service.getStatus(projectAdmin, {
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
					let result = await service.getStatus(projectAdmin, {
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
			});
		});
	});
});
