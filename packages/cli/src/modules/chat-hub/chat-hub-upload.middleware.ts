import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';
import multer from 'multer';

@Service()
export class ChatHubUploadMiddleware {
	private readonly upload: multer.Multer;

	constructor(globalConfig: GlobalConfig) {
		const maxFileSizeBytes = globalConfig.endpoints.formDataFileSizeMax * 1024 * 1024;
		this.upload = multer({
			storage: multer.diskStorage({}),
			limits: { fileSize: maxFileSizeBytes },
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
