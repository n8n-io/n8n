/**
 * Pick a stable machine-readable error code for the response. `ResponseError`
 * subclasses expose `httpStatusCode` (an HTTP status number); other thrown values
 * or custom error objects may expose `errorCode`. If `httpStatusCode` is present,
 * it is mapped to `'HTTP_' + value`. Otherwise, `errorCode` is used if present.
 * If neither is present, falls back to `'UNKNOWN_ERROR'`.
 */
export function getErrorCode(error: unknown): string {
	if (typeof error === 'object' && error !== null) {
		if ('httpStatusCode' in error) {
			const value = (error as { httpStatusCode: unknown }).httpStatusCode;
			if (typeof value === 'number' || typeof value === 'string') {
				return `HTTP_${value}`;
			}
		}
		if ('errorCode' in error) {
			const value = (error as { errorCode: unknown }).errorCode;
			if (typeof value === 'number') return String(value);
			if (typeof value === 'string') return value;
		}
	}
	return 'UNKNOWN_ERROR';
}
