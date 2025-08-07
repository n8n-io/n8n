import { createHash, createCipher, createDecipher } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { WorkflowEntity, CredentialsEntity, Settings, InstalledPackages } from '@n8n/db';
import {
	WorkflowRepository,
	CredentialsRepository,
	SettingsRepository,
	InstalledPackagesRepository,
} from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import { BinaryDataService } from 'n8n-core';

import type { BackupRequest, BackupResponse } from '@/controllers/backup.controller';
import { UnexpectedError } from 'n8n-workflow';

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

interface BackupScheduleConfig {
	schedule: string;
	enabled: boolean;
	backupOptions: BackupRequest;
}

@Service()
export class BackupService {
	private readonly backupDir: string;
	private scheduleTimer?: NodeJS.Timeout;
	private scheduleConfig?: BackupScheduleConfig;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly settingsRepository: SettingsRepository,
		private readonly installedPackagesRepository: InstalledPackagesRepository,
		private readonly binaryDataService: BinaryDataService,
	) {
		this.backupDir = join(this.instanceSettings.n8nFolder, 'backups');
		this.ensureBackupDirectory();
		this.loadScheduleConfig();
	}

	async createBackup(
		options: BackupRequest & {
			name?: string;
			description?: string;
		},
	): Promise<BackupResponse> {
		const backupId = this.generateBackupId();
		const backupPath = join(this.backupDir, backupId);

		try {
			await fs.mkdir(backupPath, { recursive: true });

			// Collect all data to backup
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
						select: ['id', 'name', 'type', 'data'],
					})
				: [];

			const settings = options.includeSettings ? await this.settingsRepository.find() : [];

			const installedPackages = await this.installedPackagesRepository.find({
				relations: ['installedNodes'],
			});

			// Create backup files
			const workflowsFile = 'workflows.json';
			const workflowsPath = join(backupPath, workflowsFile);
			await this.writeJsonFile(workflowsPath, workflows, options.encryption, options.password);

			let credentialsFile: string | undefined;
			if (options.includeCredentials && credentials.length > 0) {
				credentialsFile = 'credentials.json';
				const credentialsPath = join(backupPath, credentialsFile);
				await this.writeJsonFile(
					credentialsPath,
					credentials,
					options.encryption,
					options.password,
				);
			}

			let settingsFile: string | undefined;
			if (options.includeSettings && settings.length > 0) {
				settingsFile = 'settings.json';
				const settingsPath = join(backupPath, settingsFile);
				const settingsData = {
					settings,
					installedPackages,
					version: process.env.N8N_VERSION || '1.0.0',
				};
				await this.writeJsonFile(settingsPath, settingsData, options.encryption, options.password);
			}

			let binaryDataFile: string | undefined;
			let binaryDataCount = 0;
			if (options.includeBinaryData) {
				const binaryDataInfo = await this.backupBinaryData(backupPath);
				if (binaryDataInfo.count > 0) {
					binaryDataFile = binaryDataInfo.filename;
					binaryDataCount = binaryDataInfo.count;
				}
			}

			// Calculate checksums
			const checksums = await this.calculateChecksums(backupPath, {
				workflows: workflowsFile,
				credentials: credentialsFile,
				settings: settingsFile,
				binaryData: binaryDataFile,
			});

			// Create manifest
			const manifest: BackupManifest = {
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

			const manifestPath = join(backupPath, 'manifest.json');
			await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

			// Calculate total backup size
			const backupSize = await this.calculateDirectorySize(backupPath);

			// Store backup metadata
			const backupResponse: BackupResponse = {
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
			// Cleanup failed backup
			await this.cleanupFailedBackup(backupPath);
			throw new UnexpectedError('Failed to create backup', { cause: error });
		}
	}

	async listBackups(): Promise<BackupResponse[]> {
		try {
			const backupsMetaPath = join(this.backupDir, 'backups-meta.json');

			try {
				const metaData = await fs.readFile(backupsMetaPath, 'utf-8');
				const backups = JSON.parse(metaData) as Record<string, BackupResponse>;
				return Object.values(backups).sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
			} catch {
				return [];
			}
		} catch (error) {
			this.logger.error('Failed to list backups', { error });
			throw new UnexpectedError('Failed to retrieve backup list');
		}
	}

	async getBackup(backupId: string): Promise<BackupResponse | null> {
		try {
			const backupsMetaPath = join(this.backupDir, 'backups-meta.json');
			const metaData = await fs.readFile(backupsMetaPath, 'utf-8');
			const backups = JSON.parse(metaData) as Record<string, BackupResponse>;

			const backup = backups[backupId];
			if (backup) {
				// Add download URL
				backup.downloadUrl = `/backup/${backupId}/download`;
			}

			return backup || null;
		} catch {
			return null;
		}
	}

	async getBackupStream(backupId: string) {
		const backupPath = join(this.backupDir, backupId);

		try {
			await fs.access(backupPath);

			// Create compressed stream of backup directory
			const { createReadStream } = await import('fs');
			const { PassThrough } = await import('stream');
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

	async deleteBackup(backupId: string): Promise<boolean> {
		try {
			const backupPath = join(this.backupDir, backupId);

			// Remove backup directory
			await fs.rm(backupPath, { recursive: true, force: true });

			// Remove from metadata
			const backupsMetaPath = join(this.backupDir, 'backups-meta.json');
			try {
				const metaData = await fs.readFile(backupsMetaPath, 'utf-8');
				const backups = JSON.parse(metaData) as Record<string, BackupResponse>;
				delete backups[backupId];
				await fs.writeFile(backupsMetaPath, JSON.stringify(backups, null, 2));
			} catch {
				// Metadata file might not exist, which is fine
			}

			return true;
		} catch (error) {
			this.logger.error('Failed to delete backup', { error, backupId });
			return false;
		}
	}

	async verifyBackupIntegrity(backupId: string): Promise<{
		valid: boolean;
		checksums: Record<string, boolean>;
		errors?: string[];
	}> {
		const backupPath = join(this.backupDir, backupId);
		const errors: string[] = [];

		try {
			// Load manifest
			const manifestPath = join(backupPath, 'manifest.json');
			const manifestData = await fs.readFile(manifestPath, 'utf-8');
			const manifest: BackupManifest = JSON.parse(manifestData);

			// Verify each component
			const checksumResults: Record<string, boolean> = {};

			// Verify workflows
			const workflowsValid = await this.verifyFileChecksum(
				join(backupPath, manifest.files.workflows),
				manifest.checksums.workflows,
			);
			checksumResults.workflows = workflowsValid;
			if (!workflowsValid) errors.push('Workflows checksum mismatch');

			// Verify credentials if included
			if (manifest.files.credentials) {
				const credentialsValid = await this.verifyFileChecksum(
					join(backupPath, manifest.files.credentials),
					manifest.checksums.credentials!,
				);
				checksumResults.credentials = credentialsValid;
				if (!credentialsValid) errors.push('Credentials checksum mismatch');
			}

			// Verify settings if included
			if (manifest.files.settings) {
				const settingsValid = await this.verifyFileChecksum(
					join(backupPath, manifest.files.settings),
					manifest.checksums.settings!,
				);
				checksumResults.settings = settingsValid;
				if (!settingsValid) errors.push('Settings checksum mismatch');
			}

			// Verify binary data if included
			if (manifest.files.binaryData) {
				const binaryDataValid = await this.verifyFileChecksum(
					join(backupPath, manifest.files.binaryData),
					manifest.checksums.binaryData!,
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

	async getScheduleStatus(): Promise<{
		enabled: boolean;
		schedule?: string;
		lastBackup?: Date;
		nextBackup?: Date;
	}> {
		if (!this.scheduleConfig) {
			return { enabled: false };
		}

		// TODO: Implement proper schedule status tracking
		return {
			enabled: this.scheduleConfig.enabled,
			schedule: this.scheduleConfig.schedule,
		};
	}

	async setBackupSchedule(config: BackupScheduleConfig): Promise<void> {
		this.scheduleConfig = config;

		// Clear existing timer
		if (this.scheduleTimer) {
			clearTimeout(this.scheduleTimer);
		}

		if (config.enabled) {
			// TODO: Implement proper cron-based scheduling
			// This is a simplified implementation for demo purposes
			this.logger.info('Backup schedule configured', { schedule: config.schedule });
		}

		// Save schedule config
		const configPath = join(this.backupDir, 'schedule-config.json');
		await fs.writeFile(configPath, JSON.stringify(config, null, 2));
	}

	private async ensureBackupDirectory(): Promise<void> {
		try {
			await fs.mkdir(this.backupDir, { recursive: true });
		} catch (error) {
			this.logger.error('Failed to create backup directory', { error });
			throw new UnexpectedError('Failed to initialize backup directory');
		}
	}

	private async loadScheduleConfig(): Promise<void> {
		try {
			const configPath = join(this.backupDir, 'schedule-config.json');
			const configData = await fs.readFile(configPath, 'utf-8');
			this.scheduleConfig = JSON.parse(configData) as BackupScheduleConfig;
		} catch {
			// No existing config, which is fine
		}
	}

	private generateBackupId(): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const randomSuffix = Math.random().toString(36).substring(7);
		return `backup-${timestamp}-${randomSuffix}`;
	}

	private async writeJsonFile(
		filePath: string,
		data: any,
		encrypt?: boolean,
		password?: string,
	): Promise<void> {
		const jsonData = JSON.stringify(data, null, 2);

		if (encrypt && password) {
			const cipher = createCipher('aes-256-cbc', password);
			const encryptedData = cipher.update(jsonData, 'utf8', 'hex') + cipher.final('hex');
			await fs.writeFile(filePath, encryptedData);
		} else {
			await fs.writeFile(filePath, jsonData);
		}
	}

	private async backupBinaryData(backupPath: string): Promise<{
		filename: string;
		count: number;
	}> {
		// TODO: Implement binary data backup based on n8n's binary data service
		// This would involve copying binary files and creating an index
		return { filename: 'binary-data.tar.gz', count: 0 };
	}

	private async calculateChecksums(
		backupPath: string,
		files: Record<string, string | undefined>,
	): Promise<{
		workflows: string;
		credentials?: string;
		settings?: string;
		binaryData?: string;
		overall: string;
	}> {
		const checksums: any = {};
		const overallHash = createHash('sha256');

		for (const [key, filename] of Object.entries(files)) {
			if (filename) {
				const filePath = join(backupPath, filename);
				const fileChecksum = await this.calculateFileChecksum(filePath);
				checksums[key] = fileChecksum;
				overallHash.update(fileChecksum);
			}
		}

		checksums.overall = overallHash.digest('hex');
		return checksums;
	}

	private async calculateFileChecksum(filePath: string): Promise<string> {
		const hash = createHash('sha256');
		const stream = createReadStream(filePath);

		for await (const chunk of stream) {
			hash.update(chunk);
		}

		return hash.digest('hex');
	}

	private async verifyFileChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
		try {
			const actualChecksum = await this.calculateFileChecksum(filePath);
			return actualChecksum === expectedChecksum;
		} catch {
			return false;
		}
	}

	private async calculateDirectorySize(dirPath: string): Promise<number> {
		let totalSize = 0;
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = join(dirPath, entry.name);
			if (entry.isDirectory()) {
				totalSize += await this.calculateDirectorySize(entryPath);
			} else {
				const stats = await fs.stat(entryPath);
				totalSize += stats.size;
			}
		}

		return totalSize;
	}

	private async saveBackupMetadata(backupId: string, backup: BackupResponse): Promise<void> {
		const backupsMetaPath = join(this.backupDir, 'backups-meta.json');

		let backups: Record<string, BackupResponse> = {};
		try {
			const metaData = await fs.readFile(backupsMetaPath, 'utf-8');
			backups = JSON.parse(metaData);
		} catch {
			// File doesn't exist yet, start with empty object
		}

		backups[backupId] = backup;
		await fs.writeFile(backupsMetaPath, JSON.stringify(backups, null, 2));
	}

	private async cleanupFailedBackup(backupPath: string): Promise<void> {
		try {
			await fs.rm(backupPath, { recursive: true, force: true });
		} catch (error) {
			this.logger.warn('Failed to cleanup failed backup', { error, backupPath });
		}
	}
}
