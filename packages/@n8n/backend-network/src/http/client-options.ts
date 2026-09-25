import type { HttpRequestDefaultHeaders } from './client-default-headers';
import type { UseDefaultSsrfPolicy } from './use-default-ssrf-policy';

export interface HttpRequestClientOptions {
	/**
	 * Whether this client enforces the instance's outbound network policy.
	 * Defaults to `'safe'`. Pass `'unsafe'` to explicitly opt out.
	 */
	useDefaultSsrfPolicy?: UseDefaultSsrfPolicy;

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

	/**
	 * Default request timeout (ms) applied to every call on this client.
	 * A per-request `timeout` overrides it.
	 * Set it once here instead of repeating it on each request.
	 */
	timeout?: number;
}
