import { createHash, createDecipher } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { WorkflowEntity, CredentialsEntity, SettingsEntity, InstalledPackages } from '@n8n/db';
import {
	WorkflowRepository,
	CredentialsRepository,
	SettingsRepository,
	InstalledPackagesRepository,
} from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import { BinaryDataService } from 'n8n-core';
import { UnexpectedError, UserError } from 'n8n-workflow';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource } from '@n8n/typeorm';

import type { RestoreRequest, RestoreResponse } from '@/controllers/backup.controller';
import { BackupService } from './backup.service';

interface BackupManifest {
	version: string;
	createdAt: Date;
	metadata: {
		workflowCount: number;
		credentialCount: number;
		settingsCount: number;
		binaryDataCount: number;
		encrypted: boolean;
		includeCredentials: boolean;
		includeBinaryData: boolean;
		includeSettings: boolean;
	};
	checksums: {
		workflows: string;
		credentials?: string;
		settings?: string;
		binaryData?: string;
		overall: string;
	};
	files: {
		workflows: string;
		credentials?: string;
		settings?: string;
		binaryData?: string;
	};
}

interface RestoreTransaction {
	id: string;
	startTime: Date;
	backupId: string;
	backupSnapshot: {
		workflows: WorkflowEntity[];
		credentials: CredentialsEntity[];
		settings: SettingsEntity[];
	};
}

@Service()
export class RestoreService {
	private readonly backupDir: string;
	private activeTransactions = new Map<string, RestoreTransaction>();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly dataSource: DataSource,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly settingsRepository: SettingsRepository,
		private readonly installedPackagesRepository: InstalledPackagesRepository,
		private readonly binaryDataService: BinaryDataService,
		private readonly backupService: BackupService,
	) {
		this.backupDir = join(this.instanceSettings.userFolder, 'backups');
	}

	async restoreBackup(request: RestoreRequest): Promise<RestoreResponse> {
		const startTime = new Date();
		const transactionId = this.generateTransactionId();

		// Start database transaction
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const { backupId, password, overwriteExisting, validateIntegrity } = request;

			// Validate backup exists and get metadata
			const backup = await this.backupService.getBackup(backupId);
			if (!backup) {
				throw new UserError(`Backup with ID ${backupId} not found`);
			}

			// Validate backup integrity if requested
			if (validateIntegrity) {
				this.logger.info('Validating backup integrity', { backupId });
				const verification = await this.backupService.verifyBackupIntegrity(backupId);
				if (!verification.valid) {
					throw new UserError(`Backup integrity check failed: ${verification.errors?.join(', ')}`);
				}
			}

			// Load backup manifest
			const backupPath = join(this.backupDir, backupId);
			const manifest = await this.loadManifest(backupPath);

			// Create restore transaction for rollback capability
			const transaction = await this.createRestoreTransaction(
				transactionId,
				backupId,
				queryRunner.manager,
			);

			this.logger.info('Starting restore operation', {
				backupId,
				transactionId,
				overwriteExisting,
				validateIntegrity,
			});

			const restored = {
				workflows: 0,
				credentials: 0,
				settings: 0,
				binaryData: 0,
			};

			const conflicts: RestoreResponse['conflicts'] = [];

			// Restore workflows
			if (manifest.files.workflows) {
				const workflowResult = await this.restoreWorkflows(
					backupPath,
					manifest.files.workflows,
					manifest.metadata.encrypted,
					password,
					overwriteExisting,
					queryRunner.manager,
				);
				restored.workflows = workflowResult.restored;
				conflicts.push(...workflowResult.conflicts);
			}

			// Restore credentials
			if (manifest.files.credentials && manifest.metadata.includeCredentials) {
				const credentialResult = await this.restoreCredentials(
					backupPath,
					manifest.files.credentials,
					manifest.metadata.encrypted,
					password,
					overwriteExisting,
					queryRunner.manager,
				);
				restored.credentials = credentialResult.restored;
				conflicts.push(...credentialResult.conflicts);
			}

			// Restore settings
			if (manifest.files.settings && manifest.metadata.includeSettings) {
				const settingsResult = await this.restoreSettings(
					backupPath,
					manifest.files.settings,
					manifest.metadata.encrypted,
					password,
					overwriteExisting,
					queryRunner.manager,
				);
				restored.settings = settingsResult.restored;
				conflicts.push(...settingsResult.conflicts);
			}

			// Restore binary data
			if (manifest.files.binaryData && manifest.metadata.includeBinaryData) {
				restored.binaryData = await this.restoreBinaryData(backupPath, manifest.files.binaryData);
			}

			// Commit transaction
			await queryRunner.commitTransaction();

			// Cleanup transaction
			this.activeTransactions.delete(transactionId);

			const duration = Date.now() - startTime.getTime();

			this.logger.info('Restore operation completed successfully', {
				backupId,
				transactionId,
				restored,
				conflicts: conflicts.length,
				duration,
			});

			return {
				success: true,
				restored,
				conflicts,
				duration,
				backupId,
			};
		} catch (error) {
			// Rollback transaction
			await queryRunner.rollbackTransaction();
			this.activeTransactions.delete(transactionId);

			this.logger.error('Restore operation failed, rolled back', {
				error,
				backupId: request.backupId,
				transactionId,
			});

			if (error instanceof UserError) {
				throw error;
			}

			throw new UnexpectedError('Backup restoration failed', { cause: error });
		} finally {
			await queryRunner.release();
		}
	}

	async rollbackRestore(transactionId: string): Promise<boolean> {
		const transaction = this.activeTransactions.get(transactionId);
		if (!transaction) {
			return false;
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			this.logger.info('Rolling back restore operation', {
				transactionId,
				backupId: transaction.backupId,
			});

			// Restore original data from snapshot
			await this.restoreFromSnapshot(transaction.backupSnapshot, queryRunner.manager);

			await queryRunner.commitTransaction();
			this.activeTransactions.delete(transactionId);

			this.logger.info('Restore rollback completed successfully', { transactionId });
			return true;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			this.logger.error('Restore rollback failed', { error, transactionId });
			return false;
		} finally {
			await queryRunner.release();
		}
	}

	private async createRestoreTransaction(
		transactionId: string,
		backupId: string,
		manager: EntityManager,
	): Promise<RestoreTransaction> {
		// Create snapshot of current data for potential rollback
		const workflows = await manager.find(WorkflowEntity);
		const credentials = await manager.find(CredentialsEntity);
		const settings = await manager.find(SettingsEntity);

		const transaction: RestoreTransaction = {
			id: transactionId,
			startTime: new Date(),
			backupId,
			backupSnapshot: {
				workflows,
				credentials,
				settings,
			},
		};

		this.activeTransactions.set(transactionId, transaction);
		return transaction;
	}

	private async restoreFromSnapshot(
		snapshot: RestoreTransaction['backupSnapshot'],
		manager: EntityManager,
	): Promise<void> {
		// Clear current data
		await manager.delete(WorkflowEntity, {});
		await manager.delete(CredentialsEntity, {});
		await manager.delete(SettingsEntity, {});

		// Restore from snapshot
		if (snapshot.workflows.length > 0) {
			await manager.save(WorkflowEntity, snapshot.workflows);
		}
		if (snapshot.credentials.length > 0) {
			await manager.save(CredentialsEntity, snapshot.credentials);
		}
		if (snapshot.settings.length > 0) {
			await manager.save(SettingsEntity, snapshot.settings);
		}
	}

	private async loadManifest(backupPath: string): Promise<BackupManifest> {
		const manifestPath = join(backupPath, 'manifest.json');
		try {
			const manifestData = await fs.readFile(manifestPath, 'utf-8');
			return JSON.parse(manifestData) as BackupManifest;
		} catch (error) {
			throw new UserError('Invalid backup: manifest not found or corrupted');
		}
	}

	private async readJsonFile(
		filePath: string,
		encrypted: boolean,
		password?: string,
	): Promise<any> {
		const fileData = await fs.readFile(filePath, 'utf-8');

		if (encrypted) {
			if (!password) {
				throw new UserError('Password required for encrypted backup');
			}

			try {
				const decipher = createDecipher('aes-256-cbc', password);
				const decryptedData = decipher.update(fileData, 'hex', 'utf8') + decipher.final('utf8');
				return JSON.parse(decryptedData);
			} catch {
				throw new UserError('Invalid password for encrypted backup');
			}
		}

		return JSON.parse(fileData);
	}

	private async restoreWorkflows(
		backupPath: string,
		workflowsFile: string,
		encrypted: boolean,
		password: string | undefined,
		overwriteExisting: boolean,
		manager: EntityManager,
	): Promise<{ restored: number; conflicts: RestoreResponse['conflicts'] }> {
		const workflowsPath = join(backupPath, workflowsFile);
		const workflows = (await this.readJsonFile(
			workflowsPath,
			encrypted,
			password,
		)) as WorkflowEntity[];

		let restored = 0;
		const conflicts: RestoreResponse['conflicts'] = [];

		for (const workflow of workflows) {
			// Check for existing workflow with same name
			const existing = await manager.findOne(WorkflowEntity, {
				where: { name: workflow.name },
			});

			if (existing && !overwriteExisting) {
				conflicts.push({
					type: 'workflow',
					name: workflow.name,
					action: 'skipped',
				});
				continue;
			}

			try {
				if (existing && overwriteExisting) {
					// Update existing workflow
					await manager.update(WorkflowEntity, existing.id, {
						...workflow,
						id: existing.id, // Keep original ID
					});
					conflicts.push({
						type: 'workflow',
						name: workflow.name,
						action: 'overwritten',
					});
				} else {
					// Create new workflow
					const { id, ...workflowData } = workflow; // Remove ID to let DB generate new one
					await manager.save(WorkflowEntity, workflowData);
				}
				restored++;
			} catch (error) {
				this.logger.warn('Failed to restore workflow', {
					workflowName: workflow.name,
					error,
				});
			}
		}

		return { restored, conflicts };
	}

	private async restoreCredentials(
		backupPath: string,
		credentialsFile: string,
		encrypted: boolean,
		password: string | undefined,
		overwriteExisting: boolean,
		manager: EntityManager,
	): Promise<{ restored: number; conflicts: RestoreResponse['conflicts'] }> {
		const credentialsPath = join(backupPath, credentialsFile);
		const credentials = (await this.readJsonFile(
			credentialsPath,
			encrypted,
			password,
		)) as CredentialsEntity[];

		let restored = 0;
		const conflicts: RestoreResponse['conflicts'] = [];

		for (const credential of credentials) {
			// Check for existing credential with same name
			const existing = await manager.findOne(CredentialsEntity, {
				where: { name: credential.name },
			});

			if (existing && !overwriteExisting) {
				conflicts.push({
					type: 'credential',
					name: credential.name,
					action: 'skipped',
				});
				continue;
			}

			try {
				if (existing && overwriteExisting) {
					// Update existing credential
					await manager.update(CredentialsEntity, existing.id, {
						...credential,
						id: existing.id, // Keep original ID
					});
					conflicts.push({
						type: 'credential',
						name: credential.name,
						action: 'overwritten',
					});
				} else {
					// Create new credential
					const { id, ...credentialData } = credential; // Remove ID to let DB generate new one
					await manager.save(CredentialsEntity, credentialData);
				}
				restored++;
			} catch (error) {
				this.logger.warn('Failed to restore credential', {
					credentialName: credential.name,
					error,
				});
			}
		}

		return { restored, conflicts };
	}

	private async restoreSettings(
		backupPath: string,
		settingsFile: string,
		encrypted: boolean,
		password: string | undefined,
		overwriteExisting: boolean,
		manager: EntityManager,
	): Promise<{ restored: number; conflicts: RestoreResponse['conflicts'] }> {
		const settingsPath = join(backupPath, settingsFile);
		const data = await this.readJsonFile(settingsPath, encrypted, password);
		const settings = data.settings as SettingsEntity[];
		const installedPackages = data.installedPackages as InstalledPackages[];

		let restored = 0;
		const conflicts: RestoreResponse['conflicts'] = [];

		// Restore settings
		for (const setting of settings) {
			const existing = await manager.findOne(SettingsEntity, {
				where: { key: setting.key },
			});

			if (existing && !overwriteExisting) {
				conflicts.push({
					type: 'setting',
					name: setting.key,
					action: 'skipped',
				});
				continue;
			}

			try {
				if (existing) {
					await manager.update(SettingsEntity, existing.key, setting);
					conflicts.push({
						type: 'setting',
						name: setting.key,
						action: 'overwritten',
					});
				} else {
					await manager.save(SettingsEntity, setting);
				}
				restored++;
			} catch (error) {
				this.logger.warn('Failed to restore setting', {
					settingKey: setting.key,
					error,
				});
			}
		}

		// Restore installed packages info (but don't actually install packages)
		for (const pkg of installedPackages) {
			try {
				const existing = await manager.findOne(InstalledPackages, {
					where: { packageName: pkg.packageName },
				});

				if (!existing) {
					const { id, ...pkgData } = pkg;
					await manager.save(InstalledPackages, pkgData);
					restored++;
				}
			} catch (error) {
				this.logger.warn('Failed to restore package info', {
					packageName: pkg.packageName,
					error,
				});
			}
		}

		return { restored, conflicts };
	}

	private async restoreBinaryData(backupPath: string, binaryDataFile: string): Promise<number> {
		// TODO: Implement binary data restoration
		// This would involve extracting binary files and updating the binary data service
		this.logger.info('Binary data restoration not yet implemented');
		return 0;
	}

	private generateTransactionId(): string {
		return `restore-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
}
