/* eslint-disable id-denylist */
import { Logger, safeJoinPath } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import multer from 'multer';
import { nanoid } from 'nanoid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { DataTableSizeValidator } from './data-table-size-validator.service';
import { DataTableRepository } from './data-table.repository';
import {
	type AuthenticatedRequestWithFile,
	type MulterDestinationCallback,
	type MulterFilenameCallback,
	type UploadMiddleware,
} from './types';
import { formatBytes } from './utils/size-utils';

const ALLOWED_MIME_TYPES = ['text/csv'];

@Service()
export class MulterUploadMiddleware implements UploadMiddleware {
	private upload: multer.Multer;

	private readonly uploadDir: string;

	private quotaCheckChain: Promise<void> = Promise.resolve();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly sizeValidator: DataTableSizeValidator,
		private readonly dataTableRepository: DataTableRepository,
		private readonly logger: Logger,
	) {
		this.uploadDir = this.globalConfig.dataTable.uploadDir;

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
				fileSize:
					this.globalConfig.dataTable.uploadMaxFileSize ?? this.globalConfig.dataTable.maxSize,
			},
			fileFilter: (_req, file, cb: multer.FileFilterCallback) => {
				if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
					cb(
						new BadRequestError(
							`Only the following file types are allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
						),
					);
					return;
				}
				cb(null, true);
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
				this.logger.debug('Failed to stat data-table upload file', { file, error });
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
				return await this.dataTableRepository.findDataTablesSize();
			});
			const tempBytes = await this.getUploadDirSize();
			usedBytes = sizeData.totalBytes + tempBytes;
		} catch (error) {
			this.logger.warn('Failed to validate data-table storage budget; rejecting upload', {
				path: uploadPath,
				error,
			});
			await this.removeUpload(uploadPath);
			throw new BadRequestError('Could not validate storage limit');
		}

		if (usedBytes > this.globalConfig.dataTable.maxSize) {
			await this.removeUpload(uploadPath);
			throw new BadRequestError(
				`Storage limit exceeded. Current usage: ${formatBytes(usedBytes)}, Limit: ${formatBytes(this.globalConfig.dataTable.maxSize)}`,
			);
		}
	}

	private async removeUpload(uploadPath: string): Promise<void> {
		try {
			await unlink(uploadPath);
		} catch (error) {
			this.logger.warn('Failed to remove data-table upload after quota rejection', {
				path: uploadPath,
				error,
			});
		}
	}
}
