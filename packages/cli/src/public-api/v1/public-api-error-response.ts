import { Logger } from '@n8n/backend-common';
import { isAxiosError } from '@n8n/backend-network';
import { classifyRestError, RestErrorKind, serializePublicApiError } from '@n8n/backend-services';
import { isAuthenticatedRequest } from '@n8n/db';
import { BaseError } from '@n8n/errors';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { ErrorReporter } from 'n8n-core';

const MAX_LOGGED_MESSAGE_LENGTH = 1000;

// Stops a cyclic cause chain from recursing forever.
const MAX_REPORTED_CAUSE_DEPTH = 5;

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
 * Logs the scrubbed error and sends a scrubbed copy to Sentry. The logger is
 * called directly because `ErrorReporter` writes the raw message and cause chain.
 * Each sink has its own try block, so a failure in one does not stop the other.
 */
function reportPublicApiError(req: Request | undefined, error: Error): void {
	const method = req?.method;
	const route = (req?.baseUrl ?? '') + (req?.route?.path ?? req?.path ?? '');
	const userId = req && isAuthenticatedRequest(req) ? req.user.id : undefined;
	const message = sanitizeErrorDetail(error.message, MAX_LOGGED_MESSAGE_LENGTH);

	try {
		Container.get(Logger).error(
			`Public API request failed (${method} ${route}): ${error.name}: ${message}`,
			{
				method,
				route,
				userId,
				errorName: error.name,
				stack: error.stack ? sanitizeErrorDetail(error.stack, Infinity) : undefined,
			},
		);
	} catch {
		// Keep the Sentry report when logging fails.
	}

	if (!shouldReportToSentry(error)) return;

	try {
		Container.get(ErrorReporter).error(sanitizeErrorForReport(error), {
			shouldBeLogged: false,
			tags: { source: 'public-api' },
			extra: { method, route, userId },
		});
	} catch {
		// Reporting must never change the response.
	}
}

/**
 * Mirrors the filters in `ErrorReporter.beforeSend`. The scrubbed copy is a
 * plain `Error`, so `beforeSend` cannot apply these filters to it.
 */
function shouldReportToSentry(error: Error): boolean {
	if (isAxiosError(error)) return false;
	if (error instanceof BaseError && !error.shouldReport) return false;
	if (hasIgnoredLevel(error)) return false;
	if ('cause' in error && error.cause instanceof Error && hasIgnoredLevel(error.cause))
		return false;
	return true;
}

/** Checks the structural `level` field, which `ErrorReporter.beforeSend` also reads. */
function hasIgnoredLevel(error: Error): boolean {
	return 'level' in error && (error.level === 'warning' || error.level === 'info');
}

/**
 * Copies an error with secrets removed from its message, stack and causes.
 * The copy does not reference the original error.
 */
function sanitizeErrorForReport(error: Error, depth = 0): Error {
	const copy = new Error(sanitizeErrorDetail(error.message, Infinity));
	copy.name = error.name;
	if (error.stack) copy.stack = sanitizeErrorDetail(error.stack, Infinity);
	if ('cause' in error && error.cause instanceof Error && depth < MAX_REPORTED_CAUSE_DEPTH) {
		copy.cause = sanitizeErrorForReport(error.cause, depth + 1);
	}
	return copy;
}
