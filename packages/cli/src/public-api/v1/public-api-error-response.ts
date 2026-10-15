import { Logger } from '@n8n/backend-common';
import { classifyRestError, RestErrorKind, serializePublicApiError } from '@n8n/backend-services';
import { isAuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { ErrorReporter } from 'n8n-core';

const MAX_LOGGED_MESSAGE_LENGTH = 1000;

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

	if (shouldReport) {
		try {
			reportPublicApiError(res.req, error);
		} catch {
			// Reporting must never change the response.
		}
	}

	const { status, body } = serializePublicApiError(descriptor);
	res.status(status).json(body);
}

/**
 * Logs the scrubbed error and sends it to Sentry. The logger is called
 * directly because `ErrorReporter` writes the raw message and cause chain.
 */
function reportPublicApiError(req: Request | undefined, error: Error): void {
	const method = req?.method;
	const route = (req?.baseUrl ?? '') + (req?.route?.path ?? req?.path ?? '');
	const userId = req && isAuthenticatedRequest(req) ? req.user.id : undefined;
	const message = sanitizeErrorDetail(error.message, MAX_LOGGED_MESSAGE_LENGTH);

	Container.get(Logger).error(
		`Public API request failed (${method} ${route}): ${error.name}: ${message}`,
		{
			method,
			route,
			userId,
			errorName: error.name,
			stack: error.stack ? scrubSecretsInText(error.stack) : undefined,
		},
	);

	Container.get(ErrorReporter).error(error, {
		shouldBeLogged: false,
		tags: { source: 'public-api' },
		extra: { method, route, userId },
	});
}
