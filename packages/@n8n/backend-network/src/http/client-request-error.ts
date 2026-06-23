/**
 * Guards for inspecting errors thrown by the {@link HttpRequestClient}.
 *
 * The client rejects on connection failures, and unless `ignoreHttpStatusErrors` is set, on non-2xx responses.
 * The rejected error carries the underlying transport's `code` and `response.status`.
 * These guards read them so callers can branch on the failure without coupling to a specific HTTP library.
 *
 */

/**
 * Whether the error represents a refused TCP connection (`ECONNREFUSED`).
 */
export function isConnectionRefusedError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: unknown }).code === 'ECONNREFUSED'
	);
}

/**
 * The HTTP status code carried by a request error, when the call received a response.
 */
export function httpStatusFromError(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'response' in error) {
		const response = (error as { response?: { status?: unknown } }).response;
		if (response && typeof response.status === 'number') {
			return response.status;
		}
	}
	return undefined;
}

/**
 * The shape of an error rejected by the {@link HttpRequestClient}
 * It carries the transport's `code` and, when a response was received, its `status` and parsed `data`.
 */
export interface HttpRequestError extends Error {
	code?: string;
	response?: { status?: number; data?: unknown };
}

/**
 * Process-global marker tagged onto every error the {@link HttpRequestClient} rejects with.
 * Uses `Symbol.for` (the global registry), not a module-local `Symbol()`,
 * so the tag still matches when this package is loaded as more than one module instance (src + dist).
 */
const HTTP_REQUEST_ERROR = Symbol.for('n8n.backend-network.http-request-error');

/**
 * Tags an error as rejected by the {@link HttpRequestClient}.
 * Called by the client on its reject path so {@link isHttpRequestError} can recognize it
 * without coupling to the transport library.
 */
export function markHttpRequestError<E>(error: E): E {
	if (typeof error === 'object' && error !== null) {
		Object.defineProperty(error, HTTP_REQUEST_ERROR, {
			value: true,
			enumerable: false, // it never leaks into logs, `JSON.stringify`, or `Object.keys`.
			configurable: true,
		});
	}
	return error;
}

/**
 * Whether the error was rejected by the {@link HttpRequestClient} (a transport
 * failure or a non-2xx response) rather than being an unrelated runtime error.
 * Lets callers read `response.data` without coupling to a specific HTTP library.
 */
export function isHttpRequestError(error: unknown): error is HttpRequestError {
	return (
		error instanceof Error &&
		(error as unknown as Record<symbol, unknown>)[HTTP_REQUEST_ERROR] === true
	);
}
