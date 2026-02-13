/* eslint-disable id-denylist */
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import { mkdir } from 'fs/promises';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { tmpdir } from 'os';
import { join } from 'path';

import type {
	AuthenticatedRequestWithFile,
	MulterDestinationCallback,
	MulterFilenameCallback,
	UploadMiddleware,
} from './types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Service()
export class FileUploadMulterMiddleware implements UploadMiddleware {
	private upload: multer.Multer;

	private readonly uploadDir: string;

	constructor() {
		this.uploadDir = join(tmpdir(), 'n8n-file-uploads');

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
			limits: { fileSize: MAX_FILE_SIZE },
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
