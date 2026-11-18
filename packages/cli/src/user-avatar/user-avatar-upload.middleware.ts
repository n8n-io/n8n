import { USER_AVATAR_MAX_FILE_SIZE_BYTES } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { RequestHandler } from 'express';
import multer from 'multer';

export type RequestWithAvatarFile = {
	file?: Express.Multer.File;
	fileUploadError?: Error;
};

/**
 * Reads the single `picture` field of a multipart upload into memory. Pictures
 * are capped at 1 MB, so there is no reason to go through a temp file. A few
 * small text fields (the backdrop) may ride along. Errors are parked on the
 * request so the controller can turn them into a 400 with a message the user
 * can act on.
 */
@Service()
export class UserAvatarUploadMiddleware {
	private readonly upload = multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: USER_AVATAR_MAX_FILE_SIZE_BYTES, files: 1, fields: 4, fieldSize: 64 },
	});

	single(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.single(fieldName)(req, res, (error) => {
				if (error) (req as typeof req & RequestWithAvatarFile).fileUploadError = error as Error;
				next();
			});
		};
	}
}

export function describeAvatarUploadError(error: Error): string {
	if (error instanceof multer.MulterError) {
		switch (error.code) {
			case 'LIMIT_FILE_SIZE':
				return `Pictures must be ${USER_AVATAR_MAX_FILE_SIZE_BYTES / 1024 / 1024} MB or smaller`;
			case 'LIMIT_FILE_COUNT':
			case 'LIMIT_UNEXPECTED_FILE':
				return 'Upload exactly one picture in the "picture" field';
			default:
				return error.message;
		}
	}
	return 'Upload failed';
}
