import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { promises as fs } from 'fs';
import path from 'path';

@Service()
export class DataTableFileCleanupService {
	private readonly uploadDir: string;

	private cleanupInterval?: NodeJS.Timeout;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.uploadDir = this.globalConfig.dataTable.uploadDir;
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
		// Run cleanup periodically to delete orphaned files
		this.cleanupInterval = setInterval(() => {
			void this.cleanupOrphanedFiles();
		}, this.globalConfig.dataTable.cleanupIntervalMs);
	}

	async shutdown() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
	}

	/**
	 * Cleans up orphaned CSV files that exceed the configured maximum age
	 * These are files that were uploaded but never used to create a data table
	 */
	private async cleanupOrphanedFiles(): Promise<void> {
		try {
			const files = await fs.readdir(this.uploadDir);
			const now = Date.now();
			const maxAge = this.globalConfig.dataTable.fileMaxAgeMs;

			for (const file of files) {
				const filePath = path.join(this.uploadDir, file);
				try {
					const stats = await fs.stat(filePath);
					const fileAge = now - stats.mtimeMs;

					// Delete files older than the configured maximum age
					if (fileAge > maxAge) {
						await fs.unlink(filePath);
					}
				} catch (error) {
					// Ignore errors for individual files (e.g., file already deleted)
					continue;
				}
			}
		} catch (error) {
			// Ignore errors if upload directory doesn't exist yet
			if (!this.isErrnoException(error) || error.code !== 'ENOENT') {
				// Log other errors but don't throw - cleanup is best effort
				console.error('Error cleaning up orphaned CSV files:', error);
			}
		}
	}

	/**
	 * Deletes a specific CSV file by its fileId
	 */
	async deleteFile(fileId: string): Promise<void> {
		const filePath = path.join(this.uploadDir, fileId);
		try {
			await fs.unlink(filePath);
		} catch (error) {
			// Ignore errors if file doesn't exist
			if (!this.isErrnoException(error) || error.code !== 'ENOENT') {
				throw error;
			}
		}
	}
}
