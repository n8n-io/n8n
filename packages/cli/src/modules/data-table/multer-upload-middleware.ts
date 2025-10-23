import { InstanceSettingsConfig, GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { mkdir } from 'fs/promises';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import {
	type AuthenticatedRequestWithFile,
	type MulterDestinationCallback,
	type MulterFilenameCallback,
	type UploadMiddleware,
} from './types';

const UPLOADS_FOLDER_NAME = 'data-table-uploads';
const ALLOWED_MIME_TYPES = ['text/csv'];

@Service()
export class MulterUploadMiddleware implements UploadMiddleware {
	private upload: multer.Multer;

	private readonly uploadDir: string;

	constructor(
		private readonly instanceSettingsConfig: InstanceSettingsConfig,
		private readonly globalConfig: GlobalConfig,
	) {
		this.uploadDir = path.join(this.instanceSettingsConfig.n8nFolder, UPLOADS_FOLDER_NAME);

		// Create the upload directory asynchronously during initialization
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
				fileSize: this.globalConfig.dataTable.uploadMaxFileSize,
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

	single(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.single(fieldName)(req, res, (error) => {
				if (error) {
					(req as AuthenticatedRequestWithFile).fileUploadError = error;
				}
				next();
			});
		};
	}
}
