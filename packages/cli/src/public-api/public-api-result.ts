import type { PublicApiResult } from '@/public-api/types';

export function toPublicApiResult(statusCode: number): PublicApiResult {
	if (statusCode >= 500) {
		return '5xx';
	}
	if (statusCode >= 400) {
		return '4xx';
	}
	return '2xx';
}
