import type { IHttpRequestOptions } from 'n8n-workflow';

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

	/**
	 * Reuse connections across requests on this client.
	 * The client creates its agents once, with these settings, and `request()` sends through them.
	 * `keepAlive` defaults to `true`.
	 * Call `close()` on the client to release them.
	 *
	 * Redirect hops create their own agents, and `requestLegacy()` does not use the pool.
	 * `maxSockets` and `close()` do not apply to them.
	 *
	 * A request on this client must not set `proxy`, `agentOptions` or `skipSslCertificateValidation`.
	 * The client throws if it does, because the shared agents cannot apply them.
	 */
	connectionPool?: HttpConnectionPoolOptions;
}

export interface HttpConnectionPoolOptions {
	proxy?: IHttpRequestOptions['proxy'];
	agentOptions?: IHttpRequestOptions['agentOptions'];
	skipSslCertificateValidation?: boolean;
}
