import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const ALLOWED_MIME_TYPES = ['application/pdf'];

@Service()
export class ChatHubUploadMiddleware {
	private readonly upload: multer.Multer;

	constructor(globalConfig: GlobalConfig) {
		const maxFileSizeBytes = globalConfig.endpoints.formDataFileSizeMax * 1024 * 1024;
		this.upload = multer({
			storage: multer.memoryStorage(),
			limits: { fileSize: maxFileSizeBytes },
			fileFilter: (_req, file, next) => {
				if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
					next(
						new BadRequestError(
							`Unsupported file type: ${file.mimetype}. Only PDF files are supported as agent knowledge.`,
						),
					);
					return;
				}
				next(null, true);
			},
		});
	}

	array(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.array(fieldName)(req, res, (error) => {
				if (error) {
					(req as typeof req & { fileUploadError?: Error }).fileUploadError = error as Error;
				}
				next();
			});
		};
	}
}
