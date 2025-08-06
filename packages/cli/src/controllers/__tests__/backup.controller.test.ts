import type { Request, Response } from 'express';
import { mock } from 'jest-mock-extended';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';

import { BackupController } from '../backup.controller';
import { BackupService } from '../../services/backup.service';
import { RestoreService } from '../../services/restore.service';
import { BadRequestError } from '../../errors/response-errors/bad-request.error';
import { InternalServerError } from '../../errors/response-errors/internal-server.error';
import { NotFoundError } from '../../errors/response-errors/not-found.error';

describe('BackupController', () => {
	const logger = mockInstance(Logger);
	const backupService = mock<BackupService>();
	const restoreService = mock<RestoreService>();
	const controller = new BackupController(backupService, restoreService);

	const mockBackupResponse = {
		id: 'backup-123',
		name: 'Test Backup',
		description: 'Test backup description',
		size: 1024,
		createdAt: new Date('2023-01-01'),
		checksums: {
			workflows: 'abc123',
			credentials: 'def456',
			settings: 'ghi789',
			overall: 'jkl012',
		},
		metadata: {
			workflowCount: 5,
			credentialCount: 2,
			settingsCount: 10,
			binaryDataCount: 0,
			version: '1.0.0',
			encrypted: false,
		},
	};

	const mockRestoreResponse = {
		success: true,
		restored: {
			workflows: 5,
			credentials: 2,
			settings: 10,
			binaryData: 0,
		},
		conflicts: [],
		duration: 5000,
		backupId: 'backup-123',
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('createBackup', () => {
		it('should create backup successfully', async () => {
			// Arrange
			const req = mock<Request>({
				body: {
					includeCredentials: true,
					includeBinaryData: false,
					includeSettings: true,
					name: 'Test Backup',
					description: 'Test description',
				},
			});
			const res = mock<Response>();

			backupService.createBackup.mockResolvedValue(mockBackupResponse);

			// Act
			const result = await controller.createBackup(req, res);

			// Assert
			expect(backupService.createBackup).toHaveBeenCalledWith({
				includeCredentials: true,
				includeBinaryData: false,
				includeSettings: true,
				encryption: false,
				name: 'Test Backup',
				description: 'Test description',
			});
			expect(result).toEqual(mockBackupResponse);
		});

		it('should throw BadRequestError when encryption enabled without password', async () => {
			// Arrange
			const req = mock<Request>({
				body: {
					encryption: true,
					// password missing
				},
			});
			const res = mock<Response>();

			// Act & Assert
			await expect(controller.createBackup(req, res)).rejects.toThrow(BadRequestError);
			await expect(controller.createBackup(req, res)).rejects.toThrow(
				'Password is required when encryption is enabled',
			);
		});

		it('should throw InternalServerError when backup service fails', async () => {
			// Arrange
			const req = mock<Request>({
				body: {
					includeCredentials: true,
				},
			});
			const res = mock<Response>();

			backupService.createBackup.mockRejectedValue(new Error('Service failure'));

			// Act & Assert
			await expect(controller.createBackup(req, res)).rejects.toThrow(InternalServerError);
			await expect(controller.createBackup(req, res)).rejects.toThrow(
				'Backup creation failed: Service failure',
			);
		});
	});

	describe('listBackups', () => {
		it('should return list of backups', async () => {
			// Arrange
			const backups = [mockBackupResponse];
			backupService.listBackups.mockResolvedValue(backups);

			// Act
			const result = await controller.listBackups();

			// Assert
			expect(backupService.listBackups).toHaveBeenCalled();
			expect(result).toEqual(backups);
		});

		it('should throw InternalServerError when service fails', async () => {
			// Arrange
			backupService.listBackups.mockRejectedValue(new Error('Service failure'));

			// Act & Assert
			await expect(controller.listBackups()).rejects.toThrow(InternalServerError);
		});
	});

	describe('getBackup', () => {
		it('should return backup when found', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-123' },
			});

			backupService.getBackup.mockResolvedValue(mockBackupResponse);

			// Act
			const result = await controller.getBackup(req);

			// Assert
			expect(backupService.getBackup).toHaveBeenCalledWith('backup-123');
			expect(result).toEqual(mockBackupResponse);
		});

		it('should throw NotFoundError when backup not found', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-404' },
			});

			backupService.getBackup.mockResolvedValue(null);

			// Act & Assert
			await expect(controller.getBackup(req)).rejects.toThrow(NotFoundError);
			await expect(controller.getBackup(req)).rejects.toThrow(
				'Backup with ID backup-404 not found',
			);
		});
	});

	describe('restoreBackup', () => {
		it('should restore backup successfully', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }, {}, any>>({
				params: { backupId: 'backup-123' },
				body: {
					password: 'secret',
					overwriteExisting: true,
					validateIntegrity: true,
				},
			});

			restoreService.restoreBackup.mockResolvedValue(mockRestoreResponse);

			// Act
			const result = await controller.restoreBackup(req);

			// Assert
			expect(restoreService.restoreBackup).toHaveBeenCalledWith({
				backupId: 'backup-123',
				password: 'secret',
				overwriteExisting: true,
				validateIntegrity: true,
			});
			expect(result).toEqual(mockRestoreResponse);
		});

		it('should handle restore failures', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }, {}, any>>({
				params: { backupId: 'backup-123' },
				body: {},
			});

			restoreService.restoreBackup.mockRejectedValue(new Error('Restore failed'));

			// Act & Assert
			await expect(controller.restoreBackup(req)).rejects.toThrow(InternalServerError);
		});
	});

	describe('downloadBackup', () => {
		it('should stream backup download', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-123' },
			});
			const res = mock<Response>();
			const mockStream = { pipe: jest.fn() };

			backupService.getBackupStream.mockResolvedValue(mockStream as any);
			backupService.getBackup.mockResolvedValue(mockBackupResponse);

			// Act
			await controller.downloadBackup(req, res);

			// Assert
			expect(backupService.getBackupStream).toHaveBeenCalledWith('backup-123');
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="Test Backup.n8n-backup"',
			);
			expect(mockStream.pipe).toHaveBeenCalledWith(res);
		});

		it('should throw NotFoundError when backup stream not available', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-404' },
			});
			const res = mock<Response>();

			backupService.getBackupStream.mockResolvedValue(null);

			// Act & Assert
			await expect(controller.downloadBackup(req, res)).rejects.toThrow(NotFoundError);
		});
	});

	describe('deleteBackup', () => {
		it('should delete backup successfully', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-123' },
			});

			backupService.deleteBackup.mockResolvedValue(true);

			// Act
			const result = await controller.deleteBackup(req);

			// Assert
			expect(backupService.deleteBackup).toHaveBeenCalledWith('backup-123');
			expect(result).toEqual({ success: true });
		});

		it('should throw NotFoundError when backup not found', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-404' },
			});

			backupService.deleteBackup.mockResolvedValue(false);

			// Act & Assert
			await expect(controller.deleteBackup(req)).rejects.toThrow(NotFoundError);
		});
	});

	describe('verifyBackup', () => {
		it('should verify backup integrity', async () => {
			// Arrange
			const req = mock<Request<{ backupId: string }>>({
				params: { backupId: 'backup-123' },
			});

			const verificationResult = {
				valid: true,
				checksums: {
					workflows: true,
					credentials: true,
					settings: true,
				},
			};

			backupService.verifyBackupIntegrity.mockResolvedValue(verificationResult);

			// Act
			const result = await controller.verifyBackup(req);

			// Assert
			expect(backupService.verifyBackupIntegrity).toHaveBeenCalledWith('backup-123');
			expect(result).toEqual(verificationResult);
		});
	});

	describe('getScheduleStatus', () => {
		it('should return schedule status', async () => {
			// Arrange
			const scheduleStatus = {
				enabled: true,
				schedule: '0 0 * * *',
				lastBackup: new Date('2023-01-01'),
				nextBackup: new Date('2023-01-02'),
			};

			backupService.getScheduleStatus.mockResolvedValue(scheduleStatus);

			// Act
			const result = await controller.getScheduleStatus();

			// Assert
			expect(backupService.getScheduleStatus).toHaveBeenCalled();
			expect(result).toEqual(scheduleStatus);
		});
	});

	describe('setBackupSchedule', () => {
		it('should configure backup schedule', async () => {
			// Arrange
			const req = mock<Request<{}, {}, any>>({
				body: {
					schedule: '0 0 * * *',
					enabled: true,
					backupOptions: {
						includeCredentials: true,
						includeSettings: true,
					},
				},
			});

			backupService.setBackupSchedule.mockResolvedValue();

			// Act
			const result = await controller.setBackupSchedule(req);

			// Assert
			expect(backupService.setBackupSchedule).toHaveBeenCalledWith({
				schedule: '0 0 * * *',
				enabled: true,
				backupOptions: {
					includeCredentials: true,
					includeSettings: true,
				},
			});
			expect(result).toEqual({ success: true });
		});

		it('should throw BadRequestError when schedule is empty', async () => {
			// Arrange
			const req = mock<Request<{}, {}, any>>({
				body: {
					schedule: '',
					enabled: true,
					backupOptions: {},
				},
			});

			// Act & Assert
			await expect(controller.setBackupSchedule(req)).rejects.toThrow(BadRequestError);
			await expect(controller.setBackupSchedule(req)).rejects.toThrow(
				'Schedule configuration is required',
			);
		});
	});
});
