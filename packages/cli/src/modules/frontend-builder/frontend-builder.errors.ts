import { ResponseError } from '@/errors/response-errors/abstract/response.error';

/**
 * Thrown when the upstream v0 API fails. Status 502 (Bad Gateway) reflects
 * that n8n is acting as a proxy/orchestrator for v0 — when the upstream is
 * unreachable or errors, the FE caller should know it's a transient
 * (retryable) failure rather than something they did wrong.
 */
export class V0UpstreamError extends ResponseError {
	constructor(message: string, cause?: unknown) {
		super(message, 502, 502, undefined, cause);
		this.name = 'V0UpstreamError';
	}
}
