import {
	BadRequestError,
	ContentTooLargeError,
	InternalServerError,
	UnexpectedError,
} from '@n8n/errors';
import type { Request } from 'express';
import type { MulterError } from 'multer';
import type { ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';

import { loadMultipartParser } from './multipart-parser';
import type { RequestBodyHandler } from './types';

// Same regexes express-openapi-validator 5.5.3 used in legacy EOV handlers.
const PAYLOAD_TOO_BIG_CODE = /LIMIT_(FILE|PART)_(SIZE|COUNT)/;
const UNEXPECTED_FILE_CODE = /LIMIT_UNEXPECTED_FILE/;
const MISSING_BOUNDARY = /Multipart: Boundary not found/i;

function isMulterError(error: unknown): error is MulterError {
	return error instanceof Error && error.name === 'MulterError';
}

/**
 * Maps a multer parsing error to a serializable public API error matching the legacy EOV handlers.
 */
export function toPublicApiError(error: unknown): Error {
	if (isMulterError(error)) {
		if (PAYLOAD_TOO_BIG_CODE.test(error.code)) {
			return new ContentTooLargeError(error.message);
		}
		if (UNEXPECTED_FILE_CODE.test(error.code)) {
			return new InternalServerError(error.message);
		}
		return new BadRequestError(error.message);
	}

	const message = error instanceof Error ? error.message : String(error);
	if (MISSING_BOUNDARY.test(message)) {
		return new BadRequestError('multipart file(s) required');
	}

	return new InternalServerError(message);
}

function listFiles(files: Request['files']): Express.Multer.File[] {
	if (!files) return [];
	return Array.isArray(files) ? files : Object.values(files).flat();
}

/**
 * Merges a multipart body's text fields and uploaded files into one object for the route's `@Body`
 * DTO to validate. A field with several files under the same name becomes an array; a file wins over
 * a text field sent under the same name.
 *
 * Built with `Object.create(null)` so a field named `__proto__` becomes an enumerable key instead of
 * reassigning the object's prototype - the strict DTO then rejects it, instead of it silently vanishing.
 */
function mergeMultipartInput(req: Request): Record<string, unknown> {
	const input: Record<string, unknown> = Object.create(null);

	for (const [key, value] of Object.entries(req.body ?? {})) {
		input[key] = value;
	}

	const filesByField = new Map<string, Express.Multer.File[]>();

	for (const file of listFiles(req.files)) {
		const existing = filesByField.get(file.fieldname);
		if (existing) {
			existing.push(file);
		} else {
			filesByField.set(file.fieldname, [file]);
		}
	}

	for (const [fieldname, files] of filesByField) {
		input[fieldname] = files.length === 1 ? files[0] : files;
	}

	return input;
}

export const multipartRequestBody: RequestBodyHandler = {
	mediaType: 'multipart/form-data',
	// 500 is reachable via `toPublicApiError`
	errorStatuses: [413, 415, 500],
	discoverable: false,

	async parseBody(media, req, res) {
		if (media.mediaType !== 'multipart/form-data') {
			throw new UnexpectedError(
				'multipartRequestBody.parseBody called with a non-multipart media type',
			);
		}

		const parse = await loadMultipartParser(media.uploadLimits());

		await new Promise<void>((resolve, reject) => {
			void parse(req, res, (error?: unknown) => {
				if (error) {
					reject(toPublicApiError(error));
					return;
				}
				resolve();
			});
		});
	},

	readInput(req) {
		return mergeMultipartInput(req);
	},

	formatValidationError(error: ZodError) {
		const [issue] = error.errors;
		if (issue?.code === 'unrecognized_keys' && issue.keys.length > 0) {
			return `Unexpected form field "${issue.keys[0]}"`;
		}
		return formatValidationError('body', error);
	},
};
