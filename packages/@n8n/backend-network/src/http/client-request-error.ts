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
