/**
 * Base error thrown by the n8n SDK for transport- or server-level failures.
 *
 * Carries the HTTP status code (when available) so callers can branch on it
 * without having to parse the message string.
 */
export class N8nError extends Error {
	/** HTTP status code from the failing response, if known. */
	status?: number;

	constructor(message: string, opts?: { status?: number }) {
		super(message);
		this.name = 'N8nError';
		this.status = opts?.status;
	}
}

/**
 * Thrown when the Hub rejects the request with HTTP 400.
 *
 * The parsed response `body` is preserved so callers can inspect server-side
 * validation diagnostics (e.g. missing parameters, type mismatches).
 */
export class N8nValidationError extends N8nError {
	/** Parsed response body from the failing 400 request, if available. */
	body?: unknown;

	constructor(message: string, opts?: { status?: number; body?: unknown }) {
		super(message, opts);
		this.name = 'N8nValidationError';
		this.body = opts?.body;
	}
}
