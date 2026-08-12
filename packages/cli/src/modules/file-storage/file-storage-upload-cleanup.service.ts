import { Logger, safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { promises as fs } from 'fs';
import { InstanceSettings } from 'n8n-core';

/**
 * Prunes orphaned multipart upload temp files (uploads that were received but
 * never streamed into the byte store, e.g. after a quota rejection or crash).
 * Distinct from the byte-store orphan sweeper, which reconciles persisted keys.
 */
@Service()
export class FileStorageUploadCleanupService {
	private readonly uploadDir: string;

	private cleanupInterval?: NodeJS.Timeout;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.uploadDir = this.globalConfig.fileStorage.uploadDir;
	}

	private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
		return (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			typeof (error as { code: unknown }).code === 'string'
		);
	}

	async start() {
		// Run cleanup periodically to delete orphaned temp files
		if (this.instanceSettings.instanceType !== 'main') return;

		this.cleanupInterval = setInterval(() => {
			void this.cleanupOrphanedFiles();
		}, this.globalConfig.fileStorage.cleanupIntervalMs);
	}

	async shutdown() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
	}

	private async cleanupOrphanedFiles(): Promise<void> {
		try {
			const files = await fs.readdir(this.uploadDir);
			const now = Date.now();
			const maxAge = this.globalConfig.fileStorage.fileMaxAgeMs;

			for (const file of files) {
				const filePath = safeJoinPath(this.uploadDir, file);
				try {
					const stats = await fs.stat(filePath);
					const fileAge = now - stats.mtimeMs;

					if (fileAge > maxAge) {
						await fs.unlink(filePath);
					}
				} catch {
					// Ignore errors for individual files (e.g., file already deleted)
					continue;
				}
			}
		} catch (error) {
			// Ignore errors if upload directory doesn't exist yet
			if (!this.isErrnoException(error) || error.code !== 'ENOENT') {
				this.logger.warn('Error cleaning up orphaned file-storage uploads', { error });
			}
		}
	}
}
