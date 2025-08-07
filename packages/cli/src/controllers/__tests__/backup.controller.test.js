'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const backup_controller_1 = require('../backup.controller');
const bad_request_error_1 = require('../../errors/response-errors/bad-request.error');
const internal_server_error_1 = require('../../errors/response-errors/internal-server.error');
const not_found_error_1 = require('../../errors/response-errors/not-found.error');
describe('BackupController', () => {
	const logger = (0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	const backupService = (0, jest_mock_extended_1.mock)();
	const restoreService = (0, jest_mock_extended_1.mock)();
	const controller = new backup_controller_1.BackupController(backupService, restoreService);
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
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					includeCredentials: true,
					includeBinaryData: false,
					includeSettings: true,
					name: 'Test Backup',
					description: 'Test description',
				},
			});
			const res = (0, jest_mock_extended_1.mock)();
			backupService.createBackup.mockResolvedValue(mockBackupResponse);
			const result = await controller.createBackup(req, res);
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
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					encryption: true,
				},
			});
			const res = (0, jest_mock_extended_1.mock)();
			await expect(controller.createBackup(req, res)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.createBackup(req, res)).rejects.toThrow(
				'Password is required when encryption is enabled',
			);
		});
		it('should throw InternalServerError when backup service fails', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					includeCredentials: true,
				},
			});
			const res = (0, jest_mock_extended_1.mock)();
			backupService.createBackup.mockRejectedValue(new Error('Service failure'));
			await expect(controller.createBackup(req, res)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
			await expect(controller.createBackup(req, res)).rejects.toThrow(
				'Backup creation failed: Service failure',
			);
		});
	});
	describe('listBackups', () => {
		it('should return list of backups', async () => {
			const backups = [mockBackupResponse];
			backupService.listBackups.mockResolvedValue(backups);
			const result = await controller.listBackups();
			expect(backupService.listBackups).toHaveBeenCalled();
			expect(result).toEqual(backups);
		});
		it('should throw InternalServerError when service fails', async () => {
			backupService.listBackups.mockRejectedValue(new Error('Service failure'));
			await expect(controller.listBackups()).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('getBackup', () => {
		it('should return backup when found', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-123' },
			});
			backupService.getBackup.mockResolvedValue(mockBackupResponse);
			const result = await controller.getBackup(req);
			expect(backupService.getBackup).toHaveBeenCalledWith('backup-123');
			expect(result).toEqual(mockBackupResponse);
		});
		it('should throw NotFoundError when backup not found', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-404' },
			});
			backupService.getBackup.mockResolvedValue(null);
			await expect(controller.getBackup(req)).rejects.toThrow(not_found_error_1.NotFoundError);
			await expect(controller.getBackup(req)).rejects.toThrow(
				'Backup with ID backup-404 not found',
			);
		});
	});
	describe('restoreBackup', () => {
		it('should restore backup successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-123' },
				body: {
					password: 'secret',
					overwriteExisting: true,
					validateIntegrity: true,
				},
			});
			restoreService.restoreBackup.mockResolvedValue(mockRestoreResponse);
			const result = await controller.restoreBackup(req);
			expect(restoreService.restoreBackup).toHaveBeenCalledWith({
				backupId: 'backup-123',
				password: 'secret',
				overwriteExisting: true,
				validateIntegrity: true,
			});
			expect(result).toEqual(mockRestoreResponse);
		});
		it('should handle restore failures', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-123' },
				body: {},
			});
			restoreService.restoreBackup.mockRejectedValue(new Error('Restore failed'));
			await expect(controller.restoreBackup(req)).rejects.toThrow(
				internal_server_error_1.InternalServerError,
			);
		});
	});
	describe('downloadBackup', () => {
		it('should stream backup download', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-123' },
			});
			const res = (0, jest_mock_extended_1.mock)();
			const mockStream = { pipe: jest.fn() };
			backupService.getBackupStream.mockResolvedValue(mockStream);
			backupService.getBackup.mockResolvedValue(mockBackupResponse);
			await controller.downloadBackup(req, res);
			expect(backupService.getBackupStream).toHaveBeenCalledWith('backup-123');
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="Test Backup.n8n-backup"',
			);
			expect(mockStream.pipe).toHaveBeenCalledWith(res);
		});
		it('should throw NotFoundError when backup stream not available', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-404' },
			});
			const res = (0, jest_mock_extended_1.mock)();
			backupService.getBackupStream.mockResolvedValue(null);
			await expect(controller.downloadBackup(req, res)).rejects.toThrow(
				not_found_error_1.NotFoundError,
			);
		});
	});
	describe('deleteBackup', () => {
		it('should delete backup successfully', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-123' },
			});
			backupService.deleteBackup.mockResolvedValue(true);
			const result = await controller.deleteBackup(req);
			expect(backupService.deleteBackup).toHaveBeenCalledWith('backup-123');
			expect(result).toEqual({ success: true });
		});
		it('should throw NotFoundError when backup not found', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				params: { backupId: 'backup-404' },
			});
			backupService.deleteBackup.mockResolvedValue(false);
			await expect(controller.deleteBackup(req)).rejects.toThrow(not_found_error_1.NotFoundError);
		});
	});
	describe('verifyBackup', () => {
		it('should verify backup integrity', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.verifyBackup(req);
			expect(backupService.verifyBackupIntegrity).toHaveBeenCalledWith('backup-123');
			expect(result).toEqual(verificationResult);
		});
	});
	describe('getScheduleStatus', () => {
		it('should return schedule status', async () => {
			const scheduleStatus = {
				enabled: true,
				schedule: '0 0 * * *',
				lastBackup: new Date('2023-01-01'),
				nextBackup: new Date('2023-01-02'),
			};
			backupService.getScheduleStatus.mockResolvedValue(scheduleStatus);
			const result = await controller.getScheduleStatus();
			expect(backupService.getScheduleStatus).toHaveBeenCalled();
			expect(result).toEqual(scheduleStatus);
		});
	});
	describe('setBackupSchedule', () => {
		it('should configure backup schedule', async () => {
			const req = (0, jest_mock_extended_1.mock)({
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
			const result = await controller.setBackupSchedule(req);
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
			const req = (0, jest_mock_extended_1.mock)({
				body: {
					schedule: '',
					enabled: true,
					backupOptions: {},
				},
			});
			await expect(controller.setBackupSchedule(req)).rejects.toThrow(
				bad_request_error_1.BadRequestError,
			);
			await expect(controller.setBackupSchedule(req)).rejects.toThrow(
				'Schedule configuration is required',
			);
		});
	});
});
//# sourceMappingURL=backup.controller.test.js.map
