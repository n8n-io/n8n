import { safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { promises as fs } from 'fs';

@Service()
export class DataTableFileCleanupService {
	private readonly uploadDir: string;

	constructor(private readonly globalConfig: GlobalConfig) {
		this.uploadDir = this.globalConfig.dataTable.uploadDir;
	}

	private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
		return (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			typeof error.code === 'string'
		);
	}

	private isNotFound(error: unknown): boolean {
		return this.isErrnoException(error) && error.code === 'ENOENT';
	}

	/**
	 * Cleans up orphaned CSV files that exceed the configured maximum age
	 * These are files that were uploaded but never used to create a data table
	 */
	async cleanupOrphanedFiles(signal: AbortSignal): Promise<void> {
		let files: string[];
		try {
			files = await fs.readdir(this.uploadDir);
		} catch (error) {
			if (this.isNotFound(error)) return;
			throw error;
		}

		const now = Date.now();
		const maxAge = this.globalConfig.dataTable.fileMaxAgeMs;
		let firstError: unknown;

		for (const file of files) {
			if (signal.aborted) break;

			const filePath = safeJoinPath(this.uploadDir, file);
			try {
				const stats = await fs.stat(filePath);
				const fileAge = now - stats.mtimeMs;

				if (fileAge > maxAge) {
					await fs.unlink(filePath);
				}
			} catch (error) {
				// Another main or the import that used the file can delete it first.
				if (!this.isNotFound(error)) firstError ??= error;
			}
		}

		if (firstError !== undefined) throw firstError;
	}

	/**
	 * Deletes a specific CSV file by its fileId
	 */
	async deleteFile(fileId: string): Promise<void> {
		const filePath = safeJoinPath(this.uploadDir, fileId);
		try {
			await fs.unlink(filePath);
		} catch (error) {
			if (!this.isNotFound(error)) throw error;
		}
	}
}
