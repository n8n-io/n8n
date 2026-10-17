import type { ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';

import type { RequestBodyHandler } from './types';

/**
 * The default request body handler if a media type is not specified on a route in `@Body`.
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
