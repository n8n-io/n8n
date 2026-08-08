import { isRecord } from '@n8n/utils/is-record';

/** Machine-readable code returned when the Instance AI credit pool is exhausted. */
export const QUOTA_EXHAUSTED_ERROR_CODE = 'quota_exhausted';

/** Inspect an error and its cause chain for the quota-exhausted wire code. */
export function isQuotaExhaustedError(error: unknown): boolean {
	return readErrorCode(error) === QUOTA_EXHAUSTED_ERROR_CODE;
}

function readErrorCode(error: unknown, visited = new WeakSet<object>()): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	if (visited.has(error)) return undefined;
	visited.add(error);

	if ('errorCode' in error && typeof error.errorCode === 'string') {
		return error.errorCode;
	}

	if ('responseBody' in error && typeof error.responseBody === 'string') {
		const code = readResponseBodyCode(error.responseBody);
		if (code) return code;
	}

	if ('cause' in error && error.cause !== error) {
		return readErrorCode(error.cause, visited);
	}

	return undefined;
}

function readResponseBodyCode(responseBody: string): string | undefined {
	try {
		const body: unknown = JSON.parse(responseBody);
		if (!isRecord(body)) return undefined;
		if (typeof body.code === 'string') return body.code;
		return isRecord(body.error) && typeof body.error.type === 'string'
			? body.error.type
			: undefined;
	} catch {
		return undefined;
	}
}
