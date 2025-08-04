'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const source_control_preferences_service_ee_1 = require('@/environments.ee/source-control/source-control-preferences.service.ee');
const source_control_service_ee_1 = require('@/environments.ee/source-control/source-control.service.ee');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
describe('SourceControlService', () => {
	const preferencesService =
		new source_control_preferences_service_ee_1.SourceControlPreferencesService(
			di_1.Container.get(n8n_core_1.InstanceSettings),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
	const sourceControlImportService = (0, jest_mock_extended_1.mock)();
	const sourceControlScopedService = (0, jest_mock_extended_1.mock)();
	const tagRepository = (0, jest_mock_extended_1.mock)();
	const folderRepository = (0, jest_mock_extended_1.mock)();
	const gitService = (0, jest_mock_extended_1.mock)();
	const sourceControlService = new source_control_service_ee_1.SourceControlService(
		(0, jest_mock_extended_1.mock)(),
		gitService,
		preferencesService,
		(0, jest_mock_extended_1.mock)(),
		sourceControlImportService,
		sourceControlScopedService,
		tagRepository,
		folderRepository,
		(0, jest_mock_extended_1.mock)(),
	);
	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(sourceControlService, 'sanityCheck').mockResolvedValue(undefined);
	});
	describe('pushWorkfolder', () => {
		it('should throw an error if a file is given that is not in the workfolder', async () => {
			const user = (0, jest_mock_extended_1.mock)();
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
		});
	});
	describe('pullWorkfolder', () => {
		it('does not filter locally created credentials', async () => {
			const user = (0, jest_mock_extended_1.mock)();
			const statuses = [
				(0, jest_mock_extended_1.mock)({
					status: 'created',
					location: 'local',
					type: 'credential',
				}),
				(0, jest_mock_extended_1.mock)({
					status: 'created',
					location: 'local',
					type: 'workflow',
				}),
			];
			jest.spyOn(sourceControlService, 'getStatus').mockResolvedValueOnce(statuses);
			const result = await sourceControlService.pullWorkfolder(user, {});
			expect(result).toMatchObject({ statusCode: 409, statusResult: statuses });
		});
		it('does not filter remotely deleted credentials', async () => {
			const user = (0, jest_mock_extended_1.mock)();
			const statuses = [
				(0, jest_mock_extended_1.mock)({
					status: 'deleted',
					location: 'remote',
					type: 'credential',
				}),
				(0, jest_mock_extended_1.mock)({
					status: 'created',
					location: 'local',
					type: 'workflow',
				}),
			];
			jest.spyOn(sourceControlService, 'getStatus').mockResolvedValueOnce(statuses);
			const result = await sourceControlService.pullWorkfolder(user, {});
			expect(result).toMatchObject({ statusCode: 409, statusResult: statuses });
		});
		it('should throw an error if a file is given that is not in the workfolder', async () => {
			const user = (0, jest_mock_extended_1.mock)();
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
		});
	});
	describe('getStatus', () => {
		it('ensure updatedAt field for last deleted tag', async () => {
			const user = (0, jest_mock_extended_1.mock)();
			user.role = 'global:admin';
			sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
			sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([]);
			tagRepository.find.mockResolvedValue([]);
			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [
					{
						id: 'tag-id',
						name: 'some name',
					},
				],
				mappings: [],
			});
			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [],
				mappings: [],
			});
			folderRepository.find.mockResolvedValue([]);
			sourceControlImportService.getRemoteFoldersAndMappingsFromFile.mockResolvedValue({
				folders: [],
			});
			sourceControlImportService.getLocalFoldersAndMappingsFromDb.mockResolvedValue({
				folders: [],
			});
			const pushResult = await sourceControlService.getStatus(user, {
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
			const user = (0, jest_mock_extended_1.mock)();
			user.role = 'global:admin';
			sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([]);
			sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
			sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([]);
			tagRepository.find.mockResolvedValue([]);
			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [],
				mappings: [],
			});
			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [],
				mappings: [],
			});
			folderRepository.find.mockResolvedValue([]);
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
			const pushResult = await sourceControlService.getStatus(user, {
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
			const user = (0, jest_mock_extended_1.mock)();
			user.role = 'global:admin';
			sourceControlImportService.getRemoteVersionIdsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalVersionIdsFromDb.mockResolvedValue([
				(0, jest_mock_extended_1.mock)(),
			]);
			sourceControlImportService.getRemoteCredentialsFromFiles.mockResolvedValue([]);
			sourceControlImportService.getLocalCredentialsFromDb.mockResolvedValue([
				(0, jest_mock_extended_1.mock)(),
			]);
			sourceControlImportService.getRemoteVariablesFromFile.mockResolvedValue([]);
			sourceControlImportService.getLocalVariablesFromDb.mockResolvedValue([
				(0, jest_mock_extended_1.mock)(),
			]);
			const tag = (0, jest_mock_extended_1.mock)({ updatedAt: new Date() });
			tagRepository.find.mockResolvedValue([tag]);
			sourceControlImportService.getRemoteTagsAndMappingsFromFile.mockResolvedValue({
				tags: [],
				mappings: [],
			});
			sourceControlImportService.getLocalTagsAndMappingsFromDb.mockResolvedValue({
				tags: [tag],
				mappings: [],
			});
			const folder = (0, jest_mock_extended_1.mock)({
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
			const user = (0, jest_mock_extended_1.mock)();
			user.role = 'global:member';
			await expect(
				sourceControlService.getStatus(user, {
					direction: 'pull',
					verbose: false,
					preferLocalVersion: false,
				}),
			).rejects.toThrowError(forbidden_error_1.ForbiddenError);
		});
	});
	describe('getFileContent', () => {
		it.each([{ type: 'workflow', id: '1234', content: '{}' }])(
			'should return file content for $type',
			async ({ type, id, content }) => {
				jest.spyOn(gitService, 'getFileContent').mockResolvedValue(content);
				const user = (0, jest_mock_extended_1.mock)({ id: 'user-id', role: 'global:admin' });
				const result = await sourceControlService.getRemoteFileEntity({ user, type, id });
				expect(result).toEqual(JSON.parse(content));
			},
		);
		it.each(['folders', 'credential', 'tags', 'variables'])(
			'should throw an error if the file type is not handled',
			async (type) => {
				const user = (0, jest_mock_extended_1.mock)({ id: 'user-id', role: 'global:admin' });
				await expect(
					sourceControlService.getRemoteFileEntity({ user, type, id: 'unknown' }),
				).rejects.toThrow(`Unsupported file type: ${type}`);
			},
		);
		it('should fail if the git service fails to get the file content', async () => {
			jest.spyOn(gitService, 'getFileContent').mockRejectedValue(new Error('Git service error'));
			const user = (0, jest_mock_extended_1.mock)({ id: 'user-id', role: 'global:admin' });
			await expect(
				sourceControlService.getRemoteFileEntity({ user, type: 'workflow', id: '1234' }),
			).rejects.toThrow('Git service error');
		});
		it('should throw an error if the user does not have access to the project', async () => {
			const user = (0, jest_mock_extended_1.mock)({
				id: 'user-id',
				role: 'global:member',
			});
			jest
				.spyOn(sourceControlScopedService, 'getWorkflowsInAdminProjectsFromContext')
				.mockResolvedValue([]);
			await expect(
				sourceControlService.getRemoteFileEntity({ user, type: 'workflow', id: '1234' }),
			).rejects.toThrow('You are not allowed to access workflow with id 1234');
		});
		it('should return content for an authorized workflow', async () => {
			const user = (0, jest_mock_extended_1.mock)({ id: 'user-id', role: 'global:member' });
			jest
				.spyOn(sourceControlScopedService, 'getWorkflowsInAdminProjectsFromContext')
				.mockResolvedValue([{ id: '1234' }]);
			jest.spyOn(gitService, 'getFileContent').mockResolvedValue('{}');
			const result = await sourceControlService.getRemoteFileEntity({
				user,
				type: 'workflow',
				id: '1234',
			});
			expect(result).toEqual({});
		});
	});
});
//# sourceMappingURL=source-control.service.test.js.map
