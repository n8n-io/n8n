import { UnsupportedMediaTypeError } from '@n8n/errors';
import type { ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';
import { sendPublicApiErrorResponse } from '@/public-api/v1/public-api-error-response';

import { assertContentType } from '../content-type';
import type { RequestBodyHandler } from './types';

/**
 * The default request body: every route had this before `@Body` could declare a media type. The
 * body itself is already parsed by the app-wide `bodyParser` upstream of the registry; this handler
 * only checks `Content-Type` and reads it back.
 */
export const jsonRequestBody: RequestBodyHandler = {
	mediaType: 'application/json',
	errorStatuses: [415],
	discoverable: true,

	createMiddleware(_media, bodyRequired) {
		return (req, res, next) => {
			try {
				assertContentType({
					header: req.headers['content-type'],
					expected: 'application/json',
					bodyRequired,
				});
			} catch (error) {
				sendPublicApiErrorResponse(
					res,
					error instanceof UnsupportedMediaTypeError ? error : new Error(String(error)),
				);
				return;
			}
			next();
		};
	},

	readInput(req) {
		return req.body;
	},

	formatValidationError(error: ZodError) {
		return formatValidationError('body', error);
	},
};
