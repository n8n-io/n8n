import { Request, Response } from 'express';
import { Logger } from '@n8n/backend-common';
import { Delete, Get, Patch, Post, RestController, GlobalScope } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BackupService } from '@/services/backup.service';
import { RestoreService } from '@/services/restore.service';

export interface BackupRequest {
	includeCredentials?: boolean;
	includeBinaryData?: boolean;
	includeSettings?: boolean;
	encryption?: boolean;
	password?: string;
	name?: string;
	description?: string;
}

export interface RestoreRequest {
	backupId: string;
	password?: string;
	overwriteExisting?: boolean;
	validateIntegrity?: boolean;
}

export interface BackupResponse {
	id: string;
	name: string;
	description?: string;
	size: number;
	createdAt: Date;
	checksums: {
		workflows: string;
		credentials?: string;
		settings?: string;
		binaryData?: string;
		overall: string;
	};
	metadata: {
		workflowCount: number;
		credentialCount: number;
		settingsCount: number;
		binaryDataCount: number;
		version: string;
		encrypted: boolean;
	};
	downloadUrl?: string;
}

export interface RestoreResponse {
	success: boolean;
	restored: {
		workflows: number;
		credentials: number;
		settings: number;
		binaryData: number;
	};
	conflicts: Array<{
		type: 'workflow' | 'credential' | 'setting';
		name: string;
		action: 'skipped' | 'overwritten' | 'renamed';
	}>;
	duration: number;
	backupId: string;
}

@RestController('/backup')
export class BackupController {
	private readonly logger = Container.get(Logger);

	constructor(
		private readonly backupService: BackupService,
		private readonly restoreService: RestoreService,
	) {}

	@Post('/')
	@GlobalScope('backup:create')
	async createBackup(req: Request<{}, {}, BackupRequest>, res: Response): Promise<BackupResponse> {
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

			// Validate encryption requirements
			if (encryption && !password) {
				throw new BadRequestError('Password is required when encryption is enabled');
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

			if (error instanceof BadRequestError) {
				throw error;
			}

			const message =
				error instanceof Error ? error.message : 'Unknown error during backup creation';
			throw new InternalServerError(`Backup creation failed: ${message}`);
		}
	}

	@Get('/')
	@GlobalScope('backup:list')
	async listBackups(): Promise<BackupResponse[]> {
		try {
			return await this.backupService.listBackups();
		} catch (error) {
			this.logger.error('Failed to list backups', { error });
			throw new InternalServerError('Failed to retrieve backup list');
		}
	}

	@Get('/:backupId')
	@GlobalScope('backup:read')
	async getBackup(req: Request<{ backupId: string }>): Promise<BackupResponse> {
		try {
			const backup = await this.backupService.getBackup(req.params.backupId);

			if (!backup) {
				throw new NotFoundError(`Backup with ID ${req.params.backupId} not found`);
			}

			return backup;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}

			this.logger.error('Failed to get backup', { error, backupId: req.params.backupId });
			throw new InternalServerError('Failed to retrieve backup information');
		}
	}

	@Post('/:backupId/restore')
	@GlobalScope('backup:restore')
	async restoreBackup(
		req: Request<{ backupId: string }, {}, RestoreRequest>,
	): Promise<RestoreResponse> {
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

			if (error instanceof BadRequestError || error instanceof NotFoundError) {
				throw error;
			}

			const message =
				error instanceof Error ? error.message : 'Unknown error during backup restoration';
			throw new InternalServerError(`Backup restoration failed: ${message}`);
		}
	}

	@Get('/:backupId/download')
	@GlobalScope('backup:download')
	async downloadBackup(req: Request<{ backupId: string }>, res: Response): Promise<void> {
		try {
			const { backupId } = req.params;
			const backupStream = await this.backupService.getBackupStream(backupId);

			if (!backupStream) {
				throw new NotFoundError(`Backup with ID ${backupId} not found`);
			}

			const backup = await this.backupService.getBackup(backupId);
			const fileName = backup?.name ? `${backup.name}.n8n-backup` : `backup-${backupId}.n8n-backup`;

			res.setHeader('Content-Type', 'application/octet-stream');
			res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
			res.setHeader('Content-Length', backup?.size || 0);

			backupStream.pipe(res);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}

			this.logger.error('Failed to download backup', { error, backupId: req.params.backupId });
			throw new InternalServerError('Failed to download backup file');
		}
	}

	@Delete('/:backupId')
	@GlobalScope('backup:delete')
	async deleteBackup(req: Request<{ backupId: string }>): Promise<{ success: boolean }> {
		try {
			const { backupId } = req.params;

			const success = await this.backupService.deleteBackup(backupId);

			if (!success) {
				throw new NotFoundError(`Backup with ID ${backupId} not found`);
			}

			this.logger.info('Backup deleted successfully', { backupId });

			return { success: true };
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}

			this.logger.error('Failed to delete backup', { error, backupId: req.params.backupId });
			throw new InternalServerError('Failed to delete backup');
		}
	}

	@Patch('/:backupId/verify')
	@GlobalScope('backup:verify')
	async verifyBackup(req: Request<{ backupId: string }>): Promise<{
		valid: boolean;
		checksums: Record<string, boolean>;
		errors?: string[];
	}> {
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
			throw new InternalServerError('Failed to verify backup integrity');
		}
	}

	@Get('/schedule/status')
	@GlobalScope('backup:schedule:read')
	async getScheduleStatus(): Promise<{
		enabled: boolean;
		schedule?: string;
		lastBackup?: Date;
		nextBackup?: Date;
	}> {
		try {
			return await this.backupService.getScheduleStatus();
		} catch (error) {
			this.logger.error('Failed to get backup schedule status', { error });
			throw new InternalServerError('Failed to retrieve backup schedule status');
		}
	}

	@Post('/schedule')
	@GlobalScope('backup:schedule:create')
	async setBackupSchedule(
		req: Request<
			{},
			{},
			{
				schedule: string;
				enabled: boolean;
				backupOptions: BackupRequest;
			}
		>,
	): Promise<{ success: boolean }> {
		try {
			const { schedule, enabled, backupOptions } = req.body;

			if (!schedule || !schedule.trim()) {
				throw new BadRequestError('Schedule configuration is required');
			}

			await this.backupService.setBackupSchedule({
				schedule,
				enabled,
				backupOptions,
			});

			this.logger.info('Backup schedule configured', { schedule, enabled });

			return { success: true };
		} catch (error) {
			if (error instanceof BadRequestError) {
				throw error;
			}

			this.logger.error('Failed to configure backup schedule', { error });
			throw new InternalServerError('Failed to configure backup schedule');
		}
	}
}
