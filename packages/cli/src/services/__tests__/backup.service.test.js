'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = require('fs');
const jest_mock_extended_1 = require('jest-mock-extended');
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const backup_service_1 = require('../backup.service');
jest.mock('fs', () => ({
	promises: {
		mkdir: jest.fn(),
		writeFile: jest.fn(),
		readFile: jest.fn(),
		readdir: jest.fn(),
		stat: jest.fn(),
		access: jest.fn(),
		rm: jest.fn(),
	},
	createReadStream: jest.fn(),
	createWriteStream: jest.fn(),
}));
jest.mock('crypto', () => ({
	createHash: jest.fn(() => ({
		update: jest.fn(),
		digest: jest.fn(() => 'mock-hash'),
	})),
	createCipher: jest.fn(() => ({
		update: jest.fn(() => 'encrypted-'),
		final: jest.fn(() => 'data'),
	})),
}));
describe('BackupService', () => {
	const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const instanceSettings = (0, jest_mock_extended_1.mock)({
		userFolder: '/test/user',
	});
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	const credentialsRepository = (0, jest_mock_extended_1.mock)();
	const settingsRepository = (0, jest_mock_extended_1.mock)();
	const installedPackagesRepository = (0, jest_mock_extended_1.mock)();
	const binaryDataService = (0, jest_mock_extended_1.mock)();
	let backupService;
	const mockWorkflows = [
		{
			id: '1',
			name: 'Test Workflow 1',
			active: true,
			nodes: [],
			connections: {},
		},
		{
			id: '2',
			name: 'Test Workflow 2',
			active: false,
			nodes: [],
			connections: {},
		},
	];
	const mockCredentials = [
		{
			id: '1',
			name: 'Test Credential',
			type: 'testCredential',
			data: 'encrypted-data',
		},
	];
	const mockSettings = [
		{
			key: 'setting1',
			value: 'value1',
		},
	];
	beforeEach(() => {
		jest.clearAllMocks();
		backupService = new backup_service_1.BackupService(
			logger,
			instanceSettings,
			workflowRepository,
			credentialsRepository,
			settingsRepository,
			installedPackagesRepository,
			binaryDataService,
		);
		fs_1.promises.mkdir.mockResolvedValue(undefined);
		fs_1.promises.writeFile.mockResolvedValue(undefined);
		fs_1.promises.readFile.mockResolvedValue('{}');
		fs_1.promises.stat.mockResolvedValue({ size: 1024 });
		fs_1.promises.readdir.mockResolvedValue([]);
		workflowRepository.find.mockResolvedValue(mockWorkflows);
		credentialsRepository.find.mockResolvedValue(mockCredentials);
		settingsRepository.find.mockResolvedValue(mockSettings);
		installedPackagesRepository.find.mockResolvedValue([]);
	});
	describe('createBackup', () => {
		it('should create backup with workflows only', async () => {
			const options = {
				includeCredentials: false,
				includeBinaryData: false,
				includeSettings: false,
			};
			const result = await backupService.createBackup(options);
			expect(result).toBeDefined();
			expect(result.id).toMatch(/^backup-/);
			expect(result.metadata.workflowCount).toBe(2);
			expect(result.metadata.credentialCount).toBe(0);
			expect(result.metadata.settingsCount).toBe(0);
			expect(result.metadata.encrypted).toBe(false);
			expect(fs_1.promises.mkdir).toHaveBeenCalledWith(expect.stringContaining(result.id), {
				recursive: true,
			});
			expect(workflowRepository.find).toHaveBeenCalled();
		});
		it('should create encrypted backup with password', async () => {
			const options = {
				includeCredentials: true,
				includeBinaryData: false,
				includeSettings: true,
				encryption: true,
				password: 'secret123',
				name: 'Encrypted Backup',
			};
			const result = await backupService.createBackup(options);
			expect(result.metadata.encrypted).toBe(true);
			expect(result.name).toBe('Encrypted Backup');
			expect(result.metadata.credentialCount).toBe(1);
			expect(result.metadata.settingsCount).toBe(1);
		});
		it('should include all components when requested', async () => {
			const options = {
				includeCredentials: true,
				includeBinaryData: true,
				includeSettings: true,
			};
			const result = await backupService.createBackup(options);
			expect(result.metadata.workflowCount).toBe(2);
			expect(result.metadata.credentialCount).toBe(1);
			expect(result.metadata.settingsCount).toBe(1);
			expect(workflowRepository.find).toHaveBeenCalled();
			expect(credentialsRepository.find).toHaveBeenCalled();
			expect(settingsRepository.find).toHaveBeenCalled();
			expect(installedPackagesRepository.find).toHaveBeenCalled();
		});
		it('should handle backup creation failure', async () => {
			const options = {
				includeCredentials: false,
				includeBinaryData: false,
				includeSettings: false,
			};
			workflowRepository.find.mockRejectedValue(new Error('Database error'));
			await expect(backupService.createBackup(options)).rejects.toThrow();
		});
	});
	describe('listBackups', () => {
		it('should return empty list when no backups exist', async () => {
			fs_1.promises.readFile.mockRejectedValue(new Error('File not found'));
			const result = await backupService.listBackups();
			expect(result).toEqual([]);
		});
		it('should return sorted backup list', async () => {
			const mockBackupsData = {
				'backup-1': {
					id: 'backup-1',
					createdAt: '2023-01-01T00:00:00Z',
					name: 'Backup 1',
				},
				'backup-2': {
					id: 'backup-2',
					createdAt: '2023-01-02T00:00:00Z',
					name: 'Backup 2',
				},
			};
			fs_1.promises.readFile.mockResolvedValue(JSON.stringify(mockBackupsData));
			const result = await backupService.listBackups();
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('backup-2');
			expect(result[1].id).toBe('backup-1');
		});
	});
	describe('getBackup', () => {
		it('should return backup when found', async () => {
			const mockBackupsData = {
				'backup-123': {
					id: 'backup-123',
					name: 'Test Backup',
				},
			};
			fs_1.promises.readFile.mockResolvedValue(JSON.stringify(mockBackupsData));
			const result = await backupService.getBackup('backup-123');
			expect(result).toBeDefined();
			expect(result.id).toBe('backup-123');
			expect(result.downloadUrl).toBe('/backup/backup-123/download');
		});
		it('should return null when backup not found', async () => {
			fs_1.promises.readFile.mockResolvedValue('{}');
			const result = await backupService.getBackup('backup-404');
			expect(result).toBeNull();
		});
	});
	describe('deleteBackup', () => {
		it('should delete backup successfully', async () => {
			const mockBackupsData = {
				'backup-123': { id: 'backup-123', name: 'Test Backup' },
				'backup-456': { id: 'backup-456', name: 'Other Backup' },
			};
			fs_1.promises.readFile.mockResolvedValue(JSON.stringify(mockBackupsData));
			fs_1.promises.rm.mockResolvedValue(undefined);
			const result = await backupService.deleteBackup('backup-123');
			expect(result).toBe(true);
			expect(fs_1.promises.rm).toHaveBeenCalledWith(expect.stringContaining('backup-123'), {
				recursive: true,
				force: true,
			});
			const expectedUpdatedMetadata = {
				'backup-456': { id: 'backup-456', name: 'Other Backup' },
			};
			expect(fs_1.promises.writeFile).toHaveBeenCalledWith(
				expect.stringContaining('backups-meta.json'),
				JSON.stringify(expectedUpdatedMetadata, null, 2),
			);
		});
		it('should handle deletion failure gracefully', async () => {
			fs_1.promises.rm.mockRejectedValue(new Error('Permission denied'));
			const result = await backupService.deleteBackup('backup-123');
			expect(result).toBe(false);
		});
	});
	describe('verifyBackupIntegrity', () => {
		it('should verify backup integrity successfully', async () => {
			const mockManifest = {
				files: {
					workflows: 'workflows.json',
					credentials: 'credentials.json',
				},
				checksums: {
					workflows: 'mock-hash',
					credentials: 'mock-hash',
					overall: 'mock-hash',
				},
			};
			fs_1.promises.readFile.mockResolvedValue(JSON.stringify(mockManifest));
			jest.spyOn(backupService, 'verifyFileChecksum').mockResolvedValue(true);
			const result = await backupService.verifyBackupIntegrity('backup-123');
			expect(result.valid).toBe(true);
			expect(result.checksums.workflows).toBe(true);
			expect(result.checksums.credentials).toBe(true);
			expect(result.errors).toBeUndefined();
		});
		it('should detect checksum mismatch', async () => {
			const mockManifest = {
				files: {
					workflows: 'workflows.json',
				},
				checksums: {
					workflows: 'expected-hash',
					overall: 'mock-hash',
				},
			};
			fs_1.promises.readFile.mockResolvedValue(JSON.stringify(mockManifest));
			jest.spyOn(backupService, 'verifyFileChecksum').mockResolvedValue(false);
			const result = await backupService.verifyBackupIntegrity('backup-123');
			expect(result.valid).toBe(false);
			expect(result.checksums.workflows).toBe(false);
			expect(result.errors).toContain('Workflows checksum mismatch');
		});
	});
	describe('getScheduleStatus', () => {
		it('should return disabled status when no schedule configured', async () => {
			const result = await backupService.getScheduleStatus();
			expect(result.enabled).toBe(false);
			expect(result.schedule).toBeUndefined();
		});
	});
	describe('setBackupSchedule', () => {
		it('should configure backup schedule', async () => {
			const config = {
				schedule: '0 0 * * *',
				enabled: true,
				backupOptions: {
					includeCredentials: true,
					includeSettings: true,
				},
			};
			await backupService.setBackupSchedule(config);
			expect(fs_1.promises.writeFile).toHaveBeenCalledWith(
				expect.stringContaining('schedule-config.json'),
				JSON.stringify(config, null, 2),
			);
		});
	});
});
//# sourceMappingURL=backup.service.test.js.map
