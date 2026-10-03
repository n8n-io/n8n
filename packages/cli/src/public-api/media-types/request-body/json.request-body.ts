import type { ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';

import type { RequestBodyHandler } from './types';

/**
 * The default request body: every route had this before `@Body` could declare a media type. The
 * body itself is already parsed by the app-wide `bodyParser` upstream of the registry, and the
 * registry checks `Content-Type` itself before calling into any handler - so there is nothing
 * left for this one to parse.
 */
export const jsonRequestBody: RequestBodyHandler = {
	mediaType: 'application/json',
	errorStatuses: [415],
	discoverable: true,

	readInput(req) {
		return req.body;
	},

	formatValidationError(error: ZodError) {
		return formatValidationError('body', error);
	},
};
