import type { Response } from 'express';

import type { HttpErrorClassifierContext } from '@/errors/http-error-classifier';
import { classifyHttpError } from '@/errors/http-error-classifier';
import { serializePublicApiError } from '@/errors/http-error-serializers';

/**
 * Maps errors from the public API stack to HTTP responses. Used by the
 * Express error middleware in `index.ts`.
 */
export function sendPublicApiErrorResponse(
	res: Response,
	error: Error,
	context?: HttpErrorClassifierContext,
): void {
	const descriptor = classifyHttpError(error, context);
	const { status, body } = serializePublicApiError(descriptor);
	res.status(status).json(body);
}
