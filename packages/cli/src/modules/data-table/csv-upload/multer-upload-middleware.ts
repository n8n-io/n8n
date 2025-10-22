import { InstanceSettingsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { existsSync, mkdirSync } from 'fs';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';

import { MulterDestinationCallback, MulterFilenameCallback, UploadMiddleware } from './types';
import { FileUploadError } from '../errors/data-table-file-upload.error';

const UPLOADS_FOLDER_NAME = 'data-table-uploads';
const ALLOWED_MIME_TYPES = ['text/csv'];

@Service()
export class MulterUploadMiddleware implements UploadMiddleware {
	private upload: multer.Multer;

	constructor(private readonly instanceSettingsConfig: InstanceSettingsConfig) {
		const storage = multer.diskStorage({
			destination: (_req: Request, _file: Express.Multer.File, cb: MulterDestinationCallback) => {
				const uploadDir = path.join(this.instanceSettingsConfig.n8nFolder, UPLOADS_FOLDER_NAME);

				if (!existsSync(uploadDir)) {
					mkdirSync(uploadDir, { recursive: true });
				}

				cb(null, uploadDir);
			},
			filename: (_req: Request, _file: Express.Multer.File, cb: MulterFilenameCallback) => {
				const timestamp = Date.now();
				const uniqueId = nanoid(10);
				const filename = `${uniqueId}-${timestamp}`;
				cb(null, filename);
			},
		});

		this.upload = multer({
			storage,
			limits: {
				fileSize: 5 * 1024 * 1024, // 5MB
			},
			fileFilter: (_req, file, cb: multer.FileFilterCallback) => {
				if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
					cb(
						new FileUploadError(
							`Only the following file types are allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
						),
					);
					return;
				}
				cb(null, true);
			},
		});
	}

	single(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.single(fieldName)(req, res, (error) => {
				if (error instanceof multer.MulterError) {
					next(new FileUploadError(error.message));
				} else if (error) {
					next(error);
				} else {
					next();
				}
			});
		};
	}
}
