import { ResponseError } from '@n8n/rest-api-client';

/**
 * Another operation held the environment's lock, so the server ran nothing. The same request
 * can succeed when that operation finishes.
 */
export const isLockedError = (error: unknown): error is ResponseError =>
	error instanceof ResponseError && error.httpStatusCode === 423;

/** The change preview answers 404 when the project has no environment for the direction. */
export const isPreviewNotConfigured = (error: unknown): boolean =>
	error instanceof ResponseError && error.httpStatusCode === 404;
