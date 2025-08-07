'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BackupController = void 0;
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const backup_service_1 = require('@/services/backup.service');
const restore_service_1 = require('@/services/restore.service');
let BackupController = class BackupController {
	constructor(backupService, restoreService) {
		this.backupService = backupService;
		this.restoreService = restoreService;
		this.logger = di_1.Container.get(backend_common_1.Logger);
	}
	async createBackup(req, res) {
		try {
			const {
				includeCredentials = true,
				includeBinaryData = false,
				includeSettings = true,
				encryption = false,
				password,
				name,
				description,
			} = req.body;
			if (encryption && !password) {
				throw new bad_request_error_1.BadRequestError(
					'Password is required when encryption is enabled',
				);
			}
			this.logger.info('Starting backup creation', {
				includeCredentials,
				includeBinaryData,
				includeSettings,
				encryption,
				hasName: !!name,
			});
			const backup = await this.backupService.createBackup({
				includeCredentials,
				includeBinaryData,
				includeSettings,
				encryption,
				password,
				name,
				description,
			});
			this.logger.info('Backup created successfully', {
				backupId: backup.id,
				size: backup.size,
				duration: backup.metadata,
			});
			return backup;
		} catch (error) {
			this.logger.error('Failed to create backup', { error });
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			const message =
				error instanceof Error ? error.message : 'Unknown error during backup creation';
			throw new internal_server_error_1.InternalServerError(`Backup creation failed: ${message}`);
		}
	}
	async listBackups() {
		try {
			return await this.backupService.listBackups();
		} catch (error) {
			this.logger.error('Failed to list backups', { error });
			throw new internal_server_error_1.InternalServerError('Failed to retrieve backup list');
		}
	}
	async getBackup(req) {
		try {
			const backup = await this.backupService.getBackup(req.params.backupId);
			if (!backup) {
				throw new not_found_error_1.NotFoundError(
					`Backup with ID ${req.params.backupId} not found`,
				);
			}
			return backup;
		} catch (error) {
			if (error instanceof not_found_error_1.NotFoundError) {
				throw error;
			}
			this.logger.error('Failed to get backup', { error, backupId: req.params.backupId });
			throw new internal_server_error_1.InternalServerError(
				'Failed to retrieve backup information',
			);
		}
	}
	async restoreBackup(req) {
		try {
			const { password, overwriteExisting = false, validateIntegrity = true } = req.body;
			const { backupId } = req.params;
			this.logger.info('Starting backup restoration', {
				backupId,
				overwriteExisting,
				validateIntegrity,
			});
			const result = await this.restoreService.restoreBackup({
				backupId,
				password,
				overwriteExisting,
				validateIntegrity,
			});
			this.logger.info('Backup restored successfully', {
				backupId,
				restored: result.restored,
				conflicts: result.conflicts.length,
				duration: result.duration,
			});
			return result;
		} catch (error) {
			this.logger.error('Failed to restore backup', { error, backupId: req.params.backupId });
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError
			) {
				throw error;
			}
			const message =
				error instanceof Error ? error.message : 'Unknown error during backup restoration';
			throw new internal_server_error_1.InternalServerError(
				`Backup restoration failed: ${message}`,
			);
		}
	}
	async downloadBackup(req, res) {
		try {
			const { backupId } = req.params;
			const backupStream = await this.backupService.getBackupStream(backupId);
			if (!backupStream) {
				throw new not_found_error_1.NotFoundError(`Backup with ID ${backupId} not found`);
			}
			const backup = await this.backupService.getBackup(backupId);
			const fileName = backup?.name ? `${backup.name}.n8n-backup` : `backup-${backupId}.n8n-backup`;
			res.setHeader('Content-Type', 'application/octet-stream');
			res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
			res.setHeader('Content-Length', backup?.size || 0);
			backupStream.pipe(res);
		} catch (error) {
			if (error instanceof not_found_error_1.NotFoundError) {
				throw error;
			}
			this.logger.error('Failed to download backup', { error, backupId: req.params.backupId });
			throw new internal_server_error_1.InternalServerError('Failed to download backup file');
		}
	}
	async deleteBackup(req) {
		try {
			const { backupId } = req.params;
			const success = await this.backupService.deleteBackup(backupId);
			if (!success) {
				throw new not_found_error_1.NotFoundError(`Backup with ID ${backupId} not found`);
			}
			this.logger.info('Backup deleted successfully', { backupId });
			return { success: true };
		} catch (error) {
			if (error instanceof not_found_error_1.NotFoundError) {
				throw error;
			}
			this.logger.error('Failed to delete backup', { error, backupId: req.params.backupId });
			throw new internal_server_error_1.InternalServerError('Failed to delete backup');
		}
	}
	async verifyBackup(req) {
		try {
			const { backupId } = req.params;
			const result = await this.backupService.verifyBackupIntegrity(backupId);
			this.logger.info('Backup verification completed', {
				backupId,
				valid: result.valid,
				errors: result.errors?.length || 0,
			});
			return result;
		} catch (error) {
			this.logger.error('Failed to verify backup', { error, backupId: req.params.backupId });
			throw new internal_server_error_1.InternalServerError('Failed to verify backup integrity');
		}
	}
	async getScheduleStatus() {
		try {
			return await this.backupService.getScheduleStatus();
		} catch (error) {
			this.logger.error('Failed to get backup schedule status', { error });
			throw new internal_server_error_1.InternalServerError(
				'Failed to retrieve backup schedule status',
			);
		}
	}
	async setBackupSchedule(req) {
		try {
			const { schedule, enabled, backupOptions } = req.body;
			if (!schedule || !schedule.trim()) {
				throw new bad_request_error_1.BadRequestError('Schedule configuration is required');
			}
			await this.backupService.setBackupSchedule({
				schedule,
				enabled,
				backupOptions,
			});
			this.logger.info('Backup schedule configured', { schedule, enabled });
			return { success: true };
		} catch (error) {
			if (error instanceof bad_request_error_1.BadRequestError) {
				throw error;
			}
			this.logger.error('Failed to configure backup schedule', { error });
			throw new internal_server_error_1.InternalServerError('Failed to configure backup schedule');
		}
	}
};
exports.BackupController = BackupController;
__decorate(
	[
		(0, decorators_1.Post)('/'),
		(0, decorators_1.GlobalScope)('backup:create'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'createBackup',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/'),
		(0, decorators_1.GlobalScope)('backup:list'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'listBackups',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:backupId'),
		(0, decorators_1.GlobalScope)('backup:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'getBackup',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:backupId/restore'),
		(0, decorators_1.GlobalScope)('backup:restore'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'restoreBackup',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:backupId/download'),
		(0, decorators_1.GlobalScope)('backup:download'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'downloadBackup',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:backupId'),
		(0, decorators_1.GlobalScope)('backup:delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'deleteBackup',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:backupId/verify'),
		(0, decorators_1.GlobalScope)('backup:verify'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'verifyBackup',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/schedule/status'),
		(0, decorators_1.GlobalScope)('backup:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'getScheduleStatus',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/schedule'),
		(0, decorators_1.GlobalScope)('backup:create'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	BackupController.prototype,
	'setBackupSchedule',
	null,
);
exports.BackupController = BackupController = __decorate(
	[
		(0, decorators_1.RestController)('/backup'),
		__metadata('design:paramtypes', [
			backup_service_1.BackupService,
			restore_service_1.RestoreService,
		]),
	],
	BackupController,
);
//# sourceMappingURL=backup.controller.js.map
