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
const db_1 = require('@n8n/db');
const fastGlob = __importStar(require('fast-glob'));
const jest_mock_extended_1 = require('jest-mock-extended');
const promises_1 = __importDefault(require('node:fs/promises'));
const source_control_import_service_ee_1 = require('../source-control-import.service.ee');
const source_control_context_1 = require('../types/source-control-context');
jest.mock('fast-glob');
const globalAdminContext = new source_control_context_1.SourceControlContext(
	Object.assign(new db_1.User(), {
		role: 'global:admin',
	}),
);
const globalMemberContext = new source_control_context_1.SourceControlContext(
	Object.assign(new db_1.User(), {
		role: 'global:member',
	}),
);
describe('SourceControlImportService', () => {
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const folderRepository = (0, jest_mock_extended_1.mock)();
	const projectRepository = (0, jest_mock_extended_1.mock)();
	const sourceControlScopedService = (0, jest_mock_extended_1.mock)();
	const service = new source_control_import_service_ee_1.SourceControlImportService(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		projectRepository,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		workflowRepository,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		folderRepository,
		(0, jest_mock_extended_1.mock)({ n8nFolder: '/mock/n8n' }),
		sourceControlScopedService,
	);
	const globMock = fastGlob.default;
	const fsReadFile = jest.spyOn(promises_1.default, 'readFile');
	beforeEach(() => jest.clearAllMocks());
	describe('getRemoteVersionIdsFromFiles', () => {
		const mockWorkflowFile = '/mock/workflow1.json';
		it('should parse workflow files correctly', async () => {
			globMock.mockResolvedValue([mockWorkflowFile]);
			const mockWorkflowData = {
				id: 'workflow1',
				versionId: 'v1',
				name: 'Test Workflow',
				owner: {
					type: 'personal',
					personalEmail: 'email@email.com',
				},
			};
			fsReadFile.mockResolvedValue(JSON.stringify(mockWorkflowData));
			sourceControlScopedService.getAdminProjectsFromContext.mockResolvedValueOnce([]);
			const result = await service.getRemoteVersionIdsFromFiles(globalAdminContext);
			expect(fsReadFile).toHaveBeenCalledWith(mockWorkflowFile, { encoding: 'utf8' });
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'workflow1',
					versionId: 'v1',
					name: 'Test Workflow',
				}),
			);
		});
		it('should filter out files without valid workflow data', async () => {
			globMock.mockResolvedValue(['/mock/invalid.json']);
			fsReadFile.mockResolvedValue('{}');
			const result = await service.getRemoteVersionIdsFromFiles(globalAdminContext);
			expect(result).toHaveLength(0);
		});
	});
	describe('getRemoteCredentialsFromFiles', () => {
		it('should parse credential files correctly', async () => {
			globMock.mockResolvedValue(['/mock/credential1.json']);
			const mockCredentialData = {
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
			};
			fsReadFile.mockResolvedValue(JSON.stringify(mockCredentialData));
			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);
			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(
				expect.objectContaining({
					id: 'cred1',
					name: 'Test Credential',
					type: 'oauth2',
				}),
			);
		});
		it('should filter out files without valid credential data', async () => {
			globMock.mockResolvedValue(['/mock/invalid.json']);
			fsReadFile.mockResolvedValue('{}');
			const result = await service.getRemoteCredentialsFromFiles(globalAdminContext);
			expect(result).toHaveLength(0);
		});
	});
	describe('getRemoteVariablesFromFile', () => {
		it('should parse variables file correctly', async () => {
			globMock.mockResolvedValue(['/mock/variables.json']);
			const mockVariablesData = [
				{ key: 'VAR1', value: 'value1' },
				{ key: 'VAR2', value: 'value2' },
			];
			fsReadFile.mockResolvedValue(JSON.stringify(mockVariablesData));
			const result = await service.getRemoteVariablesFromFile();
			expect(result).toEqual(mockVariablesData);
		});
		it('should return empty array if no variables file found', async () => {
			globMock.mockResolvedValue([]);
			const result = await service.getRemoteVariablesFromFile();
			expect(result).toHaveLength(0);
		});
	});
	describe('getRemoteTagsAndMappingsFromFile', () => {
		it('should parse tags and mappings file correctly', async () => {
			globMock.mockResolvedValue(['/mock/tags.json']);
			const mockTagsData = {
				tags: [{ id: 'tag1', name: 'Tag 1' }],
				mappings: [{ workflowId: 'workflow1', tagId: 'tag1' }],
			};
			fsReadFile.mockResolvedValue(JSON.stringify(mockTagsData));
			const result = await service.getRemoteTagsAndMappingsFromFile(globalAdminContext);
			expect(result.tags).toEqual(mockTagsData.tags);
			expect(result.mappings).toEqual(mockTagsData.mappings);
		});
		it('should return empty tags and mappings if no file found', async () => {
			globMock.mockResolvedValue([]);
			const result = await service.getRemoteTagsAndMappingsFromFile(globalAdminContext);
			expect(result.tags).toHaveLength(0);
			expect(result.mappings).toHaveLength(0);
		});
		it('should return only folder that belong to a project that belongs to the user', async () => {
			globMock.mockResolvedValue(['/mock/tags.json']);
			const mockTagsData = {
				tags: [{ id: 'tag1', name: 'Tag 1' }],
				mappings: [
					{ workflowId: 'workflow1', tagId: 'tag1' },
					{ workflowId: 'workflow2', tagId: 'tag1' },
					{ workflowId: 'workflow3', tagId: 'tag1' },
				],
			};
			workflowRepository.find.mockResolvedValue([
				Object.assign(new db_1.WorkflowEntity(), {
					id: 'workflow1',
				}),
				Object.assign(new db_1.WorkflowEntity(), {
					id: 'workflow3',
				}),
			]);
			fsReadFile.mockResolvedValue(JSON.stringify(mockTagsData));
			const result = await service.getRemoteTagsAndMappingsFromFile(globalAdminContext);
			expect(result.tags).toEqual(mockTagsData.tags);
			expect(result.mappings).toEqual(mockTagsData.mappings);
		});
	});
	describe('getRemoteFoldersAndMappingsFromFile', () => {
		it('should parse folders and mappings file correctly', async () => {
			globMock.mockResolvedValue(['/mock/folders.json']);
			const now = new Date();
			const mockFoldersData = {
				folders: [
					{
						id: 'folder1',
						name: 'folder 1',
						parentFolderId: null,
						homeProjectId: 'project1',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
				],
			};
			fsReadFile.mockResolvedValue(JSON.stringify(mockFoldersData));
			const result = await service.getRemoteFoldersAndMappingsFromFile(globalAdminContext);
			expect(result.folders).toEqual(mockFoldersData.folders);
		});
		it('should return empty folders and mappings if no file found', async () => {
			globMock.mockResolvedValue([]);
			const result = await service.getRemoteFoldersAndMappingsFromFile(globalAdminContext);
			expect(result.folders).toHaveLength(0);
		});
		it('should return only folder that belong to a project that belongs to the user', async () => {
			globMock.mockResolvedValue(['/mock/folders.json']);
			const now = new Date();
			const foldersToFind = [
				{
					id: 'folder1',
					name: 'folder 1',
					parentFolderId: null,
					homeProjectId: 'project1',
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
				},
				{
					id: 'folder3',
					name: 'folder 3',
					parentFolderId: null,
					homeProjectId: 'project1',
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
				},
				{
					id: 'folder4',
					name: 'folder 3',
					parentFolderId: null,
					homeProjectId: 'project3',
					createdAt: now.toISOString(),
					updatedAt: now.toISOString(),
				},
			];
			const mockFoldersData = {
				folders: [
					{
						id: 'folder0',
						name: 'folder 0',
						parentFolderId: null,
						homeProjectId: 'project0',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
					...foldersToFind,
					{
						id: 'folder2',
						name: 'folder 2',
						parentFolderId: null,
						homeProjectId: 'project2',
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
				],
			};
			sourceControlScopedService.getAdminProjectsFromContext.mockResolvedValue([
				Object.assign(new db_1.Project(), {
					id: 'project1',
				}),
				Object.assign(new db_1.Project(), {
					id: 'project3',
				}),
			]);
			fsReadFile.mockResolvedValue(JSON.stringify(mockFoldersData));
			const result = await service.getRemoteFoldersAndMappingsFromFile(globalMemberContext);
			expect(result.folders).toEqual(foldersToFind);
		});
	});
	describe('getLocalVersionIdsFromDb', () => {
		const now = new Date();
		jest.useFakeTimers({ now });
		it('should replace invalid updatedAt with current timestamp', async () => {
			const mockWorkflows = [
				{
					id: 'workflow1',
					name: 'Test Workflow',
					updatedAt: 'invalid-date',
				},
			];
			workflowRepository.find.mockResolvedValue(mockWorkflows);
			const result = await service.getLocalVersionIdsFromDb(globalAdminContext);
			expect(result[0].updatedAt).toBe(now.toISOString());
		});
	});
	describe('getLocalFoldersAndMappingsFromDb', () => {
		it('should return data from DB', async () => {
			folderRepository.find.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({ createdAt: new Date(), updatedAt: new Date() }),
			]);
			workflowRepository.find.mockResolvedValue([(0, jest_mock_extended_1.mock)()]);
			const result = await service.getLocalFoldersAndMappingsFromDb(globalAdminContext);
			expect(result.folders).toHaveLength(1);
			expect(result.folders[0]).toHaveProperty('id');
			expect(result.folders[0]).toHaveProperty('name');
			expect(result.folders[0]).toHaveProperty('parentFolderId');
			expect(result.folders[0]).toHaveProperty('homeProjectId');
		});
	});
	describe('importFoldersFromWorkFolder', () => {});
});
//# sourceMappingURL=source-control-import.service.ee.test.js.map
