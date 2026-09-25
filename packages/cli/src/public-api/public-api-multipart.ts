import type { MultipartUploadLimits } from '@n8n/decorators';
import type { Request, RequestHandler } from 'express';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ContentTooLargeError } from '@/errors/response-errors/content-too-large.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

// Same regexes express-openapi-validator 5.5.3 used in its multipart middleware `error()` function
// (`openapi.multipart.js`), so a migrated route keeps its statuses and messages.
const PAYLOAD_TOO_BIG_CODE = /LIMIT_(FILE|PART)_(SIZE|COUNT)/;
const UNEXPECTED_FILE_CODE = /LIMIT_UNEXPECTED_FILE/;
const MISSING_BOUNDARY = /Multipart: Boundary not found/i;

/**
 * Maps a multer parsing error to the same status and message the legacy validator produced, so a
 * migrated route's contract doesn't change. `BadRequestError`/`ContentTooLargeError`/
 * `InternalServerError` are `ResponseError`s, which `sendPublicApiErrorResponse` serializes to the
 * same `{ message }` body eov's `HttpError.create` did for the same status.
 */
export function toPublicApiError(error: unknown): Error {
	if (error instanceof multer.MulterError) {
		if (PAYLOAD_TOO_BIG_CODE.test(error.code)) return new ContentTooLargeError(error.message);
		if (UNEXPECTED_FILE_CODE.test(error.code)) return new InternalServerError(error.message);
		return new BadRequestError(error.message);
	}

	const message = error instanceof Error ? error.message : String(error);
	if (MISSING_BOUNDARY.test(message)) return new BadRequestError('multipart file(s) required');

	return new InternalServerError(message);
}

/**
 * Parses a `multipart/form-data` body the same way express-openapi-validator's `fileUploader` did:
 * `multer({ storage: multer.memoryStorage(), limits }).any()`. On failure, calls `next` with the
 * mapped error instead of the raw multer one.
 */
export function createMultipartBodyMiddleware(limits: MultipartUploadLimits): RequestHandler {
	const upload = multer({ storage: multer.memoryStorage(), limits }).any();

	return (req, res, next) => {
		void upload(req, res, (error: unknown) => {
			next(error ? toPublicApiError(error) : undefined);
		});
	};
}

function listFiles(files: Request['files']): Express.Multer.File[] {
	if (!files) return [];
	return Array.isArray(files) ? files : Object.values(files).flat();
}

/**
 * Groups `req.files` (populated by `multer(...).any()`) by field name, the shape a route's `@Body`
 * DTO expects to merge with `req.body`. A field name with one file maps to the file; several files
 * under the same field name map to an array.
 */
export function filesByFieldName(
	files: Request['files'],
): Record<string, Express.Multer.File | Express.Multer.File[]> {
	const byField = new Map<string, Express.Multer.File[]>();

	for (const file of listFiles(files)) {
		const existing = byField.get(file.fieldname);
		if (existing) {
			existing.push(file);
		} else {
			byField.set(file.fieldname, [file]);
		}
	}

	const result: Record<string, Express.Multer.File | Express.Multer.File[]> = {};
	for (const [fieldname, fieldFiles] of byField) {
		result[fieldname] = fieldFiles.length === 1 ? fieldFiles[0] : fieldFiles;
	}
	return result;
}
