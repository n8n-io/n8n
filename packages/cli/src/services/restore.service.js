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
exports.RestoreService = void 0;
const crypto_1 = require('crypto');
const fs_1 = require('fs');
const path_1 = require('path');
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const db_1 = require('@n8n/db');
const n8n_core_1 = require('n8n-core');
const n8n_core_2 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const typeorm_1 = require('@n8n/typeorm');
const backup_service_1 = require('./backup.service');
let RestoreService = class RestoreService {
	constructor(
		logger,
		instanceSettings,
		dataSource,
		workflowRepository,
		credentialsRepository,
		settingsRepository,
		installedPackagesRepository,
		binaryDataService,
		backupService,
	) {
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.dataSource = dataSource;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.settingsRepository = settingsRepository;
		this.installedPackagesRepository = installedPackagesRepository;
		this.binaryDataService = binaryDataService;
		this.backupService = backupService;
		this.activeTransactions = new Map();
		this.backupDir = (0, path_1.join)(this.instanceSettings.userFolder, 'backups');
	}
	async restoreBackup(request) {
		const startTime = new Date();
		const transactionId = this.generateTransactionId();
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();
		try {
			const { backupId, password, overwriteExisting, validateIntegrity } = request;
			const backup = await this.backupService.getBackup(backupId);
			if (!backup) {
				throw new n8n_workflow_1.UserError(`Backup with ID ${backupId} not found`);
			}
			if (validateIntegrity) {
				this.logger.info('Validating backup integrity', { backupId });
				const verification = await this.backupService.verifyBackupIntegrity(backupId);
				if (!verification.valid) {
					throw new n8n_workflow_1.UserError(
						`Backup integrity check failed: ${verification.errors?.join(', ')}`,
					);
				}
			}
			const backupPath = (0, path_1.join)(this.backupDir, backupId);
			const manifest = await this.loadManifest(backupPath);
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
			const conflicts = [];
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
			if (manifest.files.binaryData && manifest.metadata.includeBinaryData) {
				restored.binaryData = await this.restoreBinaryData(backupPath, manifest.files.binaryData);
			}
			await queryRunner.commitTransaction();
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
			await queryRunner.rollbackTransaction();
			this.activeTransactions.delete(transactionId);
			this.logger.error('Restore operation failed, rolled back', {
				error,
				backupId: request.backupId,
				transactionId,
			});
			if (error instanceof n8n_workflow_1.UserError) {
				throw error;
			}
			throw new n8n_workflow_1.UnexpectedError('Backup restoration failed', { cause: error });
		} finally {
			await queryRunner.release();
		}
	}
	async rollbackRestore(transactionId) {
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
	async createRestoreTransaction(transactionId, backupId, manager) {
		const workflows = await manager.find(WorkflowEntity);
		const credentials = await manager.find(CredentialsEntity);
		const settings = await manager.find(SettingsEntity);
		const transaction = {
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
	async restoreFromSnapshot(snapshot, manager) {
		await manager.delete(WorkflowEntity, {});
		await manager.delete(CredentialsEntity, {});
		await manager.delete(SettingsEntity, {});
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
	async loadManifest(backupPath) {
		const manifestPath = (0, path_1.join)(backupPath, 'manifest.json');
		try {
			const manifestData = await fs_1.promises.readFile(manifestPath, 'utf-8');
			return JSON.parse(manifestData);
		} catch (error) {
			throw new n8n_workflow_1.UserError('Invalid backup: manifest not found or corrupted');
		}
	}
	async readJsonFile(filePath, encrypted, password) {
		const fileData = await fs_1.promises.readFile(filePath, 'utf-8');
		if (encrypted) {
			if (!password) {
				throw new n8n_workflow_1.UserError('Password required for encrypted backup');
			}
			try {
				const decipher = (0, crypto_1.createDecipher)('aes-256-cbc', password);
				const decryptedData = decipher.update(fileData, 'hex', 'utf8') + decipher.final('utf8');
				return JSON.parse(decryptedData);
			} catch {
				throw new n8n_workflow_1.UserError('Invalid password for encrypted backup');
			}
		}
		return JSON.parse(fileData);
	}
	async restoreWorkflows(
		backupPath,
		workflowsFile,
		encrypted,
		password,
		overwriteExisting,
		manager,
	) {
		const workflowsPath = (0, path_1.join)(backupPath, workflowsFile);
		const workflows = await this.readJsonFile(workflowsPath, encrypted, password);
		let restored = 0;
		const conflicts = [];
		for (const workflow of workflows) {
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
					await manager.update(WorkflowEntity, existing.id, {
						...workflow,
						id: existing.id,
					});
					conflicts.push({
						type: 'workflow',
						name: workflow.name,
						action: 'overwritten',
					});
				} else {
					const { id, ...workflowData } = workflow;
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
	async restoreCredentials(
		backupPath,
		credentialsFile,
		encrypted,
		password,
		overwriteExisting,
		manager,
	) {
		const credentialsPath = (0, path_1.join)(backupPath, credentialsFile);
		const credentials = await this.readJsonFile(credentialsPath, encrypted, password);
		let restored = 0;
		const conflicts = [];
		for (const credential of credentials) {
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
					await manager.update(CredentialsEntity, existing.id, {
						...credential,
						id: existing.id,
					});
					conflicts.push({
						type: 'credential',
						name: credential.name,
						action: 'overwritten',
					});
				} else {
					const { id, ...credentialData } = credential;
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
	async restoreSettings(backupPath, settingsFile, encrypted, password, overwriteExisting, manager) {
		const settingsPath = (0, path_1.join)(backupPath, settingsFile);
		const data = await this.readJsonFile(settingsPath, encrypted, password);
		const settings = data.settings;
		const installedPackages = data.installedPackages;
		let restored = 0;
		const conflicts = [];
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
	async restoreBinaryData(backupPath, binaryDataFile) {
		this.logger.info('Binary data restoration not yet implemented');
		return 0;
	}
	generateTransactionId() {
		return `restore-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
};
exports.RestoreService = RestoreService;
exports.RestoreService = RestoreService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			typeorm_1.DataSource,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
			db_1.SettingsRepository,
			db_1.InstalledPackagesRepository,
			n8n_core_2.BinaryDataService,
			backup_service_1.BackupService,
		]),
	],
	RestoreService,
);
//# sourceMappingURL=restore.service.js.map
