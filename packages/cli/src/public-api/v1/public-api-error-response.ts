import type { Response } from 'express';

import { classifyRestError, serializePublicApiError } from '@n8n/backend-services';

/**
 * Maps errors from the public API stack to HTTP responses. Used by the
 * Express error middleware in `index.ts`.
 */
export function sendPublicApiErrorResponse(res: Response, error: Error): void {
	const descriptor = classifyRestError(error);
	const { status, body } = serializePublicApiError(descriptor);
	res.status(status).json(body);
}
