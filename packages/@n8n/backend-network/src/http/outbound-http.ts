import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	IRequestOptions,
} from 'n8n-workflow';
import type http from 'node:http';
import type https from 'node:https';
import type { Dispatcher } from 'undici';

import { httpRequest } from './axios/request';
import { executeLegacyRequest, type LegacyRequestCallbacks } from './legacy-request';
import { buildNodeAgents } from './node-agents';
import type { NodeAgentOptions, ProxyOption, SsrfOption } from './node-agents';
import { SsrfProtectionService } from '../ssrf';
import {
	buildDispatcher,
	dispatchedFetch,
	type CustomFetch,
	type TransportTimeoutOptions,
} from './undici/transport';

export interface HttpRequestClientOptions {
	/**
	 * SSRF protection level. Defaults to the container's `SsrfProtectionService`.
	 * Pass `'disabled'` to explicitly opt out.
	 */
	ssrf?: SsrfOption;
}

export interface HttpTransportOptions {
	/**
	 * Proxy routing for the transport. Defaults to `'env'` (HTTP(S)_PROXY / NO_PROXY).
	 *
	 * Fixed at creation: the transport hands a single dispatcher/agent to a foreign
	 * client that drives the calls afterwards, so the proxy cannot vary per call —
	 * unlike {@link HttpRequestClient}, which reads `proxy` from each request.
	 */
	proxy?: ProxyOption;
	/**
	 * SSRF protection level. Defaults to the container's `SsrfProtectionService`.
	 * Pass `'disabled'` to explicitly opt out.
	 */
	ssrf?: SsrfOption;
	/**
	 * Undici agent timeout overrides (ms). Unset fields keep undici's defaults.
	 * Used for long-running outbound calls (e.g. LLM completions) that would
	 * otherwise hit undici's 5-minute `headersTimeout` / `bodyTimeout`.
	 */
	timeouts?: TransportTimeoutOptions;
}

/**
 * Engine for outbound HTTP requests made on behalf of n8n: you hand it a request
 * descriptor and it performs the call and returns the response.
 *
 * Carries this client's SSRF policy. Proxy routing stays **per request** (read
 * from `options.proxy` / the environment), because n8n requests choose their
 * proxy per call rather than per client — so there is no proxy option here.
 */
export interface HttpRequestClient {
	/**
	 * Performs an outbound HTTP request from an `IHttpRequestOptions` descriptor,
	 * applying this client's SSRF policy, user-agent defaults and proxy routing.
	 *
	 * @returns the full response when `options.returnFullResponse` is `true`.
	 */
	request(
		options: IHttpRequestOptions & { returnFullResponse: true },
	): Promise<IN8nHttpFullResponse>;
	/**
	 * @returns the parsed body when `options.returnFullResponse` is unset or `false`.
	 */
	request(options: IHttpRequestOptions & { returnFullResponse?: false }): Promise<IN8nHttpResponse>;
	/**
	 * Fallback for a non-literal `returnFullResponse` flag.
	 *
	 * @returns the parsed body, or the full response when `options.returnFullResponse` is set.
	 */
	request(options: IHttpRequestOptions): Promise<IN8nHttpFullResponse | IN8nHttpResponse>;

	/**
	 * Performs a request using the deprecated `request`-style options
	 * (`IRequestOptions`), applying the same SSRF policy as {@link request}.
	 *
	 * `callbacks.onFetched` runs once after data is successfully fetched (used by
	 * the execution engine to fire its `nodeFetchedData` hook).
	 *
	 * @deprecated Use {@link request} with `IHttpRequestOptions`. This exists only
	 * to back the deprecated `request` helpers.
	 */
	requestLegacy(options: IRequestOptions, callbacks?: LegacyRequestCallbacks): Promise<unknown>;
}

/**
 * Transport primitives to hand to a third-party HTTP stack (an SDK you do not
 * drive yourself). You do not make the request here — you configure someone
 * else's client. Carries a fixed proxy + SSRF policy.
 *
 * The three shapes are not interchangeable styles; which one you use is dictated
 * by what the consuming library accepts:
 *
 * - **`asCustomFetch()`**: libraries that accept a full `fetch` replacement
 *   (e.g. an OIDC client's `customFetch`).
 * - **`getDispatcher()`**: SDKs built on undici's `fetch` that accept a
 *   `dispatcher` (e.g. OpenAI / Anthropic JS SDKs via `fetchOptions.dispatcher`).
 *   Injects only the transport while the SDK keeps its own `fetch` (streaming,
 *   retries, error parsing).
 * - **`getNodeAgent()`**: libraries built on Node's `http`/`https` that need
 *   `http.Agent` / `https.Agent` instances (e.g. AWS SDK v3 via `NodeHttpHandler`).
 *
 * SSRF coverage is identical for `asCustomFetch()` and `getDispatcher()` (same
 * underlying dispatcher, validated per hop). For `getNodeAgent()` it is enforced
 * via a connect-time secure DNS lookup, injected only for direct connections.
 */
export interface HttpTransport {
	asCustomFetch(): CustomFetch;
	getDispatcher(): Dispatcher;
	getNodeAgent(agentOptions?: NodeAgentOptions): { httpAgent: http.Agent; httpsAgent: https.Agent };
}

/**
 * The single entry point for outbound http requests in `@n8n/backend-network`.
 *
 * Injectable via `@n8n/di`. Pick by intent, not by transport library:
 *
 * - {@link requests}: you make a request and get a response (n8n request pipeline).
 * - {@link transport}: you obtain transport primitives to hand to a third-party SDK.
 */
@Service()
export class OutboundHttp {
	constructor(
		private readonly ssrfProtection: SsrfProtectionService,
		private readonly logger: Logger,
	) {}

	/**
	 * A {@link HttpRequestClient} carrying the given SSRF policy.
	 * Proxy is resolved per request from `IHttpRequestOptions.proxy` / the environment.
	 */
	requests(options?: HttpRequestClientOptions): HttpRequestClient {
		const ssrf = options?.ssrf ?? this.ssrfProtection;
		const ssrfBridge = ssrf === 'disabled' ? undefined : ssrf;

		return {
			request: (async (requestOptions: IHttpRequestOptions) =>
				await httpRequest(requestOptions, ssrfBridge)) as HttpRequestClient['request'],
			requestLegacy: async (requestOptions, callbacks) =>
				await executeLegacyRequest(requestOptions, ssrfBridge, this.logger, callbacks),
		};
	}

	/**
	 * An {@link HttpTransport} carrying the given proxy + SSRF policy.
	 */
	transport(options?: HttpTransportOptions): HttpTransport {
		const proxy = options?.proxy ?? 'env';
		const ssrf = options?.ssrf ?? this.ssrfProtection;
		const timeouts = options?.timeouts;

		const lazyDispatcher = lazy(() => buildDispatcher(proxy, ssrf, timeouts));
		const lazyNodeAgents = lazy(() => buildNodeAgents(proxy, ssrf));

		return {
			asCustomFetch: () => async (input, init) =>
				await dispatchedFetch(lazyDispatcher(), input, init),
			getDispatcher: () => lazyDispatcher(),
			getNodeAgent: (agentOptions) =>
				agentOptions !== undefined ? buildNodeAgents(proxy, ssrf, agentOptions) : lazyNodeAgents(),
		};
	}
}

function lazy<T>(factory: () => T): () => T {
	let cached: { value: T } | undefined;
	return () => (cached ??= { value: factory() }).value;
}
