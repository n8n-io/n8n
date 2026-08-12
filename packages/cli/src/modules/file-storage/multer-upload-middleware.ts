/* eslint-disable id-denylist */
import { Logger, safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import multer from 'multer';
import { nanoid } from 'nanoid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { FileStorageSizeValidator } from './file-storage-size-validator.service';
import { ProjectFileRepository } from './project-file.repository';
import {
	type AuthenticatedRequestWithFile,
	type MulterDestinationCallback,
	type MulterFilenameCallback,
	type UploadMiddleware,
} from './types';
import { formatBytes } from './utils/size-utils';

/**
 * Receives multipart file uploads onto disk temp files and enforces the
 * instance-wide storage quota after each upload (the size is only known
 * post-stream). No extension allowlist: files are opaque bytes, served back
 * with download semantics and a sandbox CSP.
 */
@Service()
export class MulterUploadMiddleware implements UploadMiddleware {
	private upload: multer.Multer;

	private readonly uploadDir: string;

	private quotaCheckChain: Promise<void> = Promise.resolve();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly sizeValidator: FileStorageSizeValidator,
		private readonly projectFileRepository: ProjectFileRepository,
		private readonly logger: Logger,
	) {
		this.uploadDir = this.globalConfig.fileStorage.uploadDir;

		void this.ensureUploadDirExists();

		const storage = multer.diskStorage({
			destination: (_req: Request, _file: Express.Multer.File, cb: MulterDestinationCallback) => {
				cb(null, this.uploadDir);
			},
			filename: (_req: Request, _file: Express.Multer.File, cb: MulterFilenameCallback) => {
				const filename = nanoid(10);
				cb(null, filename);
			},
		});

		this.upload = multer({
			storage,
			limits: {
				fileSize: this.globalConfig.fileStorage.maxFileSize,
			},
		});
	}

	private async ensureUploadDirExists() {
		await mkdir(this.uploadDir, { recursive: true });
	}

	private async getUploadDirSize(): Promise<number> {
		const files = await readdir(this.uploadDir);
		let total = 0;
		for (const file of files) {
			try {
				const stats = await stat(safeJoinPath(this.uploadDir, file));
				if (stats.isFile()) total += stats.size;
			} catch (error) {
				this.logger.debug('Failed to stat file-storage upload file', { file, error });
			}
		}
		return total;
	}

	single(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.single(fieldName)(req, res, async (error) => {
				const authedReq = req as AuthenticatedRequestWithFile;
				if (error) {
					authedReq.fileUploadError = error;
					next();
					return;
				}

				if (authedReq.file) {
					try {
						await this.enqueueQuotaCheck(authedReq.file.path);
					} catch (err) {
						authedReq.fileUploadError = err as Error;
					}
				}
				next();
			});
		};
	}

	private async enqueueQuotaCheck(uploadPath: string): Promise<void> {
		// .catch on the shared chain so one rejection doesn't kill the queue.
		const next = this.quotaCheckChain
			.catch(() => {})
			.then(async () => await this.enforceQuotaPostUpload(uploadPath));
		this.quotaCheckChain = next.catch(() => {});
		await next;
	}

	private async enforceQuotaPostUpload(uploadPath: string): Promise<void> {
		let usedBytes: number;
		try {
			const sizeData = await this.sizeValidator.getCachedSizeData(async () => {
				return await this.projectFileRepository.getTotalSizeBytes();
			});
			const tempBytes = await this.getUploadDirSize();
			usedBytes = sizeData.totalBytes + tempBytes;
		} catch (error) {
			this.logger.warn('Failed to validate file storage budget; rejecting upload', {
				path: uploadPath,
				error,
			});
			await this.removeUpload(uploadPath);
			throw new BadRequestError('Could not validate storage limit');
		}

		if (usedBytes > this.globalConfig.fileStorage.maxSize) {
			await this.removeUpload(uploadPath);
			throw new BadRequestError(
				`Storage limit exceeded. Current usage: ${formatBytes(usedBytes)}, Limit: ${formatBytes(this.globalConfig.fileStorage.maxSize)}`,
			);
		}
	}

	private async removeUpload(uploadPath: string): Promise<void> {
		try {
			await unlink(uploadPath);
		} catch (error) {
			this.logger.warn('Failed to remove file-storage upload after quota rejection', {
				path: uploadPath,
				error,
			});
		}
	}
}
