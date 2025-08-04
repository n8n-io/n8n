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
const db_2 = require('@n8n/db');
const di_1 = require('@n8n/di');
const fastGlob = __importStar(require('fast-glob'));
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const utils = __importStar(require('n8n-workflow'));
const nanoid_1 = require('nanoid');
const promises_1 = __importDefault(require('node:fs/promises'));
const source_control_import_service_ee_1 = require('@/environments.ee/source-control/source-control-import.service.ee');
const source_control_scoped_service_1 = require('@/environments.ee/source-control/source-control-scoped.service');
const source_control_context_1 = require('@/environments.ee/source-control/types/source-control-context');
const folders_1 = require('@test-integration/db/folders');
const tags_1 = require('@test-integration/db/tags');
const credentials_1 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
jest.mock('fast-glob');
describe('SourceControlImportService', () => {
	let credentialsRepository;
	let projectRepository;
	let sharedCredentialsRepository;
	let userRepository;
	let folderRepository;
	let service;
	let workflowRepository;
	let tagRepository;
	let workflowTagMappingRepository;
	let sourceControlScopedService;
	const cipher = (0, backend_test_utils_1.mockInstance)(n8n_core_1.Cipher);
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		credentialsRepository = di_1.Container.get(db_1.CredentialsRepository);
		projectRepository = di_1.Container.get(db_2.ProjectRepository);
		sharedCredentialsRepository = di_1.Container.get(db_2.SharedCredentialsRepository);
		userRepository = di_1.Container.get(db_2.UserRepository);
		folderRepository = di_1.Container.get(db_2.FolderRepository);
		workflowRepository = di_1.Container.get(db_1.WorkflowRepository);
		tagRepository = di_1.Container.get(db_1.TagRepository);
		workflowTagMappingRepository = di_1.Container.get(db_1.WorkflowTagMappingRepository);
		sourceControlScopedService = di_1.Container.get(
			source_control_scoped_service_1.SourceControlScopedService,
		);
		service = new source_control_import_service_ee_1.SourceControlImportService(
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			credentialsRepository,
			projectRepository,
			tagRepository,
			(0, jest_mock_extended_1.mock)(),
			sharedCredentialsRepository,
			userRepository,
			(0, jest_mock_extended_1.mock)(),
			workflowRepository,
			workflowTagMappingRepository,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			folderRepository,
			(0, jest_mock_extended_1.mock)({ n8nFolder: '/some-path' }),
			sourceControlScopedService,
		);
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate(['CredentialsEntity', 'SharedCredentials']);
		jest.restoreAllMocks();
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('getRemoteVersionIdsFromFiles()', () => {
		const mockWorkflow1File = '/mock/workflow1.json';
		const mockWorkflow2File = '/mock/workflow2.json';
		const mockWorkflow3File = '/mock/workflow3.json';
		const mockWorkflow4File = '/mock/workflow4.json';
		const mockWorkflow5File = '/mock/workflow5.json';
		const mockWorkflow1Data = {
			id: 'workflow1',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'personal',
				personalEmail: 'someuser@example.com',
			},
		};
		const mockWorkflow2Data = {
			id: 'workflow2',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};
		const mockWorkflow3Data = {
			id: 'workflow3',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'team',
				teamId: 'team2',
				teamName: 'Team 2',
			},
		};
		const mockWorkflow4Data = {
			id: 'workflow4',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'personal',
				personalEmail: 'someotheruser@example.com',
			},
		};
		const mockWorkflow5Data = {
			id: 'workflow5',
			versionId: 'v1',
			name: 'Test Workflow',
			owner: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};
		const globMock = fastGlob.default;
		const fsReadFile = jest.spyOn(promises_1.default, 'readFile');
		let globalAdmin;
		let globalOwner;
		let globalMember;
		let teamAdmin;
		let team1;
		beforeAll(async () => {
			[globalAdmin, globalOwner, globalMember, teamAdmin] = await Promise.all([
				(0, users_1.createAdmin)(),
				(0, users_1.createOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
			]);
			team1 = await (0, backend_test_utils_1.createTeamProject)('Team 1', teamAdmin);
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
				new source_control_context_1.SourceControlContext(globalAdmin),
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
				new source_control_context_1.SourceControlContext(globalOwner),
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
				new source_control_context_1.SourceControlContext(globalMember),
			);
			expect(result).toBeEmptyArray();
		});
		it('should return only remote workflows that belong to team project', async () => {
			const result = await service.getRemoteVersionIdsFromFiles(
				new source_control_context_1.SourceControlContext(teamAdmin),
			);
			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set([mockWorkflow2Data, mockWorkflow5Data].map((r) => r.id)),
			);
		});
	});
	describe('getLocalVersionIdsFromDb()', () => {
		let instanceOwner;
		let projectAdmin;
		let projectMember;
		let teamProjectA;
		let teamProjectB;
		let teamAWorkflows;
		let teamBWorkflows;
		let instanceOwnerWorkflows;
		let projectAdminWorkflows;
		let projectMemberWorkflows;
		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				(0, users_1.getGlobalOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
			]);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectA,
				'project:admin',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectA,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectB,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectB,
				'project:editor',
			);
			teamAWorkflows = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)({}, teamProjectA),
				await (0, backend_test_utils_1.createWorkflow)({}, teamProjectA),
				await (0, backend_test_utils_1.createWorkflow)({}, teamProjectA),
			]);
			teamBWorkflows = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)({}, teamProjectB),
				await (0, backend_test_utils_1.createWorkflow)({}, teamProjectB),
				await (0, backend_test_utils_1.createWorkflow)({}, teamProjectB),
			]);
			instanceOwnerWorkflows = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)({}, instanceOwner),
				await (0, backend_test_utils_1.createWorkflow)({}, instanceOwner),
				await (0, backend_test_utils_1.createWorkflow)({}, instanceOwner),
			]);
			projectAdminWorkflows = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)({}, projectAdmin),
				await (0, backend_test_utils_1.createWorkflow)({}, projectAdmin),
				await (0, backend_test_utils_1.createWorkflow)({}, projectAdmin),
			]);
			projectMemberWorkflows = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)({}, projectMember),
				await (0, backend_test_utils_1.createWorkflow)({}, projectMember),
				await (0, backend_test_utils_1.createWorkflow)({}, projectMember),
			]);
		});
		describe('if user is an instance owner', () => {
			it('should get all available workflows on the instance', async () => {
				const versions = await service.getLocalVersionIdsFromDb(
					new source_control_context_1.SourceControlContext(instanceOwner),
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
					new source_control_context_1.SourceControlContext(projectAdmin),
				);
				expect(new Set(versions.map((v) => v.id))).toEqual(
					new Set([...teamAWorkflows.map((w) => w.id)]),
				);
			});
		});
		describe('if user is a project member of a team project', () => {
			it('should not get any workflows', async () => {
				const versions = await service.getLocalVersionIdsFromDb(
					new source_control_context_1.SourceControlContext(projectMember),
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
		const mockCredential1Data = {
			id: 'credentials1',
			name: 'Test Workflow',
			ownedBy: {
				type: 'personal',
				personalEmail: 'someuser@example.com',
			},
		};
		const mockCredential2Data = {
			id: 'credentials2',
			name: 'Test Workflow',
			ownedBy: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};
		const mockCredential3Data = {
			id: 'credentials3',
			name: 'Test Workflow',
			ownedBy: {
				type: 'team',
				teamId: 'team2',
				teamName: 'Team 2',
			},
		};
		const mockCredential4Data = {
			id: 'credentials4',
			name: 'Test Workflow',
			ownedBy: {
				type: 'personal',
				personalEmail: 'someotheruser@example.com',
			},
		};
		const mockCredential5Data = {
			id: 'credentials5',
			name: 'Test Workflow',
			ownedBy: {
				type: 'team',
				teamId: 'team1',
				teamName: 'Team 1',
			},
		};
		const globMock = fastGlob.default;
		const fsReadFile = jest.spyOn(promises_1.default, 'readFile');
		let globalAdmin;
		let globalOwner;
		let globalMember;
		let teamAdmin;
		let team1;
		beforeAll(async () => {
			[globalAdmin, globalOwner, globalMember, teamAdmin] = await Promise.all([
				(0, users_1.createAdmin)(),
				(0, users_1.createOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
			]);
			team1 = await (0, backend_test_utils_1.createTeamProject)('Team 1', teamAdmin);
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
				new source_control_context_1.SourceControlContext(globalAdmin),
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
				new source_control_context_1.SourceControlContext(globalOwner),
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
				new source_control_context_1.SourceControlContext(globalMember),
			);
			expect(result).toBeEmptyArray();
		});
		it('should return only remote credentials that belong to team project', async () => {
			const result = await service.getRemoteCredentialsFromFiles(
				new source_control_context_1.SourceControlContext(teamAdmin),
			);
			expect(new Set(result.map((r) => r.id))).toEqual(
				new Set([mockCredential2Data, mockCredential5Data].map((r) => r.id)),
			);
		});
	});
	describe('getLocalCredentialsFromDb', () => {
		let instanceOwner;
		let projectAdmin;
		let projectMember;
		let teamProjectA;
		let teamProjectB;
		let teamACredentials;
		let teamBCredentials;
		beforeEach(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				(0, users_1.getGlobalOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
			]);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectA,
				'project:admin',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectA,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectB,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectB,
				'project:editor',
			);
			teamACredentials = await Promise.all([
				await (0, credentials_1.createCredentials)(
					{
						name: 'credential1',
						data: '',
						type: 'test',
					},
					teamProjectA,
				),
				await (0, credentials_1.createCredentials)(
					{
						name: 'credential2',
						data: '',
						type: 'test',
					},
					teamProjectA,
				),
				await (0, credentials_1.createCredentials)(
					{
						name: 'credential3',
						data: '',
						type: 'test',
					},
					teamProjectA,
				),
			]);
			teamBCredentials = await Promise.all([
				await (0, credentials_1.createCredentials)(
					{
						name: 'credential4',
						data: '',
						type: 'test',
					},
					teamProjectB,
				),
				await (0, credentials_1.createCredentials)(
					{
						name: 'credential5',
						data: '',
						type: 'test',
					},
					teamProjectB,
				),
				await (0, credentials_1.createCredentials)(
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
				new source_control_context_1.SourceControlContext(instanceOwner),
			);
			expect(new Set(versions.map((v) => v.id))).toEqual(
				new Set([...teamACredentials.map((w) => w.id), ...teamBCredentials.map((w) => w.id)]),
			);
		});
		it('should only get all available credentials from the team project, for a project admin', async () => {
			const versions = await service.getLocalCredentialsFromDb(
				new source_control_context_1.SourceControlContext(projectAdmin),
			);
			expect(new Set(versions.map((v) => v.id))).toEqual(
				new Set([...teamACredentials.map((w) => w.id)]),
			);
		});
		it('should not get any workflows, for a project member', async () => {
			const versions = await service.getLocalCredentialsFromDb(
				new source_control_context_1.SourceControlContext(projectMember),
			);
			expect(versions).toBeEmptyArray();
		});
	});
	describe('getLocalFoldersAndMappingsFromDb()', () => {
		let instanceOwner;
		let projectAdmin;
		let projectMember;
		let teamProjectA;
		let teamProjectB;
		let foldersProjectA;
		let foldersProjectB;
		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				(0, users_1.getGlobalOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
			]);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectA,
				'project:admin',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectA,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectB,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectB,
				'project:editor',
			);
			foldersProjectA = await Promise.all([
				await (0, folders_1.createFolder)(teamProjectA, {
					name: 'folder1',
				}),
				await (0, folders_1.createFolder)(teamProjectA, {
					name: 'folder2',
				}),
				await (0, folders_1.createFolder)(teamProjectA, {
					name: 'folder3',
				}),
			]);
			foldersProjectA.push(
				await (0, folders_1.createFolder)(teamProjectA, {
					name: 'folder1.1',
					parentFolder: foldersProjectA[0],
				}),
			);
			foldersProjectB = await Promise.all([
				await (0, folders_1.createFolder)(teamProjectB, {
					name: 'folder1',
				}),
				await (0, folders_1.createFolder)(teamProjectB, {
					name: 'folder2',
				}),
				await (0, folders_1.createFolder)(teamProjectB, {
					name: 'folder3',
				}),
			]);
		});
		it('should get all available folders on the instance, for an instance owner', async () => {
			const folders = await service.getLocalFoldersAndMappingsFromDb(
				new source_control_context_1.SourceControlContext(instanceOwner),
			);
			expect(new Set(folders.folders.map((v) => v.id))).toEqual(
				new Set([...foldersProjectA.map((w) => w.id), ...foldersProjectB.map((w) => w.id)]),
			);
		});
		it('should only get all available folders from the team project, for a project admin', async () => {
			const versions = await service.getLocalFoldersAndMappingsFromDb(
				new source_control_context_1.SourceControlContext(projectAdmin),
			);
			expect(new Set(versions.folders.map((v) => v.id))).toEqual(
				new Set([...foldersProjectA.map((w) => w.id)]),
			);
		});
		it('should not get any folders, for a project member', async () => {
			const versions = await service.getLocalFoldersAndMappingsFromDb(
				new source_control_context_1.SourceControlContext(projectMember),
			);
			expect(versions.folders).toBeEmptyArray();
		});
	});
	describe('getRemoteTagsAndMappingsFromFile()', () => {
		const mockTagsFile = '/mock/tags.json';
		const mockTagData = {
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
		const globMock = fastGlob.default;
		const fsReadFile = jest.spyOn(promises_1.default, 'readFile');
		let globalAdmin;
		let globalOwner;
		let globalMember;
		let teamAdmin;
		let team1;
		let team2;
		let workflowTeam1;
		beforeEach(async () => {
			[globalAdmin, globalOwner, globalMember, teamAdmin] = await Promise.all([
				(0, users_1.createAdmin)(),
				(0, users_1.createOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
			]);
			globMock.mockResolvedValue([mockTagsFile]);
			fsReadFile.mockResolvedValue(JSON.stringify(mockTagData));
			[team1, team2] = await Promise.all([
				await (0, backend_test_utils_1.createTeamProject)('Team 1', teamAdmin),
				await (0, backend_test_utils_1.createTeamProject)('Team 2'),
			]);
			workflowTeam1 = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'wf1',
						name: 'Workflow 1',
					},
					team1,
				),
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'wf2',
						name: 'Workflow 2',
					},
					team1,
				),
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'wf3',
						name: 'Workflow 3',
					},
					team1,
				),
			]);
			await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'wf4',
						name: 'Workflow 4',
					},
					team2,
				),
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'wf5',
						name: 'Workflow 5',
					},
					team2,
				),
				await (0, backend_test_utils_1.createWorkflow)(
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
				new source_control_context_1.SourceControlContext(globalAdmin),
			);
			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(new Set(result.mappings)).toEqual(new Set(mockTagData.mappings));
		});
		it('should show all remote tags and all remote mappings for instance owners', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new source_control_context_1.SourceControlContext(globalOwner),
			);
			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(new Set(result.mappings)).toEqual(new Set(mockTagData.mappings));
		});
		it('should return all remote tags and no remote mappings for instance members', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new source_control_context_1.SourceControlContext(globalMember),
			);
			expect(new Set(result.tags.map((r) => r.id))).toEqual(
				new Set(mockTagData.tags.map((t) => t.id)),
			);
			expect(result.mappings).toBeEmptyArray();
		});
		it('should return all remote tags and only remote mappings for in scope team for team admin', async () => {
			const result = await service.getRemoteTagsAndMappingsFromFile(
				new source_control_context_1.SourceControlContext(teamAdmin),
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
		let instanceOwner;
		let projectAdmin;
		let projectMember;
		let teamProjectA;
		let teamProjectB;
		let tags;
		let workflowsProjectA;
		let workflowsProjectB;
		let mappings;
		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				(0, users_1.getGlobalOwner)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
			]);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectA,
				'project:admin',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectA,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectAdmin,
				teamProjectB,
				'project:editor',
			);
			await (0, backend_test_utils_1.linkUserToProject)(
				projectMember,
				teamProjectB,
				'project:editor',
			);
			tags = await Promise.all([
				await (0, tags_1.createTag)({
					name: 'tag1',
				}),
				await (0, tags_1.createTag)({
					name: 'tag2',
				}),
				await (0, tags_1.createTag)({
					name: 'tag3',
				}),
			]);
			workflowsProjectA = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'workflow1',
						name: 'Workflow 1',
					},
					teamProjectA,
				),
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'workflow2',
						name: 'Workflow 2',
					},
					teamProjectA,
				),
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'workflow3',
						name: 'Workflow 3',
					},
					teamProjectA,
				),
			]);
			workflowsProjectB = await Promise.all([
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'workflow4',
						name: 'Workflow 4',
					},
					teamProjectB,
				),
				await (0, backend_test_utils_1.createWorkflow)(
					{
						id: 'workflow5',
						name: 'Workflow 5',
					},
					teamProjectB,
				),
				await (0, backend_test_utils_1.createWorkflow)(
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
				mappings.map(
					async ([tag, workflow]) => await (0, tags_1.assignTagToWorkflow)(tag, workflow),
				),
			);
		});
		it('should get all available tags and mappings on the instance, for an instance owner', async () => {
			const result = await service.getLocalTagsAndMappingsFromDb(
				new source_control_context_1.SourceControlContext(instanceOwner),
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
				new source_control_context_1.SourceControlContext(projectAdmin),
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
				new source_control_context_1.SourceControlContext(projectMember),
			);
			expect(new Set(result.tags.map((v) => v.id))).toEqual(new Set([...tags.map((w) => w.id)]));
			expect(result.mappings).toBeEmptyArray();
		});
	});
	describe('importCredentialsFromWorkFolder()', () => {
		describe('if user email specified by `ownedBy` exists at target instance', () => {
			it('should assign credential ownership to original user', async () => {
				const [importingUser, member] = await Promise.all([
					(0, users_1.getGlobalOwner)(),
					(0, users_1.createMember)(),
				]);
				promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
				const CREDENTIAL_ID = (0, nanoid_1.nanoid)();
				const stub = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: member.email,
				};
				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);
				cipher.encrypt.mockReturnValue('some-encrypted-data');
				await service.importCredentialsFromWorkFolder(
					[(0, jest_mock_extended_1.mock)({ id: CREDENTIAL_ID })],
					importingUser.id,
				);
				const personalProject = await (0, backend_test_utils_1.getPersonalProject)(member);
				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});
				expect(sharing).toBeTruthy();
			});
		});
		describe('if user email specified by `ownedBy` is `null`', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await (0, users_1.getGlobalOwner)();
				promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
				const CREDENTIAL_ID = (0, nanoid_1.nanoid)();
				const stub = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: null,
				};
				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);
				cipher.encrypt.mockReturnValue('some-encrypted-data');
				await service.importCredentialsFromWorkFolder(
					[(0, jest_mock_extended_1.mock)({ id: CREDENTIAL_ID })],
					importingUser.id,
				);
				const personalProject = await (0, backend_test_utils_1.getPersonalProject)(importingUser);
				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});
				expect(sharing).toBeTruthy();
			});
		});
		describe('if user email specified by `ownedBy` does not exist at target instance', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await (0, users_1.getGlobalOwner)();
				promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
				const CREDENTIAL_ID = (0, nanoid_1.nanoid)();
				const stub = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: 'user@test.com',
				};
				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);
				cipher.encrypt.mockReturnValue('some-encrypted-data');
				await service.importCredentialsFromWorkFolder(
					[(0, jest_mock_extended_1.mock)({ id: CREDENTIAL_ID })],
					importingUser.id,
				);
				const personalProject = await (0, backend_test_utils_1.getPersonalProject)(importingUser);
				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});
				expect(sharing).toBeTruthy();
			});
		});
	});
	describe('if owner specified by `ownedBy` does not exist at target instance', () => {
		it('should assign the credential ownership to the importing user if it was owned by a personal project in the source instance', async () => {
			const importingUser = await (0, users_1.getGlobalOwner)();
			promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
			const CREDENTIAL_ID = (0, nanoid_1.nanoid)();
			const stub = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'personal',
					personalEmail: 'test@example.com',
				},
			};
			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);
			cipher.encrypt.mockReturnValue('some-encrypted-data');
			await service.importCredentialsFromWorkFolder(
				[(0, jest_mock_extended_1.mock)({ id: CREDENTIAL_ID })],
				importingUser.id,
			);
			const personalProject = await (0, backend_test_utils_1.getPersonalProject)(importingUser);
			const sharing = await sharedCredentialsRepository.findOneBy({
				credentialsId: CREDENTIAL_ID,
				projectId: personalProject.id,
				role: 'credential:owner',
			});
			expect(sharing).toBeTruthy();
		});
		it('should create a new team project if the credential was owned by a team project in the source instance', async () => {
			const importingUser = await (0, users_1.getGlobalOwner)();
			promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
			const CREDENTIAL_ID = (0, nanoid_1.nanoid)();
			const stub = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: '1234-asdf',
					teamName: 'Marketing',
				},
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
				[(0, jest_mock_extended_1.mock)({ id: CREDENTIAL_ID })],
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
			expect(sharing).toBeTruthy();
		});
	});
	describe('if owner specified by `ownedBy` does exist at target instance', () => {
		it('should use the existing team project if credential owning project is found', async () => {
			const importingUser = await (0, users_1.getGlobalOwner)();
			promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
			const CREDENTIAL_ID = (0, nanoid_1.nanoid)();
			const project = await (0, backend_test_utils_1.createTeamProject)('Sales');
			const stub = {
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
				[(0, jest_mock_extended_1.mock)({ id: CREDENTIAL_ID })],
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
			const importingUser = await (0, users_1.getGlobalOwner)();
			promises_1.default.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));
			const targetProject = await (0, backend_test_utils_1.createTeamProject)('Marketing');
			const credential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					project: targetProject,
					role: 'credential:owner',
				},
			);
			const sourceProjectId = (0, nanoid_1.nanoid)();
			const stub = {
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
				[(0, jest_mock_extended_1.mock)({ id: credential.id })],
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
//# sourceMappingURL=source-control-import.service.test.js.map
