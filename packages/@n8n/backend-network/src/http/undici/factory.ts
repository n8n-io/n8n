import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';
import type http from 'node:http';
import type https from 'node:https';
import type { Dispatcher } from 'undici';
import { Agent, EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch } from 'undici';

import { SsrfProtectionService } from '../../ssrf';
import type { SsrfBridge } from '../../ssrf';
import { buildNodeAgents } from '../node-agents';
import type { NodeAgentOptions, ProxyOption, SsrfOption } from '../node-agents';

/**
 * Drop-in replacement type for the global `fetch`.
 */
export type CustomFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OutboundHttpClientOptions {
	/**
	 * Proxy routing for requests made via this client. Defaults to `'env'`.
	 */
	proxy?: ProxyOption;
	/**
	 * SSRF protection level.
	 * Pass `'disabled'` to explicitly opt out.
	 */
	ssrf?: SsrfOption;
}

/**
 * An outbound HTTP client carrying a fixed proxy + SSRF policy, exposing three integration shapes.
 * They are not interchangeable styles. Which one you use is dictated by the HTTP stack of the library you are calling.
 *
 * Pick by answering: "what does the consuming library accept?"
 *
 * - **`asCustomFetch()`**: for code that calls `fetch` itself, or libraries
 *   that accept a full `fetch` replacement (e.g. an OIDC client's `customFetch`).
 *   You own the whole call. Use this when there is no SDK in between,
 *   or the SDK lets you swap `fetch` entirely.
 *
 * - **`getDispatcher()`**: for SDKs built on undici's `fetch` that accept a `dispatcher`
 *   (e.g. the OpenAI / Anthropic JS SDKs via `fetchOptions.dispatcher`).
 *   This injects only the *transport* (proxy, pooling, timeouts) while the SDK keeps its own `fetch`,
 *   preserving its streaming (SSE), retry and error-parsing behaviour.
 *   Prefer this over `asCustomFetch()` for such SDKs:
 *   replacing their `fetch` would mean re-implementing that behaviour.
 *   Both shapes give identical SSRF coverage. They share the same underlying dispatcher.
 *
 * - **`getNodeAgent()`**: for libraries built on Node's `http`/`https` rather
 *   than undici, which cannot take a dispatcher and need `http.Agent` /
 *   `https.Agent` instances (e.g. AWS SDK v3 via `NodeHttpHandler`).
 *   This is the only shape that enforces SSRF via a connect-time secure DNS lookup.
 *
 * SSRF protection is on by default for all three.
 * Opt out per client with `create({ ssrf: 'disabled' })`.
 * Proxy routing defaults to `'env'` (HTTP(S)_PROXY / NO_PROXY).
 */
export interface OutboundHttpClient {
	/**
	 * Returns a drop-in replacement for the global `fetch`, suitable for AI
	 * SDKs that accept a `customFetch` option (e.g. Anthropic SDK, OpenAI SDK).
	 *
	 * SSRF protection is enforced at the dispatcher layer (the same dispatcher
	 * returned by `getDispatcher()`), so the target URL is validated before
	 * every request is dispatched — not only the initial URL, but each hop of an
	 * HTTP redirect chain, since `fetch` re-dispatches per hop through that
	 * dispatcher. This closes redirect-based SSRF bypasses. Proxy routing is
	 * applied via the same dispatcher.
	 */
	asCustomFetch(): CustomFetch;

	/**
	 * Returns an undici `Dispatcher` configured with this client's proxy settings.
	 * Pass this to SDKs that accept a dispatcher directly (e.g. via `fetchOptions.dispatcher`).
	 *
	 * SSRF validation is applied at the dispatcher layer: every dispatched
	 * request is validated, including each hop of a redirect chain, since the
	 * consuming SDK re-dispatches per hop through this dispatcher.
	 * A rejected request surfaces wrapped by undici (`TypeError: fetch failed`, with the
	 * original SSRF error in `.cause`).
	 */
	getDispatcher(): Dispatcher;

	/**
	 * Returns a `{ httpAgent, httpsAgent }` pair for AWS SDK v3 and similar
	 * libraries that accept explicit Node.js agent options.
	 *
	 * Pass `agentOptions` to forward per-call TLS / agent settings (e.g.
	 * `servername`, `rejectUnauthorized`, `ca`). Calls without `agentOptions`
	 * return cached agent instances; calls with `agentOptions` build fresh ones.
	 *
	 * When SSRF protection is active, a secure DNS lookup is injected only for
	 * **direct** connections (no proxy). Behind a proxy the lookup would resolve
	 * the proxy host rather than the final target, so it is omitted there and the
	 * proxy is responsible for validating the final target.
	 * (see CAT-2554 for future developments about that)
	 */
	getNodeAgent(agentOptions?: NodeAgentOptions): { httpAgent: http.Agent; httpsAgent: https.Agent };
}

/** A client's resolved proxy + SSRF policy (after factory defaults are applied). */
interface ResolvedClientConfig {
	proxy: ProxyOption;
	ssrf: SsrfOption;
}

/**
 * Factory for outbound HTTP clients.
 *
 * Injectable via `@n8n/di`. This step is additive. No existing callsite
 * migrates yet. Registering the factory in the container is enough to start
 * wiring new code against it.
 */
@Service()
export class OutboundHttpFactory {
	constructor(private readonly ssrfProtection: SsrfProtectionService) {}

	/**
	 * Creates an outbound HTTP client.
	 *
	 * Defaults: `proxy: 'env'`, `ssrf` enabled.
	 * Pass `{ ssrf: 'disabled' }` to opt out.
	 */
	create(options?: OutboundHttpClientOptions): OutboundHttpClient {
		return this.buildClient({
			proxy: options?.proxy ?? 'env',
			ssrf: options?.ssrf ?? this.ssrfProtection,
		});
	}

	private buildClient(config: ResolvedClientConfig): OutboundHttpClient {
		// Built lazily: a client used only for node agents (e.g. AWS SDK v3) never needs a dispatcher, etc.
		const lazyDispatcher = lazy(() => buildDispatcher(config));
		const lazyNodeAgents = lazy(() => buildNodeAgents(config.proxy, config.ssrf));

		return {
			asCustomFetch: () => async (input, init) =>
				await dispatchedFetch(lazyDispatcher(), input, init),
			getDispatcher: () => lazyDispatcher(),
			getNodeAgent: (agentOptions) =>
				agentOptions !== undefined
					? buildNodeAgents(config.proxy, config.ssrf, agentOptions)
					: lazyNodeAgents(),
		};
	}
}

function lazy<T>(factory: () => T): () => T {
	let cached: { value: T } | undefined;
	return () => (cached ??= { value: factory() }).value;
}

function buildDispatcher(config: ResolvedClientConfig): Dispatcher {
	const dispatcher = buildDispatcherFromProxy(config.proxy);
	return config.ssrf === 'disabled'
		? dispatcher
		: dispatcher.compose(createSsrfInterceptor(config.ssrf));
}

function buildDispatcherFromProxy(proxy: ProxyOption): Dispatcher {
	if (proxy === false) {
		return new Agent();
	}
	if (proxy === 'env') {
		return new EnvHttpProxyAgent();
	}
	return new ProxyAgent(proxy);
}

/**
 * undici `compose` interceptor that runs SSRF validation against the target URL
 * of every dispatched request.
 *
 * `fetch` re-dispatches through this dispatcher for each redirect hop, so this
 * validates the initial request **and** every redirect target (both hostname
 * and direct-IP targets), unlike a connect-time DNS lookup which never fires for
 * IP-literal targets. Validation runs against the request target, never the
 * proxy, so it is proxy-agnostic.
 */
export function createSsrfInterceptor(bridge: SsrfBridge): Dispatcher.DispatcherComposeInterceptor {
	return (dispatch) => (opts, handler) => {
		let targetUrl: string;
		try {
			// `opts.path` is the request target. Behind a forward proxy it can be an
			// absolute URI, otherwise it is path-only and resolved against the
			// origin. Either form yields the final target URL.
			targetUrl = new URL(opts.path, opts.origin?.toString()).href;
		} catch (error: unknown) {
			// Fail closed: if we cannot derive a target URL we cannot validate it
			failDispatch(handler, ensureError(error));
			return true;
		}

		bridge.validateUrl(targetUrl).then(
			(result) => {
				if (result.ok) {
					dispatch(opts, handler);
				} else {
					failDispatch(handler, result.error);
				}
			},
			(error: unknown) => failDispatch(handler, ensureError(error)),
		);

		return true;
	};
}

/**
 * Declared locally so it does not depend on undici's namespaced `DispatchHandler` / `DispatchController` types,
 * whose resolution varies across undici versions in the tree)
 */
interface FailableDispatchHandler {
	onResponseError?(controller: unknown, error: Error): void;
	onError?(error: Error): void;
}

/**
 * Signals a pre-dispatch failure to an undici dispatch handler.
 * Mirrors undici's own interceptors (e.g. the DNS interceptor),
 * which pass a `null` controller when erroring before a request reaches the socket.
 */
function failDispatch(handler: FailableDispatchHandler, error: Error): void {
	if (handler.onResponseError) {
		handler.onResponseError(null, error);
	} else {
		handler.onError?.(error);
	}
}

async function dispatchedFetch(
	dispatcher: Dispatcher,
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	return (await undiciFetch(
		input as Parameters<typeof undiciFetch>[0],
		{ ...(init ?? {}), dispatcher } as Parameters<typeof undiciFetch>[1],
	)) as unknown as Response;
}
