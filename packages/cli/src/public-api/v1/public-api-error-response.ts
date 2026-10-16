import { Logger } from '@n8n/backend-common';
import { classifyRestError, RestErrorKind, serializePublicApiError } from '@n8n/backend-services';
import { isAuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';

const MAX_LOGGED_MESSAGE_LENGTH = 1000;
const MAX_LOGGED_STACK_LENGTH = 4000;

/**
 * Maps errors from the public API stack to HTTP responses. Used by the
 * Express error middleware in `index.ts`.
 */
export function sendPublicApiErrorResponse(res: Response, error: Error): void {
	const descriptor = classifyRestError(error);
	const shouldReport =
		descriptor.kind === RestErrorKind.serverError ||
		descriptor.kind === RestErrorKind.unexpectedError ||
		(descriptor.kind === RestErrorKind.responseError && descriptor.status >= 500);

	const logger = Container.get(Logger);

	if (shouldReport) {
		try {
			const req = res.req;

			const method = req.method;
			const route = `${req.baseUrl}${req.route?.path ?? req.path}`;
			const userId = isAuthenticatedRequest(req) ? req.user.id : undefined;
			const message = sanitizeErrorDetail(error.message, MAX_LOGGED_MESSAGE_LENGTH);

			logger.error(`Public API request failed (${method} ${route}): ${error.name}: ${message}`, {
				method,
				route,
				userId,
				errorName: error.name,
				stack: error.stack ? sanitizeErrorDetail(error.stack, MAX_LOGGED_STACK_LENGTH) : undefined,
			});
		} catch (failure) {
			// Logging must never change the response. Record that logging failed,
			logger.error('Failed to log Public API server error', {
				errorName: ensureError(failure).name,
			});
		}
	}

	const { status, body } = serializePublicApiError(descriptor);
	res.status(status).json(body);
}
