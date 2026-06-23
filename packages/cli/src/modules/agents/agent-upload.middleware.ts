import {
	ALLOWED_AGENT_FILE_EXTENSIONS,
	MAX_AGENT_FILE_SIZE_BYTES,
	MAX_AGENT_FILES_PER_UPLOAD,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const allowedAgentFileExtensions = new Set<string>(ALLOWED_AGENT_FILE_EXTENSIONS);

export function isAllowedAgentFile(file: Pick<Express.Multer.File, 'originalname'>) {
	const extension = path.extname(file.originalname).toLowerCase();

	return allowedAgentFileExtensions.has(extension);
}

/**
 * Best-effort removal of multer's on-disk temp files. The upload handler hands
 * successful uploads to AgentKnowledgeService (which cleans up its own temp
 * files), but early bail-outs (knowledge base disabled, upload error, no files)
 * return before that, so the controller calls this to avoid leaking temp files.
 */
export async function cleanupUploadedTempFiles(files: Express.Multer.File[]) {
	await Promise.all(
		files.map(async (file) => {
			if (!file.path) return;
			await unlink(file.path).catch(() => {});
		}),
	);
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
