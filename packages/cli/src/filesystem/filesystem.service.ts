import { FileNotFoundError } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import fs from 'node:fs';
import { Service } from 'typedi';

@Service()
export class FilesystemService {
	/**
	 * Ensure a directory exists by checking or creating it.
	 * @param dirPath Path to the directory to check or create.
	 */
	async ensureDir(dirPath: string) {
		try {
			await fs.promises.access(dirPath);
		} catch {
			await fs.promises.mkdir(dirPath, { recursive: true });
		}
	}

	/**
	 * Check if a file or dir exists and is accessible.
	 * @param checkPath Path to the file or dir to check.
	 */
	async checkAccessible(checkPath: string) {
		try {
			await fs.promises.access(checkPath);
		} catch {
			throw new FileNotFoundError(checkPath);
		}
	}

	/**
	 * Remove files at the given paths, disregarding files not found.
	 * @param filePaths Paths to the files to remove.
	 */
	async removeFiles(filePaths: string[]) {
		for (const filePath of filePaths) {
			try {
				await fs.promises.unlink(filePath);
			} catch (e) {
				const error = ensureError(e);

				if ('code' in error && error.code === 'ENOENT') continue;

				throw error;
			}
		}
	}
}
