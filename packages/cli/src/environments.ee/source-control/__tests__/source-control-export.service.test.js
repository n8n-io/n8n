'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const promises_1 = __importDefault(require('node:fs/promises'));
const source_control_export_service_ee_1 = require('../source-control-export.service.ee');
const source_control_context_1 = require('../types/source-control-context');
describe('SourceControlExportService', () => {
	const globalAdminContext = new source_control_context_1.SourceControlContext(
		Object.assign(new db_1.User(), {
			role: 'global:admin',
		}),
	);
	const cipher = di_1.Container.get(n8n_core_1.Cipher);
	const sharedCredentialsRepository = (0, jest_mock_extended_1.mock)();
	const sharedWorkflowRepository = (0, jest_mock_extended_1.mock)();
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const tagRepository = (0, jest_mock_extended_1.mock)();
	const workflowTagMappingRepository = (0, jest_mock_extended_1.mock)();
	const variablesService = (0, jest_mock_extended_1.mock)();
	const folderRepository = (0, jest_mock_extended_1.mock)();
	const sourceControlScopedService = (0, jest_mock_extended_1.mock)();
	const service = new source_control_export_service_ee_1.SourceControlExportService(
		(0, jest_mock_extended_1.mock)(),
		variablesService,
		tagRepository,
		sharedCredentialsRepository,
		sharedWorkflowRepository,
		workflowRepository,
		workflowTagMappingRepository,
		folderRepository,
		sourceControlScopedService,
		(0, jest_mock_extended_1.mock)({ n8nFolder: '/mock/n8n' }),
	);
	const fsWriteFile = jest.spyOn(promises_1.default, 'writeFile');
	beforeEach(() => jest.clearAllMocks());
	describe('exportCredentialsToWorkFolder', () => {
		const credentialData = {
			authUrl: 'test',
			accessTokenUrl: 'test',
			clientId: 'test',
			clientSecret: 'test',
			oauthTokenData: {
				access_token: 'test',
				token_type: 'test',
				expires_in: 123,
				refresh_token: 'test',
			},
		};
		const mockCredentials = (0, jest_mock_extended_1.mock)({
			id: 'cred1',
			name: 'Test Credential',
			type: 'oauth2',
			data: cipher.encrypt(credentialData),
		});
		it('should export credentials to work folder', async () => {
			sharedCredentialsRepository.findByCredentialIds.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({
					credentials: mockCredentials,
					project: (0, jest_mock_extended_1.mock)({
						type: 'personal',
						projectRelations: [
							{
								role: 'project:personalOwner',
								user: (0, jest_mock_extended_1.mock)({ email: 'user@example.com' }),
							},
						],
					}),
				}),
			]);
			const result = await service.exportCredentialsToWorkFolder([
				(0, jest_mock_extended_1.mock)(),
			]);
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/credential_stubs/cred1.json',
				dataCaptor,
			);
			expect(JSON.parse(dataCaptor.value)).toEqual({
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
				data: {
					authUrl: '',
					accessTokenUrl: '',
					clientId: '',
					clientSecret: '',
				},
				ownedBy: {
					type: 'personal',
					personalEmail: 'user@example.com',
				},
			});
		});
		it('should handle team project credentials', async () => {
			sharedCredentialsRepository.findByCredentialIds.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({
					credentials: mockCredentials,
					project: (0, jest_mock_extended_1.mock)({
						type: 'team',
						id: 'team1',
						name: 'Test Team',
					}),
				}),
			]);
			const result = await service.exportCredentialsToWorkFolder([
				(0, jest_mock_extended_1.mock)({ id: 'cred1' }),
			]);
			expect(result.count).toBe(1);
			const dataCaptor = (0, jest_mock_extended_1.captor)();
			expect(fsWriteFile).toHaveBeenCalledWith(
				'/mock/n8n/git/credential_stubs/cred1.json',
				dataCaptor,
			);
			expect(JSON.parse(dataCaptor.value)).toEqual({
				id: 'cred1',
				name: 'Test Credential',
				type: 'oauth2',
				data: {
					authUrl: '',
					accessTokenUrl: '',
					clientId: '',
					clientSecret: '',
				},
				ownedBy: {
					type: 'team',
					teamId: 'team1',
					teamName: 'Test Team',
				},
			});
		});
		it('should handle missing credentials', async () => {
			sharedCredentialsRepository.findByCredentialIds.mockResolvedValue([]);
			const result = await service.exportCredentialsToWorkFolder([
				(0, jest_mock_extended_1.mock)({ id: 'cred1' }),
			]);
			expect(result.missingIds).toHaveLength(1);
			expect(result.missingIds?.[0]).toBe('cred1');
		});
	});
	describe('exportTagsToWorkFolder', () => {
		it('should export tags to work folder', async () => {
			tagRepository.find.mockResolvedValue([(0, jest_mock_extended_1.mock)()]);
			workflowTagMappingRepository.find.mockResolvedValue([(0, jest_mock_extended_1.mock)()]);
			const result = await service.exportTagsToWorkFolder(globalAdminContext);
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});
		it('should not export empty tags', async () => {
			tagRepository.find.mockResolvedValue([]);
			const result = await service.exportTagsToWorkFolder(globalAdminContext);
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
		});
	});
	describe('exportFoldersToWorkFolder', () => {
		it('should export folders to work folder', async () => {
			folderRepository.find.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({ updatedAt: new Date(), createdAt: new Date() }),
			]);
			workflowRepository.find.mockResolvedValue([(0, jest_mock_extended_1.mock)()]);
			const result = await service.exportFoldersToWorkFolder(globalAdminContext);
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});
		it('should not export empty folders', async () => {
			folderRepository.find.mockResolvedValue([]);
			const result = await service.exportFoldersToWorkFolder(globalAdminContext);
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
		});
	});
	describe('exportVariablesToWorkFolder', () => {
		it('should export variables to work folder', async () => {
			variablesService.getAllCached.mockResolvedValue([(0, jest_mock_extended_1.mock)()]);
			const result = await service.exportVariablesToWorkFolder();
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});
		it('should not export empty variables', async () => {
			variablesService.getAllCached.mockResolvedValue([]);
			const result = await service.exportVariablesToWorkFolder();
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
		});
	});
	describe('exportWorkflowsToWorkFolder', () => {
		it('should export workflows to work folder', async () => {
			workflowRepository.findByIds.mockResolvedValue([(0, jest_mock_extended_1.mock)()]);
			sharedWorkflowRepository.findByWorkflowIds.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({
					project: (0, jest_mock_extended_1.mock)({
						type: 'personal',
						projectRelations: [
							{ role: 'project:personalOwner', user: (0, jest_mock_extended_1.mock)() },
						],
					}),
					workflow: (0, jest_mock_extended_1.mock)(),
				}),
			]);
			const result = await service.exportWorkflowsToWorkFolder([(0, jest_mock_extended_1.mock)()]);
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
		});
		it('should throw an error if workflow has no owner', async () => {
			sharedWorkflowRepository.findByWorkflowIds.mockResolvedValue([
				(0, jest_mock_extended_1.mock)({
					project: (0, jest_mock_extended_1.mock)({
						type: 'personal',
						projectRelations: [],
					}),
					workflow: (0, jest_mock_extended_1.mock)({
						id: 'test-workflow-id',
						name: 'TestWorkflow',
					}),
				}),
			]);
			await expect(
				service.exportWorkflowsToWorkFolder([(0, jest_mock_extended_1.mock)()]),
			).rejects.toThrow('Workflow "TestWorkflow" (ID: test-workflow-id) has no owner');
		});
	});
});
//# sourceMappingURL=source-control-export.service.test.js.map
