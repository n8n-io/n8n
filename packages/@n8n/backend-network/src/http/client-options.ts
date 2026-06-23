import type { HttpRequestDefaultHeaders } from './client-default-headers';
import type { SsrfOption } from './node-agents';

export interface HttpRequestClientOptions {
	/**
	 * SSRF protection level. Defaults to the container's `SsrfProtectionService`.
	 * Pass `'disabled'` to explicitly opt out.
	 */
	ssrf?: SsrfOption;

	/**
	 * Base URL joined to each request's relative `url`.
	 * A request may still pass an absolute `url` (or its own `baseURL`) to override this per call.
	 */
	baseURL?: string;

	/**
	 * Default headers merged into every request.
	 * Per-request headers win per key.
	 * Pass a factory to compute them per call (e.g. an auth token that rotates between requests).
	 */
	headers?: HttpRequestDefaultHeaders | (() => HttpRequestDefaultHeaders);
}
