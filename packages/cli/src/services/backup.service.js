'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BackupService = void 0;
const crypto_1 = require('crypto');
const fs_1 = require('fs');
const path_1 = require('path');
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const db_1 = require('@n8n/db');
const n8n_core_1 = require('n8n-core');
const n8n_core_2 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
let BackupService = class BackupService {
	constructor(
		logger,
		instanceSettings,
		workflowRepository,
		credentialsRepository,
		settingsRepository,
		installedPackagesRepository,
		binaryDataService,
	) {
		this.logger = logger;
		this.instanceSettings = instanceSettings;
		this.workflowRepository = workflowRepository;
		this.credentialsRepository = credentialsRepository;
		this.settingsRepository = settingsRepository;
		this.installedPackagesRepository = installedPackagesRepository;
		this.binaryDataService = binaryDataService;
		this.backupDir = (0, path_1.join)(this.instanceSettings.userFolder, 'backups');
		this.ensureBackupDirectory();
		this.loadScheduleConfig();
	}
	async createBackup(options) {
		const backupId = this.generateBackupId();
		const backupPath = (0, path_1.join)(this.backupDir, backupId);
		try {
			await fs_1.promises.mkdir(backupPath, { recursive: true });
			const workflows = await this.workflowRepository.find({
				select: [
					'id',
					'name',
					'active',
					'nodes',
					'connections',
					'settings',
					'staticData',
					'tags',
					'meta',
				],
			});
			const credentials = options.includeCredentials
				? await this.credentialsRepository.find({
						select: ['id', 'name', 'type', 'data', 'nodesAccess'],
					})
				: [];
			const settings = options.includeSettings ? await this.settingsRepository.find() : [];
			const installedPackages = await this.installedPackagesRepository.find({
				relations: ['installedNodes'],
			});
			const workflowsFile = 'workflows.json';
			const workflowsPath = (0, path_1.join)(backupPath, workflowsFile);
			await this.writeJsonFile(workflowsPath, workflows, options.encryption, options.password);
			let credentialsFile;
			if (options.includeCredentials && credentials.length > 0) {
				credentialsFile = 'credentials.json';
				const credentialsPath = (0, path_1.join)(backupPath, credentialsFile);
				await this.writeJsonFile(
					credentialsPath,
					credentials,
					options.encryption,
					options.password,
				);
			}
			let settingsFile;
			if (options.includeSettings && settings.length > 0) {
				settingsFile = 'settings.json';
				const settingsPath = (0, path_1.join)(backupPath, settingsFile);
				const settingsData = {
					settings,
					installedPackages,
					version: process.env.N8N_VERSION || '1.0.0',
				};
				await this.writeJsonFile(settingsPath, settingsData, options.encryption, options.password);
			}
			let binaryDataFile;
			let binaryDataCount = 0;
			if (options.includeBinaryData) {
				const binaryDataInfo = await this.backupBinaryData(backupPath);
				if (binaryDataInfo.count > 0) {
					binaryDataFile = binaryDataInfo.filename;
					binaryDataCount = binaryDataInfo.count;
				}
			}
			const checksums = await this.calculateChecksums(backupPath, {
				workflows: workflowsFile,
				credentials: credentialsFile,
				settings: settingsFile,
				binaryData: binaryDataFile,
			});
			const manifest = {
				version: '1.0.0',
				createdAt: new Date(),
				metadata: {
					workflowCount: workflows.length,
					credentialCount: credentials.length,
					settingsCount: settings.length,
					binaryDataCount,
					encrypted: !!options.encryption,
					includeCredentials: !!options.includeCredentials,
					includeBinaryData: !!options.includeBinaryData,
					includeSettings: !!options.includeSettings,
				},
				checksums,
				files: {
					workflows: workflowsFile,
					credentials: credentialsFile,
					settings: settingsFile,
					binaryData: binaryDataFile,
				},
			};
			const manifestPath = (0, path_1.join)(backupPath, 'manifest.json');
			await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
			const backupSize = await this.calculateDirectorySize(backupPath);
			const backupResponse = {
				id: backupId,
				name: options.name || `Backup ${new Date().toISOString().slice(0, 10)}`,
				description: options.description,
				size: backupSize,
				createdAt: manifest.createdAt,
				checksums: checksums,
				metadata: {
					workflowCount: workflows.length,
					credentialCount: credentials.length,
					settingsCount: settings.length,
					binaryDataCount,
					version: manifest.version,
					encrypted: !!options.encryption,
				},
			};
			await this.saveBackupMetadata(backupId, backupResponse);
			this.logger.info('Backup created successfully', {
				backupId,
				size: backupSize,
				workflowCount: workflows.length,
				credentialCount: credentials.length,
			});
			return backupResponse;
		} catch (error) {
			await this.cleanupFailedBackup(backupPath);
			throw new n8n_workflow_1.UnexpectedError('Failed to create backup', { cause: error });
		}
	}
	async listBackups() {
		try {
			const backupsMetaPath = (0, path_1.join)(this.backupDir, 'backups-meta.json');
			try {
				const metaData = await fs_1.promises.readFile(backupsMetaPath, 'utf-8');
				const backups = JSON.parse(metaData);
				return Object.values(backups).sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
			} catch {
				return [];
			}
		} catch (error) {
			this.logger.error('Failed to list backups', { error });
			throw new n8n_workflow_1.UnexpectedError('Failed to retrieve backup list');
		}
	}
	async getBackup(backupId) {
		try {
			const backupsMetaPath = (0, path_1.join)(this.backupDir, 'backups-meta.json');
			const metaData = await fs_1.promises.readFile(backupsMetaPath, 'utf-8');
			const backups = JSON.parse(metaData);
			const backup = backups[backupId];
			if (backup) {
				backup.downloadUrl = `/backup/${backupId}/download`;
			}
			return backup || null;
		} catch {
			return null;
		}
	}
	async getBackupStream(backupId) {
		const backupPath = (0, path_1.join)(this.backupDir, backupId);
		try {
			await fs_1.promises.access(backupPath);
			const { createReadStream } = await Promise.resolve().then(() => __importStar(require('fs')));
			const { PassThrough } = await Promise.resolve().then(() => __importStar(require('stream')));
			const archiver = require('archiver');
			const archive = archiver('zip', { zlib: { level: 9 } });
			const passThrough = new PassThrough();
			archive.pipe(passThrough);
			archive.directory(backupPath, false);
			await archive.finalize();
			return passThrough;
		} catch {
			return null;
		}
	}
	async deleteBackup(backupId) {
		try {
			const backupPath = (0, path_1.join)(this.backupDir, backupId);
			await fs_1.promises.rm(backupPath, { recursive: true, force: true });
			const backupsMetaPath = (0, path_1.join)(this.backupDir, 'backups-meta.json');
			try {
				const metaData = await fs_1.promises.readFile(backupsMetaPath, 'utf-8');
				const backups = JSON.parse(metaData);
				delete backups[backupId];
				await fs_1.promises.writeFile(backupsMetaPath, JSON.stringify(backups, null, 2));
			} catch {}
			return true;
		} catch (error) {
			this.logger.error('Failed to delete backup', { error, backupId });
			return false;
		}
	}
	async verifyBackupIntegrity(backupId) {
		const backupPath = (0, path_1.join)(this.backupDir, backupId);
		const errors = [];
		try {
			const manifestPath = (0, path_1.join)(backupPath, 'manifest.json');
			const manifestData = await fs_1.promises.readFile(manifestPath, 'utf-8');
			const manifest = JSON.parse(manifestData);
			const checksumResults = {};
			const workflowsValid = await this.verifyFileChecksum(
				(0, path_1.join)(backupPath, manifest.files.workflows),
				manifest.checksums.workflows,
			);
			checksumResults.workflows = workflowsValid;
			if (!workflowsValid) errors.push('Workflows checksum mismatch');
			if (manifest.files.credentials) {
				const credentialsValid = await this.verifyFileChecksum(
					(0, path_1.join)(backupPath, manifest.files.credentials),
					manifest.checksums.credentials,
				);
				checksumResults.credentials = credentialsValid;
				if (!credentialsValid) errors.push('Credentials checksum mismatch');
			}
			if (manifest.files.settings) {
				const settingsValid = await this.verifyFileChecksum(
					(0, path_1.join)(backupPath, manifest.files.settings),
					manifest.checksums.settings,
				);
				checksumResults.settings = settingsValid;
				if (!settingsValid) errors.push('Settings checksum mismatch');
			}
			if (manifest.files.binaryData) {
				const binaryDataValid = await this.verifyFileChecksum(
					(0, path_1.join)(backupPath, manifest.files.binaryData),
					manifest.checksums.binaryData,
				);
				checksumResults.binaryData = binaryDataValid;
				if (!binaryDataValid) errors.push('Binary data checksum mismatch');
			}
			const allValid = Object.values(checksumResults).every((valid) => valid);
			return {
				valid: allValid,
				checksums: checksumResults,
				errors: errors.length > 0 ? errors : undefined,
			};
		} catch (error) {
			return {
				valid: false,
				checksums: {},
				errors: [
					`Backup verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				],
			};
		}
	}
	async getScheduleStatus() {
		if (!this.scheduleConfig) {
			return { enabled: false };
		}
		return {
			enabled: this.scheduleConfig.enabled,
			schedule: this.scheduleConfig.schedule,
		};
	}
	async setBackupSchedule(config) {
		this.scheduleConfig = config;
		if (this.scheduleTimer) {
			clearTimeout(this.scheduleTimer);
		}
		if (config.enabled) {
			this.logger.info('Backup schedule configured', { schedule: config.schedule });
		}
		const configPath = (0, path_1.join)(this.backupDir, 'schedule-config.json');
		await fs_1.promises.writeFile(configPath, JSON.stringify(config, null, 2));
	}
	async ensureBackupDirectory() {
		try {
			await fs_1.promises.mkdir(this.backupDir, { recursive: true });
		} catch (error) {
			this.logger.error('Failed to create backup directory', { error });
			throw new n8n_workflow_1.UnexpectedError('Failed to initialize backup directory');
		}
	}
	async loadScheduleConfig() {
		try {
			const configPath = (0, path_1.join)(this.backupDir, 'schedule-config.json');
			const configData = await fs_1.promises.readFile(configPath, 'utf-8');
			this.scheduleConfig = JSON.parse(configData);
		} catch {}
	}
	generateBackupId() {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const randomSuffix = Math.random().toString(36).substring(7);
		return `backup-${timestamp}-${randomSuffix}`;
	}
	async writeJsonFile(filePath, data, encrypt, password) {
		const jsonData = JSON.stringify(data, null, 2);
		if (encrypt && password) {
			const cipher = (0, crypto_1.createCipher)('aes-256-cbc', password);
			const encryptedData = cipher.update(jsonData, 'utf8', 'hex') + cipher.final('hex');
			await fs_1.promises.writeFile(filePath, encryptedData);
		} else {
			await fs_1.promises.writeFile(filePath, jsonData);
		}
	}
	async backupBinaryData(backupPath) {
		return { filename: 'binary-data.tar.gz', count: 0 };
	}
	async calculateChecksums(backupPath, files) {
		const checksums = {};
		const overallHash = (0, crypto_1.createHash)('sha256');
		for (const [key, filename] of Object.entries(files)) {
			if (filename) {
				const filePath = (0, path_1.join)(backupPath, filename);
				const fileChecksum = await this.calculateFileChecksum(filePath);
				checksums[key] = fileChecksum;
				overallHash.update(fileChecksum);
			}
		}
		checksums.overall = overallHash.digest('hex');
		return checksums;
	}
	async calculateFileChecksum(filePath) {
		const hash = (0, crypto_1.createHash)('sha256');
		const stream = (0, fs_1.createReadStream)(filePath);
		for await (const chunk of stream) {
			hash.update(chunk);
		}
		return hash.digest('hex');
	}
	async verifyFileChecksum(filePath, expectedChecksum) {
		try {
			const actualChecksum = await this.calculateFileChecksum(filePath);
			return actualChecksum === expectedChecksum;
		} catch {
			return false;
		}
	}
	async calculateDirectorySize(dirPath) {
		let totalSize = 0;
		const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
		for (const entry of entries) {
			const entryPath = (0, path_1.join)(dirPath, entry.name);
			if (entry.isDirectory()) {
				totalSize += await this.calculateDirectorySize(entryPath);
			} else {
				const stats = await fs_1.promises.stat(entryPath);
				totalSize += stats.size;
			}
		}
		return totalSize;
	}
	async saveBackupMetadata(backupId, backup) {
		const backupsMetaPath = (0, path_1.join)(this.backupDir, 'backups-meta.json');
		let backups = {};
		try {
			const metaData = await fs_1.promises.readFile(backupsMetaPath, 'utf-8');
			backups = JSON.parse(metaData);
		} catch {}
		backups[backupId] = backup;
		await fs_1.promises.writeFile(backupsMetaPath, JSON.stringify(backups, null, 2));
	}
	async cleanupFailedBackup(backupPath) {
		try {
			await fs_1.promises.rm(backupPath, { recursive: true, force: true });
		} catch (error) {
			this.logger.warn('Failed to cleanup failed backup', { error, backupPath });
		}
	}
};
exports.BackupService = BackupService;
exports.BackupService = BackupService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.InstanceSettings,
			db_1.WorkflowRepository,
			db_1.CredentialsRepository,
			db_1.SettingsRepository,
			db_1.InstalledPackagesRepository,
			n8n_core_2.BinaryDataService,
		]),
	],
	BackupService,
);
//# sourceMappingURL=backup.service.js.map
