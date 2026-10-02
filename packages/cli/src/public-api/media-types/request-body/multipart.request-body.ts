import { UnexpectedError } from '@n8n/errors';
import type { Request } from 'express';
import type { ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';

import { toPublicApiError } from './multipart-errors';
import { loadMultipartParser } from './multipart-parser';
import type { RequestBodyHandler } from './types';

function listFiles(files: Request['files']): Express.Multer.File[] {
	if (!files) return [];
	return Array.isArray(files) ? files : Object.values(files).flat();
}

/**
 * Merges a multipart body's text fields and uploaded files into one object for the route's `@Body`
 * DTO to validate. A field with several files under the same name becomes an array; a file wins over
 * a text field sent under the same name.
 *
 * Built with `Object.create(null)` rather than `{}`, so a part literally named `__proto__` becomes an
 * own, enumerable key instead of reassigning the object's prototype - the strict DTO then rejects it
 * like any other unknown field, instead of it silently vanishing.
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
	// 500 is reachable: `toPublicApiError` returns an InternalServerError for an unmasked parse
	// failure (a malformed/truncated body) and for `LIMIT_UNEXPECTED_FILE` - see multipart-errors.ts.
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
