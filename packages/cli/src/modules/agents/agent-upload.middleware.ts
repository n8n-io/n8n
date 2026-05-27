import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';
import multer from 'multer';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export const ALLOWED_AGENT_FILE_EXTENSIONS = ['.csv', '.md', '.markdown', '.pdf', '.txt'] as const;
export const MAX_AGENT_FILES_PER_UPLOAD = 10;
export const MAX_AGENT_FILE_SIZE_MB = 50;
export const MAX_AGENT_FILE_SIZE_BYTES = MAX_AGENT_FILE_SIZE_MB * 1024 * 1024;

const allowedAgentFileExtensions = new Set<string>(ALLOWED_AGENT_FILE_EXTENSIONS);

export function isAllowedAgentFile(file: Pick<Express.Multer.File, 'originalname'>) {
	const extension = path.extname(file.originalname).toLowerCase();

	return allowedAgentFileExtensions.has(extension);
}

@Service()
export class AgentUploadMiddleware {
	private readonly upload: multer.Multer = multer({
		storage: multer.diskStorage({}),
		limits: { fileSize: MAX_AGENT_FILE_SIZE_BYTES },
		fileFilter: (_req, file, done) => {
			if (!isAllowedAgentFile(file)) {
				done(new BadRequestError('Only CSV, PDF, Markdown, and TXT files are allowed'));
				return;
			}

			done(null, true);
		},
	});

	array(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.array(fieldName, MAX_AGENT_FILES_PER_UPLOAD)(req, res, (error) => {
				if (error) {
					(req as typeof req & { fileUploadError?: Error }).fileUploadError = error as Error;
				}
				next();
			});
		};
	}
}
