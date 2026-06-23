import { ensureError } from 'n8n-workflow';
import type { Dispatcher } from 'undici';
import { Agent, EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch } from 'undici';

import type { SsrfBridge } from '../../ssrf';
import type { ProxyOption, SsrfOption } from '../node-agents';

/**
 * Drop-in replacement type for the global `fetch`.
 */
export type CustomFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Per-request authorization gate run against the target of every dispatched request
 * (the initial request and every redirect hop).
 *
 * Resolve to allow the request throug.
 * **throw to block it** (the rejection surfaces as the fetch error).
 *
 * The mechanism lives here. The policy (what to authorize) is the caller's.
 *
 * Used e.g. for human-in-the-loop domain gating where each redirect
 * target must be approved before it is fetched.
 */
export type RequestAuthorizer = (url: URL) => Promise<void>;

/**
 * Undici agent timeout overrides for a transport, in milliseconds.
 *
 * undici defaults `headersTimeout` / `bodyTimeout` to 5 minutes, which is too
 * short for long-running outbound calls (e.g. LLM completions).
 * Callers pass their own values here (the value itself, e.g. aligned to the execution
 * timeout, is owned by the caller, not this transport core).
 *
 * Kept as plain data so the pure transport core (`@n8n/backend-network/transport`)
 * carries no config or DI dependency.
 */
export interface TransportTimeoutOptions {
	headersTimeout?: number;
	bodyTimeout?: number;
	connectTimeout?: number;
}

/** Options for {@link createDispatcherTransport}. */
export interface CreateDispatcherTransportOptions {
	/** Proxy routing. Defaults to `'env'` (HTTP(S)_PROXY / NO_PROXY). */
	proxy?: ProxyOption;
	/** SSRF policy. Defaults to `'disabled'`. */
	ssrf?: SsrfOption;
	/** Undici agent timeout overrides. */
	timeouts?: TransportTimeoutOptions;
	/** When set, it runs on every dispatched request (including each redirect hop) after the SSRF check */
	authorize?: RequestAuthorizer;
}

/**
 * The dispatcher/fetch half of an `HttpTransport`: it hands out a pure undici
 * `Dispatcher` (and a `fetch` bound to it), with no Node `http.Agent` construction.
 * This is the part of the transport that has no DI dependency,
 * so DI-less callers (e.g. task-runner code) can build it via the `@n8n/backend-network/transport` subpath.
 */
export interface DispatcherTransport {
	asCustomFetch(): CustomFetch;
	getDispatcher(): Dispatcher;
}

/** Optional knobs for {@link buildDispatcher}, beyond the required proxy + SSRF policy. */
export interface BuildDispatcherOptions {
	/** Undici agent timeout overrides. */
	timeouts?: TransportTimeoutOptions;
	/** When set, it runs on every dispatched request (including each redirect hop) after the SSRF check. */
	authorize?: RequestAuthorizer;
}

/**
 * Builds the undici dispatcher for a given proxy + SSRF policy,
 * The transport plumbing behind `OutboundHttp.transport()`.
 * When SSRF is active the dispatcher is composed with {@link createSsrfInterceptor},
 * so every dispatched request, including each redirect hop, is validated.
 *
 * When an {@link RequestAuthorizer} is given it is composed too, gating every dispatched target the same way.
 *
 * Compose order matters:
 * - the SSRF interceptor runs **first**
 * - a target that fails the SSRF policy is hard-rejected
 */
export function buildDispatcher(
	proxy: ProxyOption,
	ssrf: SsrfOption,
	options: BuildDispatcherOptions = {},
): Dispatcher {
	let dispatcher = buildDispatcherFromProxy(proxy, ssrf, options?.timeouts);
	if (options?.authorize) {
		dispatcher = dispatcher.compose(createAuthorizationInterceptor(options?.authorize));
	}
	if (ssrf !== 'disabled') {
		dispatcher = dispatcher.compose(createSsrfInterceptor(ssrf));
	}
	return dispatcher;
}

function buildDispatcherFromProxy(
	proxy: ProxyOption,
	ssrf: SsrfOption,
	timeouts?: TransportTimeoutOptions,
): Dispatcher {
	const agentOptions = toAgentTimeoutOptions(timeouts);
	if (proxy === false) {
		return new Agent({ ...agentOptions, ...secureConnect(ssrf) });
	}
	if (proxy === 'env') {
		return new EnvHttpProxyAgent({ ...agentOptions, ...secureConnect(ssrf) });
	}
	// Explicit proxy URL: no direct path, so no connect-time lookup is injected —
	// the proxy resolves the target. Mirrors `buildNodeAgents`.
	return new ProxyAgent({ uri: proxy, ...agentOptions });
}

/**
 * A connect-time secure DNS lookup for direct connections.
 * It pins the validated IP to the socket, so a hostname that passed the interceptor's pre-flight
 * `validateUrl` cannot be rebound to a private IP before undici resolves it again at connect time (DNS-rebinding / TOCTOU).
 */
function secureConnect(ssrf: SsrfOption) {
	return ssrf === 'disabled' ? {} : { connect: { lookup: ssrf.createSecureLookup() } };
}

/**
 * Maps {@link TransportTimeoutOptions} onto the undici agent option subset,
 * omitting unset keys so undici keeps its own default for each one.
 */
function toAgentTimeoutOptions(timeouts?: TransportTimeoutOptions): TransportTimeoutOptions {
	if (!timeouts) {
		return {};
	}
	return {
		...(timeouts.headersTimeout !== undefined && { headersTimeout: timeouts.headersTimeout }),
		...(timeouts.bodyTimeout !== undefined && { bodyTimeout: timeouts.bodyTimeout }),
		...(timeouts.connectTimeout !== undefined && { connectTimeout: timeouts.connectTimeout }),
	};
}

/**
 * Builds a {@link DispatcherTransport} from plain options, the DI-free core
 * shared by `OutboundHttp.transport()` and the `@n8n/backend-network/transport`
 * subpath. A single dispatcher instance is built lazily and shared by
 * `getDispatcher()` and `asCustomFetch()` so they use one connection pool.
 */
export function createDispatcherTransport(
	options?: CreateDispatcherTransportOptions,
): DispatcherTransport {
	const proxy = options?.proxy ?? 'env';
	const ssrf = options?.ssrf ?? 'disabled';
	const timeouts = options?.timeouts;
	const authorize = options?.authorize;

	const lazyDispatcher = lazyValue(() => buildDispatcher(proxy, ssrf, { timeouts, authorize }));

	return {
		asCustomFetch: () => async (input, init) =>
			await dispatchedFetch(lazyDispatcher(), input, init),
		getDispatcher: () => lazyDispatcher(),
	};
}

function lazyValue<T>(factory: () => T): () => T {
	let cached: { value: T } | undefined;
	return () => (cached ??= { value: factory() }).value;
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
		let targetUrl: URL;
		try {
			// `opts.path` is the request target.
			// Behind a forward proxy it can be an absolute URI, otherwise it is path-only and resolved against the origin.
			// Either form yields the final target URL.
			targetUrl = new URL(opts.path, opts.origin?.toString());
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
		} catch (error: unknown) {
			// Fail closed: if we cannot derive a target URL we cannot validate it
			failDispatch(handler, ensureError(error));
		}

		return true;
	};
}

/**
 * undici `compose` interceptor that runs a {@link RequestAuthorizer} against the target URL of every dispatched request.
 *
 * Like {@link createSsrfInterceptor}, it benefits from `fetch` re-dispatching per redirect hop:
 * - the authorizer runs on the initial request
 * - **and** every redirect target before that hop is fetched.
 *
 * The authorizer resolves to allow the request through, or throws to block it (fail-closed).
 */
export function createAuthorizationInterceptor(
	authorize: RequestAuthorizer,
): Dispatcher.DispatcherComposeInterceptor {
	return (dispatch) => (opts, handler) => {
		let targetUrl: URL;
		try {
			targetUrl = new URL(opts.path, opts.origin?.toString());
			authorize(targetUrl).then(
				() => dispatch(opts, handler),
				(error: unknown) => failDispatch(handler, ensureError(error)),
			);
		} catch (error: unknown) {
			failDispatch(handler, ensureError(error));
		}

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

/** Performs a `fetch` bound to the given undici dispatcher (the engine behind `asCustomFetch`). */
export async function dispatchedFetch(
	dispatcher: Dispatcher,
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	return (await undiciFetch(
		input as Parameters<typeof undiciFetch>[0],
		{ ...(init ?? {}), dispatcher } as Parameters<typeof undiciFetch>[1],
	)) as unknown as Response;
}
