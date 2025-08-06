import { promises as fs } from 'fs';
import { join } from 'path';
import { mock } from 'jest-mock-extended';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { WorkflowEntity, CredentialsEntity, SettingsEntity, InstalledPackages } from '@n8n/db';
import {
	WorkflowRepository,
	CredentialsRepository,
	SettingsRepository,
	InstalledPackagesRepository,
} from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import { BinaryDataService } from 'n8n-core';

import { BackupService } from '../backup.service';

// Mock fs promises
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

// Mock crypto
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
	const logger = mockInstance(Logger);
	const instanceSettings = mock<InstanceSettings>({
		userFolder: '/test/user',
	});
	const workflowRepository = mock<WorkflowRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const settingsRepository = mock<SettingsRepository>();
	const installedPackagesRepository = mock<InstalledPackagesRepository>();
	const binaryDataService = mock<BinaryDataService>();

	let backupService: BackupService;

	const mockWorkflows: WorkflowEntity[] = [
		{
			id: '1',
			name: 'Test Workflow 1',
			active: true,
			nodes: [],
			connections: {},
		} as WorkflowEntity,
		{
			id: '2',
			name: 'Test Workflow 2',
			active: false,
			nodes: [],
			connections: {},
		} as WorkflowEntity,
	];

	const mockCredentials: CredentialsEntity[] = [
		{
			id: '1',
			name: 'Test Credential',
			type: 'testCredential',
			data: 'encrypted-data',
		} as CredentialsEntity,
	];

	const mockSettings: SettingsEntity[] = [
		{
			key: 'setting1',
			value: 'value1',
		} as SettingsEntity,
	];

	beforeEach(() => {
		jest.clearAllMocks();

		backupService = new BackupService(
			logger,
			instanceSettings,
			workflowRepository,
			credentialsRepository,
			settingsRepository,
			installedPackagesRepository,
			binaryDataService,
		);

		// Setup default mocks
		(fs.mkdir as jest.Mock).mockResolvedValue(undefined);
		(fs.writeFile as jest.Mock).mockResolvedValue(undefined);
		(fs.readFile as jest.Mock).mockResolvedValue('{}');
		(fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
		(fs.readdir as jest.Mock).mockResolvedValue([]);

		workflowRepository.find.mockResolvedValue(mockWorkflows);
		credentialsRepository.find.mockResolvedValue(mockCredentials);
		settingsRepository.find.mockResolvedValue(mockSettings);
		installedPackagesRepository.find.mockResolvedValue([]);
	});

	describe('createBackup', () => {
		it('should create backup with workflows only', async () => {
			// Arrange
			const options = {
				includeCredentials: false,
				includeBinaryData: false,
				includeSettings: false,
			};

			// Act
			const result = await backupService.createBackup(options);

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toMatch(/^backup-/);
			expect(result.metadata.workflowCount).toBe(2);
			expect(result.metadata.credentialCount).toBe(0);
			expect(result.metadata.settingsCount).toBe(0);
			expect(result.metadata.encrypted).toBe(false);

			expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining(result.id), {
				recursive: true,
			});
			expect(workflowRepository.find).toHaveBeenCalled();
		});

		it('should create encrypted backup with password', async () => {
			// Arrange
			const options = {
				includeCredentials: true,
				includeBinaryData: false,
				includeSettings: true,
				encryption: true,
				password: 'secret123',
				name: 'Encrypted Backup',
			};

			// Act
			const result = await backupService.createBackup(options);

			// Assert
			expect(result.metadata.encrypted).toBe(true);
			expect(result.name).toBe('Encrypted Backup');
			expect(result.metadata.credentialCount).toBe(1);
			expect(result.metadata.settingsCount).toBe(1);
		});

		it('should include all components when requested', async () => {
			// Arrange
			const options = {
				includeCredentials: true,
				includeBinaryData: true,
				includeSettings: true,
			};

			// Act
			const result = await backupService.createBackup(options);

			// Assert
			expect(result.metadata.workflowCount).toBe(2);
			expect(result.metadata.credentialCount).toBe(1);
			expect(result.metadata.settingsCount).toBe(1);

			expect(workflowRepository.find).toHaveBeenCalled();
			expect(credentialsRepository.find).toHaveBeenCalled();
			expect(settingsRepository.find).toHaveBeenCalled();
			expect(installedPackagesRepository.find).toHaveBeenCalled();
		});

		it('should handle backup creation failure', async () => {
			// Arrange
			const options = {
				includeCredentials: false,
				includeBinaryData: false,
				includeSettings: false,
			};

			workflowRepository.find.mockRejectedValue(new Error('Database error'));

			// Act & Assert
			await expect(backupService.createBackup(options)).rejects.toThrow();
		});
	});

	describe('listBackups', () => {
		it('should return empty list when no backups exist', async () => {
			// Arrange
			(fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

			// Act
			const result = await backupService.listBackups();

			// Assert
			expect(result).toEqual([]);
		});

		it('should return sorted backup list', async () => {
			// Arrange
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

			(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockBackupsData));

			// Act
			const result = await backupService.listBackups();

			// Assert
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('backup-2'); // Most recent first
			expect(result[1].id).toBe('backup-1');
		});
	});

	describe('getBackup', () => {
		it('should return backup when found', async () => {
			// Arrange
			const mockBackupsData = {
				'backup-123': {
					id: 'backup-123',
					name: 'Test Backup',
				},
			};

			(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockBackupsData));

			// Act
			const result = await backupService.getBackup('backup-123');

			// Assert
			expect(result).toBeDefined();
			expect(result!.id).toBe('backup-123');
			expect(result!.downloadUrl).toBe('/backup/backup-123/download');
		});

		it('should return null when backup not found', async () => {
			// Arrange
			(fs.readFile as jest.Mock).mockResolvedValue('{}');

			// Act
			const result = await backupService.getBackup('backup-404');

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('deleteBackup', () => {
		it('should delete backup successfully', async () => {
			// Arrange
			const mockBackupsData = {
				'backup-123': { id: 'backup-123', name: 'Test Backup' },
				'backup-456': { id: 'backup-456', name: 'Other Backup' },
			};

			(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockBackupsData));
			(fs.rm as jest.Mock).mockResolvedValue(undefined);

			// Act
			const result = await backupService.deleteBackup('backup-123');

			// Assert
			expect(result).toBe(true);
			expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining('backup-123'), {
				recursive: true,
				force: true,
			});

			// Verify metadata update
			const expectedUpdatedMetadata = {
				'backup-456': { id: 'backup-456', name: 'Other Backup' },
			};
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.stringContaining('backups-meta.json'),
				JSON.stringify(expectedUpdatedMetadata, null, 2),
			);
		});

		it('should handle deletion failure gracefully', async () => {
			// Arrange
			(fs.rm as jest.Mock).mockRejectedValue(new Error('Permission denied'));

			// Act
			const result = await backupService.deleteBackup('backup-123');

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('verifyBackupIntegrity', () => {
		it('should verify backup integrity successfully', async () => {
			// Arrange
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

			(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockManifest));

			// Mock file checksum calculation
			jest.spyOn(backupService as any, 'verifyFileChecksum').mockResolvedValue(true);

			// Act
			const result = await backupService.verifyBackupIntegrity('backup-123');

			// Assert
			expect(result.valid).toBe(true);
			expect(result.checksums.workflows).toBe(true);
			expect(result.checksums.credentials).toBe(true);
			expect(result.errors).toBeUndefined();
		});

		it('should detect checksum mismatch', async () => {
			// Arrange
			const mockManifest = {
				files: {
					workflows: 'workflows.json',
				},
				checksums: {
					workflows: 'expected-hash',
					overall: 'mock-hash',
				},
			};

			(fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockManifest));

			// Mock checksum mismatch
			jest.spyOn(backupService as any, 'verifyFileChecksum').mockResolvedValue(false);

			// Act
			const result = await backupService.verifyBackupIntegrity('backup-123');

			// Assert
			expect(result.valid).toBe(false);
			expect(result.checksums.workflows).toBe(false);
			expect(result.errors).toContain('Workflows checksum mismatch');
		});
	});

	describe('getScheduleStatus', () => {
		it('should return disabled status when no schedule configured', async () => {
			// Act
			const result = await backupService.getScheduleStatus();

			// Assert
			expect(result.enabled).toBe(false);
			expect(result.schedule).toBeUndefined();
		});
	});

	describe('setBackupSchedule', () => {
		it('should configure backup schedule', async () => {
			// Arrange
			const config = {
				schedule: '0 0 * * *',
				enabled: true,
				backupOptions: {
					includeCredentials: true,
					includeSettings: true,
				},
			};

			// Act
			await backupService.setBackupSchedule(config);

			// Assert
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.stringContaining('schedule-config.json'),
				JSON.stringify(config, null, 2),
			);
		});
	});
});
