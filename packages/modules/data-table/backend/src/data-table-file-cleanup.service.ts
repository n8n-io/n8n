import { Logger, safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { promises as fs } from 'fs';

import { FileUploadError } from './errors/data-table-file-upload.error';

const UPLOADED_FILE_ID_PATTERN = /^[\w-]+$/;

const CLAIMED_FILE_SUFFIX = '.importing';

const FILE_NOT_AVAILABLE_MESSAGE =
	'The file was not found or was already imported. Upload the file again.';

@Service()
export class DataTableFileCleanupService {
	private readonly uploadDir: string;

	// Claimed files that an import in this process still reads. The cleanup skips them,
	// because a claimed file keeps the modification time of its upload.
	private readonly activeClaims = new Set<string>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.uploadDir = this.globalConfig.dataTable.uploadDir;
		this.logger = this.logger.scoped('data-table');
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

		for (const file of files) {
			if (signal.aborted) break;

			if (this.activeClaims.has(file)) {
				continue;
			}

			const filePath = safeJoinPath(this.uploadDir, file);
			try {
				const stats = await fs.stat(filePath);
				const fileAge = now - stats.mtimeMs;

				if (fileAge > maxAge) {
					await fs.unlink(filePath);
				}
			} catch (error) {
				// Another main or the import that used the file can delete it first.
				if (this.isNotFound(error)) continue;
				this.logger.warn('Could not delete an orphaned data table upload file', {
					file,
					error: ensureError(error).message,
				});
			}
		}
	}

	/**
	 * Reserves an uploaded file for one import by renaming it. Only one concurrent call
	 * can rename the file, so the other calls fail. The caller reads the returned fileId
	 * and must delete it after the import.
	 */
	async claimFile(fileId: string): Promise<string> {
		// Upload ids never contain a dot, so callers cannot pass the id of a claimed file.
		if (!UPLOADED_FILE_ID_PATTERN.test(fileId)) {
			throw new FileUploadError(FILE_NOT_AVAILABLE_MESSAGE);
		}

		const claimedFileId = `${fileId}${CLAIMED_FILE_SUFFIX}`;
		try {
			await fs.rename(
				safeJoinPath(this.uploadDir, fileId),
				safeJoinPath(this.uploadDir, claimedFileId),
			);
		} catch (error) {
			if (this.isNotFound(error)) {
				throw new FileUploadError(FILE_NOT_AVAILABLE_MESSAGE);
			}

			throw error;
		}

		this.activeClaims.add(claimedFileId);
		return claimedFileId;
	}

	/**
	 * Deletes a specific CSV file by its fileId
	 */
	async deleteFile(fileId: string): Promise<void> {
		this.activeClaims.delete(fileId);
		const filePath = safeJoinPath(this.uploadDir, fileId);
		try {
			await fs.unlink(filePath);
		} catch (error) {
			if (!this.isNotFound(error)) throw error;
		}
	}
}
