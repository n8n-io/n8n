import type { RequestBodyMedia } from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';
import type { Request } from 'express';
import type { ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';
import { sendPublicApiErrorResponse } from '@/public-api/v1/public-api-error-response';

import { assertContentType } from '../content-type';
import { toPublicApiError } from './multipart-errors';
import { loadMultipartParser } from './multipart-parser';
import type { RequestBodyHandler } from './request-body-handler';

function isMultipartMedia(
	media: RequestBodyMedia,
): media is RequestBodyMedia & { mediaType: 'multipart/form-data' } {
	return media.mediaType === 'multipart/form-data';
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
 * Built with `Object.create(null)` rather than `{}`, so a part literally named `__proto__` becomes an
 * own, enumerable key instead of reassigning the object's prototype - the strict DTO then rejects it
 * like any other unknown field, instead of it silently vanishing.
 */
function mergeMultipartInput(req: Request): Record<string, unknown> {
	const input: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

	for (const [key, value] of Object.entries(req.body ?? {})) {
		input[key] = value;
	}

	const filesByField = new Map<string, Express.Multer.File[]>();
	for (const file of listFiles(req.files)) {
		const existing = filesByField.get(file.fieldname);
		if (existing) existing.push(file);
		else filesByField.set(file.fieldname, [file]);
	}
	for (const [fieldname, files] of filesByField) {
		input[fieldname] = files.length === 1 ? files[0] : files;
	}

	return input;
}

export const multipartRequestBody: RequestBodyHandler = {
	mediaType: 'multipart/form-data',
	errorStatuses: [413, 415],
	discoverable: false,

	createMiddleware(media, bodyRequired) {
		if (!isMultipartMedia(media)) {
			// Can't happen: `REQUEST_BODY_HANDLERS` only ever calls a handler with its own media type.
			throw new UnexpectedError(
				'multipartRequestBody.createMiddleware called with a non-multipart media type',
			);
		}

		return async (req, res, next) => {
			let matched: boolean;
			try {
				matched = assertContentType(
					req.headers['content-type'],
					'multipart/form-data',
					bodyRequired,
				);
			} catch (error) {
				sendPublicApiErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
				return;
			}

			if (!matched) {
				next();
				return;
			}

			let parse;
			try {
				parse = await loadMultipartParser(media.uploadLimits());
			} catch (error) {
				sendPublicApiErrorResponse(res, error instanceof Error ? error : new Error(String(error)));
				return;
			}

			void parse(req, res, (error: unknown) => {
				if (error) {
					sendPublicApiErrorResponse(res, toPublicApiError(error));
					return;
				}
				next();
			});
		};
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
