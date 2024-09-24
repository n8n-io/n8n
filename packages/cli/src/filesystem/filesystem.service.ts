import { FileNotFoundError } from 'n8n-core';
import { ensureError } from 'n8n-workflow';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';
import tar from 'tar-stream';
import { Service } from 'typedi';

import { Logger } from '@/logger';

@Service()
export class FilesystemService {
	constructor(private readonly logger: Logger) {}

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

	/**
	 * Create a tarball from the given file paths.
	 * @param srcPaths Paths to the files to include in the tarball.
	 * @param tarballPath Path to the tarball file to create.
	 */
	async createTarball(tarballPath: string, srcPaths: string[]) {
		const pack = tar.pack();

		for (const filePath of srcPaths) {
			const fileContent = await fs.promises.readFile(filePath); // @TODO: Read stream
			pack.entry({ name: path.basename(filePath) }, fileContent);
		}

		pack.finalize();

		await pipeline(pack, createGzip(), fs.createWriteStream(tarballPath));

		this.logger.info('[FilesystemService] Created tarball', { tarballPath });
	}

	/**
	 * Extract a tarball to a given directory.
	 * @param tarballPath Path to the tarball file to extract.
	 * @param dstDir Path to the directory to extract the tarball into.
	 * @returns Paths to the extracted files.
	 */
	async extractTarball(tarballPath: string, dstDir: string) {
		await this.checkAccessible(tarballPath); // @TODO: Clearer error if tarball missing

		const extractedFilePaths: string[] = [];

		const extract = tar.extract();

		extract.on('entry', async (header, stream, next) => {
			const filePath = path.join(dstDir, header.name);
			await pipeline(stream, fs.createWriteStream(filePath));
			extractedFilePaths.push(filePath);
			next();
		});

		await pipeline(fs.createReadStream(tarballPath), createGunzip(), extract);

		this.logger.info('[FilesystemService] Extracted tarball', { tarballPath });

		return extractedFilePaths;
	}
}
