import { BadRequestError, ContentTooLargeError, InternalServerError } from '@n8n/errors';
import type { MulterError } from 'multer';

// Same regexes express-openapi-validator 5.5.3 used in its multipart middleware `error()` function
// (`openapi.multipart.js`), so a migrated route keeps its statuses and messages.
const PAYLOAD_TOO_BIG_CODE = /LIMIT_(FILE|PART)_(SIZE|COUNT)/;
const UNEXPECTED_FILE_CODE = /LIMIT_UNEXPECTED_FILE/;
const MISSING_BOUNDARY = /Multipart: Boundary not found/i;

/**
 * `multer`'s own `MulterError` class isn't loaded yet when this runs (see `./multipart-parser.ts`),
 * so this checks the shape multer gives every error it throws itself, rather than `instanceof`.
 */
function isMulterError(error: unknown): error is MulterError {
	return error instanceof Error && error.name === 'MulterError';
}

/**
 * Maps a multer parsing error to the same status and message the legacy validator produced, so a
 * migrated route's contract doesn't change. The returned errors are `ResponseError`s, which
 * `sendPublicApiErrorResponse` serializes to the same `{ message }` body eov's `HttpError.create`
 * produced for the same status - including an unexpected error, which eov forwarded unmasked; a
 * plain `Error` reaching the generic classifier instead would be masked as a 500.
 */
export function toPublicApiError(error: unknown): Error {
	if (isMulterError(error)) {
		if (PAYLOAD_TOO_BIG_CODE.test(error.code)) return new ContentTooLargeError(error.message);
		if (UNEXPECTED_FILE_CODE.test(error.code)) return new InternalServerError(error.message);
		return new BadRequestError(error.message);
	}

	const message = error instanceof Error ? error.message : String(error);
	if (MISSING_BOUNDARY.test(message)) return new BadRequestError('multipart file(s) required');

	return new InternalServerError(message);
}
