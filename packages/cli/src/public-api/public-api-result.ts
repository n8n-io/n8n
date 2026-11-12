export type PublicApiResult = '2xx' | '4xx' | '5xx';

export function toPublicApiResult(statusCode: number): PublicApiResult {
	if (statusCode >= 500) return '5xx';
	if (statusCode >= 400) return '4xx';
	// A 304 answers a conditional GET, so it counts as a successful call.
	return '2xx';
}
