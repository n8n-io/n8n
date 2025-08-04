'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const fastGlob = __importStar(require('fast-glob'));
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const promises_1 = __importDefault(require('node:fs/promises'));
const node_path_1 = require('node:path');
const constants_1 = require('@/environments.ee/source-control/constants');
const source_control_export_service_ee_1 = require('@/environments.ee/source-control/source-control-export.service.ee');
const source_control_import_service_ee_1 = require('@/environments.ee/source-control/source-control-import.service.ee');
const source_control_preferences_service_ee_1 = require('@/environments.ee/source-control/source-control-preferences.service.ee');
const source_control_scoped_service_1 = require('@/environments.ee/source-control/source-control-scoped.service');
const source_control_service_ee_1 = require('@/environments.ee/source-control/source-control.service.ee');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const event_service_1 = require('@/events/event.service');
const credentials_1 = require('@test-integration/db/credentials');
const folders_1 = require('@test-integration/db/folders');
const tags_1 = require('@test-integration/db/tags');
const users_1 = require('@test-integration/db/users');
jest.mock('fast-glob');
let sourceControlPreferencesService;
function toExportableFolder(folder) {
	return {
		id: folder.id,
		name: folder.name,
		homeProjectId: folder.homeProject.id,
		parentFolderId: folder.parentFolderId,
		createdAt: folder.createdAt.toISOString(),
		updatedAt: folder.updatedAt.toISOString(),
	};
}
function toExportableCredential(cred, owner) {
	let resourceOwner;
	if (owner instanceof db_1.Project) {
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
function toExportableWorkflow(wf, owner, versionId) {
	let resourceOwner;
	if (owner instanceof db_1.Project) {
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
	let globalAdmin;
	let globalOwner;
	let globalMember;
	let projectAdmin;
	let projectA;
	let projectB;
	let globalAdminScope;
	let globalOwnerScope;
	let globalMemberScope;
	let projectAdminScope;
	let projectAScope;
	let projectBScope;
	let allWorkflows;
	let tags;
	let gitFiles;
	let movedOutOfScopeWorkflow;
	let movedIntoScopeWorkflow;
	let deletedOutOfScopeWorkflow;
	let deletedInScopeWorkflow;
	let movedOutOfScopeCredential;
	let movedIntoScopeCredential;
	let deletedOutOfScopeCredential;
	let deletedInScopeCredential;
	let gitService;
	let service;
	let cipher;
	const globMock = fastGlob.default;
	const fsReadFile = jest.spyOn(promises_1.default, 'readFile');
	const fsWriteFile = jest.spyOn(promises_1.default, 'writeFile');
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		cipher = di_1.Container.get(n8n_core_1.Cipher);
		sourceControlPreferencesService = di_1.Container.get(
			source_control_preferences_service_ee_1.SourceControlPreferencesService,
		);
		await sourceControlPreferencesService.setPreferences({
			connected: true,
			keyGeneratorType: 'rsa',
		});
		[globalAdmin, globalOwner, globalMember, projectAdmin] = await Promise.all([
			await (0, users_1.createUser)({ role: 'global:admin' }),
			await (0, users_1.createUser)({ role: 'global:owner' }),
			await (0, users_1.createUser)({ role: 'global:member' }),
			await (0, users_1.createUser)({ role: 'global:member' }),
		]);
		[projectA, projectB] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)('ProjectA', projectAdmin),
			(0, backend_test_utils_1.createTeamProject)('ProjectB'),
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
					await (0, backend_test_utils_1.createWorkflow)(
						{
							name: `${owner.id}-WFA`,
						},
						owner,
					),
					await (0, backend_test_utils_1.createWorkflow)(
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
		deletedOutOfScopeWorkflow = Object.assign(new db_1.WorkflowEntity(), {
			id: 'deletedOutOfScope',
			name: 'deletedOutOfScope',
		});
		deletedInScopeWorkflow = Object.assign(new db_1.WorkflowEntity(), {
			id: 'deletedInScope',
			name: 'deletedInScope',
		});
		deletedInScopeCredential = Object.assign(new db_1.CredentialsEntity(), {
			id: 'deletedInScope',
			name: 'deletedInScope',
			data: cipher.encrypt({}),
			type: '',
		});
		deletedOutOfScopeCredential = Object.assign(new db_1.CredentialsEntity(), {
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
			await (0, credentials_1.createCredentials)(
				{
					name: 'OutOfScope',
					data: cipher.encrypt({}),
					type: '',
				},
				projectB,
			),
			await (0, credentials_1.createCredentials)(
				{
					name: 'IntoScope',
					data: cipher.encrypt({}),
					type: '',
				},
				projectA,
			),
			await (0, backend_test_utils_1.createWorkflow)(
				{
					name: 'OutOfScope',
				},
				projectB,
			),
			await (0, backend_test_utils_1.createWorkflow)(
				{
					name: 'IntoScope',
				},
				projectA,
			),
		]);
		const [projectACredentials, projectBCredentials] = await Promise.all(
			[projectA, projectB].map(async (project) => [
				await (0, credentials_1.createCredentials)(
					{
						name: `${project.name}-CredA`,
						data: cipher.encrypt({}),
						type: '',
					},
					project,
				),
				await (0, credentials_1.createCredentials)(
					{
						name: `${project.name}-CredB‚`,
						data: cipher.encrypt({}),
						type: '',
					},
					project,
				),
			]),
		);
		tags = await Promise.all([
			(0, tags_1.createTag)({
				name: 'testTag1',
			}),
			(0, tags_1.createTag)({
				name: 'testTag2',
			}),
			(0, tags_1.createTag)({
				name: 'testTag3',
			}),
		]);
		await Promise.all(
			tags.map(async (tag) => {
				await Promise.all(
					allWorkflows.map(async (workflow) => {
						await (0, tags_1.assignTagToWorkflow)(tag, workflow);
					}),
				);
			}),
		);
		const [projectAFolders, projectBFolders] = await Promise.all(
			[projectA, projectB].map(async (project) => {
				const parent = await (0, folders_1.createFolder)(project, {
					name: `${project.name}-FolderA`,
				});
				return [
					parent,
					await (0, folders_1.createFolder)(project, {
						name: `${project.name}-FolderB`,
					}),
					await (0, folders_1.createFolder)(project, {
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
		gitService = (0, jest_mock_extended_1.mock)();
		service = new source_control_service_ee_1.SourceControlService(
			(0, jest_mock_extended_1.mock)(),
			gitService,
			sourceControlPreferencesService,
			di_1.Container.get(source_control_export_service_ee_1.SourceControlExportService),
			di_1.Container.get(source_control_import_service_ee_1.SourceControlImportService),
			di_1.Container.get(source_control_scoped_service_1.SourceControlScopedService),
			di_1.Container.get(db_1.TagRepository),
			di_1.Container.get(db_1.FolderRepository),
			di_1.Container.get(event_service_1.EventService),
		);
		service.sanityCheck = async () => {};
		service.resetWorkfolder = async () => undefined;
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
			if (opts.cwd?.endsWith(constants_1.SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER)) {
				return Object.keys(gitFiles).filter((file) =>
					file.startsWith(constants_1.SOURCE_CONTROL_WORKFLOW_EXPORT_FOLDER),
				);
			} else if (opts.cwd?.endsWith(constants_1.SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER)) {
				return Object.keys(gitFiles).filter((file) =>
					file.startsWith(constants_1.SOURCE_CONTROL_CREDENTIAL_EXPORT_FOLDER),
				);
			} else if (path === constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE) {
				return ['folders.json'];
			} else if (path === constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE) {
				return ['tags.json'];
			}
			return [];
		});
		fsReadFile.mockImplementation(async (path) => {
			const pathWithoutCwd = (0, node_path_1.isAbsolute)(path)
				? (0, node_path_1.basename)(path)
				: path;
			return JSON.stringify(gitFiles[pathWithoutCwd]);
		});
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
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
					expect(new Set(deletedWorkflows.map((wf) => wf.id))).toEqual(
						new Set([deletedOutOfScopeWorkflow.id, deletedInScopeWorkflow.id]),
					);
					const newWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'created',
					);
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
			});
			describe('global:member user', () => {
				it('should see nothing', async () => {
					const result = await service.getStatus(globalMember, {
						direction: 'push',
						preferLocalVersion: true,
						verbose: false,
					});
					expect(result).toBeEmptyArray();
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
					expect(new Set(deletedWorkflows.map((wf) => wf.id))).toEqual(
						new Set([deletedInScopeWorkflow.id]),
					);
					const newWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'created',
					);
					expect(new Set(newWorkflows.map((wf) => wf.id))).toEqual(
						new Set([projectAScope.workflows[1].id, movedIntoScopeWorkflow.id]),
					);
					const modifiedWorkflows = result.filter(
						(r) => r.type === 'workflow' && r.status === 'modified',
					);
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
			});
		});
	});
	describe('pushWorkfolder', () => {
		const updatedFiles = {};
		beforeAll(async () => {
			gitFiles['tags.json'] = {
				tags: [],
				mappings: [],
			};
		});
		beforeEach(() => {
			fsWriteFile.mockImplementation(async (path, data) => {
				updatedFiles[path] = data;
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
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				await expect(
					service.pushWorkfolder(globalMember, {
						fileNames: allChanges,
						commitMessage: 'Test',
					}),
				).rejects.toThrowError(bad_request_error_1.BadRequestError);
			});
		});
		describe('global:admin user', () => {
			it('should update all workflows, credentials, tags and folder', async () => {
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
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
				expect(workflowFiles).toHaveLength(8);
				expect(credentialFiles).toHaveLength(2);
				expect(gitService.push).toBeCalled();
				expect(fsWriteFile).toBeCalledTimes(workflowFiles.length + credentialFiles.length + 2);
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(workflowFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(credentialFiles));
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([
						expect.stringMatching(constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE),
					]),
				);
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([
						expect.stringMatching(constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE),
					]),
				);
			});
			it('should update all workflows and credentials without arguments', async () => {
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
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
				expect(workflowFiles).toHaveLength(8);
				expect(credentialFiles).toHaveLength(2);
				const numberFilesToWrite = workflowFiles.length + credentialFiles.length + 2;
				const filesToWrite =
					allChanges.filter(
						(change) =>
							(change.type === 'workflow' || change.type === 'credential') &&
							change.status !== 'deleted',
					).length + 2;
				expect(numberFilesToWrite).toBe(filesToWrite);
				expect(fsWriteFile).toBeCalledTimes(filesToWrite);
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(workflowFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(credentialFiles));
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([
						expect.stringMatching(constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE),
					]),
				);
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([
						expect.stringMatching(constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE),
					]),
				);
				const tagFile = result.statusResult.find(
					(change) => change.type === 'tags' && change.status !== 'deleted',
				);
				const tagsFile = JSON.parse(updatedFiles[tagFile.file]);
				expect(tagsFile.mappings).toHaveLength(allWorkflows.length * tags.length);
			});
		});
		describe('project:admin', () => {
			it('should update selected workflows, credentials, tags and folders', async () => {
				const allChanges = await service.getStatus(projectAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
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
				expect(workflowFiles).toHaveLength(2);
				expect(credentialFiles).toHaveLength(1);
				expect(fsWriteFile).toBeCalledTimes(workflowFiles.length + credentialFiles.length + 2);
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(workflowFiles));
				expect(Object.keys(updatedFiles)).toEqual(expect.arrayContaining(credentialFiles));
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([
						expect.stringMatching(constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE),
					]),
				);
				expect(Object.keys(updatedFiles)).toEqual(
					expect.arrayContaining([
						expect.stringMatching(constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE),
					]),
				);
			});
			it('should throw ForbiddenError when trying to push workflows out of scope', async () => {
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				const workflowOutOfScope = allChanges.find(
					(wf) =>
						wf.type === 'workflow' && !projectAdminScope.workflows.some((w) => w.id === wf.id),
				);
				await expect(
					service.pushWorkfolder(projectAdmin, {
						fileNames: [workflowOutOfScope],
						commitMessage: 'Test',
						force: true,
					}),
				).rejects.toThrowError(forbidden_error_1.ForbiddenError);
			});
			it('should throw ForbiddenError when trying to push credentials out of scope', async () => {
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				const credentialOutOfScope = allChanges.find(
					(cred) =>
						cred.type === 'credential' &&
						!projectAdminScope.credentials.some((c) => c.id === cred.id),
				);
				await expect(
					service.pushWorkfolder(projectAdmin, {
						fileNames: [credentialOutOfScope],
						commitMessage: 'Test',
						force: true,
					}),
				).rejects.toThrowError(forbidden_error_1.ForbiddenError);
			});
			it('should update tag mappings in scope and keep out of scope ones', async () => {
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
				await (0, tags_1.updateTag)(tags[0], { name: 'updatedTag1' });
				await (0, tags_1.assignTagToWorkflow)(tags[1], movedIntoScopeWorkflow);
				const allChanges = await service.getStatus(projectAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				const tagsFile = allChanges.find((file) =>
					file.file.includes(constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE),
				);
				expect(tagsFile).toBeDefined();
				const result = await service.pushWorkfolder(projectAdmin, {
					fileNames: [tagsFile],
					commitMessage: 'Test',
					force: true,
				});
				expect(result.statusResult).toHaveLength(1);
				expect(result.statusResult[0].type).toBe('tags');
				expect(result.statusResult[0].status).toBe('modified');
				expect(result.statusResult[0].file).toContain(constants_1.SOURCE_CONTROL_TAGS_EXPORT_FILE);
				const tagsFileContent = JSON.parse(updatedFiles[result.statusResult[0].file]);
				expect(tagsFileContent.tags).toHaveLength(3);
				expect(tagsFileContent.tags.find((t) => t.id === tags[0].id).name).toBe('updatedTag1');
				expect(tagsFileContent.mappings).toHaveLength(allWorkflows.length + 2 * 2 + 1);
			});
			it('should update folders in scope and keep out of scope ones', async () => {
				const allChanges = await service.getStatus(projectAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				const foldersFile = allChanges.find((file) =>
					file.file.includes(constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE),
				);
				expect(foldersFile).toBeDefined();
				const result = await service.pushWorkfolder(projectAdmin, {
					fileNames: [foldersFile],
					commitMessage: 'Test',
					force: true,
				});
				expect(result.statusResult).toHaveLength(1);
				expect(result.statusResult[0].type).toBe('folders');
				expect(result.statusResult[0].status).toBe('created');
				expect(result.statusResult[0].file).toContain(
					constants_1.SOURCE_CONTROL_FOLDERS_EXPORT_FILE,
				);
				const foldersFileContent = JSON.parse(updatedFiles[result.statusResult[0].file]);
				expect(foldersFileContent.folders).toHaveLength(4);
				expect(foldersFileContent.folders.find((t) => t.homeProjectId === projectB.id).id).toBe(
					projectBScope.folders[0].id,
				);
				expect(foldersFileContent.folders.map((f) => f.id)).toEqual(
					expect.arrayContaining(projectAScope.folders.map((f) => f.id)),
				);
			});
		});
		describe('global:member', () => {
			it('should deny all changes', async () => {
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				await expect(
					service.pushWorkfolder(globalMember, {
						fileNames: allChanges,
						commitMessage: 'Test',
					}),
				).rejects.toThrowError(forbidden_error_1.ForbiddenError);
			});
			it('should deny any changes', async () => {
				const allChanges = await service.getStatus(globalAdmin, {
					direction: 'push',
					preferLocalVersion: true,
					verbose: false,
				});
				await expect(
					service.pushWorkfolder(globalMember, {
						fileNames: [allChanges[0]],
						commitMessage: 'Test',
					}),
				).rejects.toThrowError(forbidden_error_1.ForbiddenError);
			});
		});
	});
});
//# sourceMappingURL=source-control.service.test.js.map
