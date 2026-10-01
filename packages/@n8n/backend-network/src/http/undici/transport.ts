import type { LookupFunction } from 'node:net';
import type { Dispatcher } from 'undici';
import { Agent, EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch } from 'undici';

import type { ProxyOption } from '../node-agents';

/**
 * Drop-in replacement type for the global `fetch`.
 */
export type CustomFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Structural SSRF policy for the dispatcher path: the subset of `SsrfBridge`
 * this transport core consumes. Kept structural (and dependency-free) so
 * DI-less callers can satisfy it with their own policy object.
 */
export interface TransportSsrfPolicy {
	/** Pre-flight validation of a dispatched target (the initial request and every redirect hop). */
	validateUrl(url: string | URL): Promise<{ ok: true } | { ok: false; error: Error }>;
	/** Validation of a connection host no DNS lookup will see (e.g. an IP-literal proxy host). */
	validateConnectionHost(host: string): { ok: true } | { ok: false; error: Error };
	/** DNS lookup drop-in that pins the validated address to the socket at connect time. */
	createSecureLookup(): LookupFunction;
}

/**
 * Resolved SSRF policy for the dispatcher path: the policy to enforce, or
 * `'disabled'` when none applies (instance protection off, no egress filter in
 * the calling context, or an `'unsafe'` opt-out already resolved upstream).
 * Intent is expressed at the client layer (`UseDefaultSsrfPolicy`), not here.
 */
export type TransportSsrfOption = TransportSsrfPolicy | 'disabled';

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
	ssrf?: TransportSsrfOption;
	/** Undici agent timeout overrides. */
	timeouts?: TransportTimeoutOptions;
	/** When set, it runs on every dispatched request (including each redirect hop) after the SSRF check */
	authorize?: RequestAuthorizer;
	/** When set, `asCustomFetch()` bounds each response body to this decoded-byte limit. */
	responseSizeLimit?: ResponseSizeLimit;
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
	ssrf: TransportSsrfOption,
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
	ssrf: TransportSsrfOption,
	timeouts?: TransportTimeoutOptions,
): Dispatcher {
	const agentOptions = toAgentTimeoutOptions(timeouts);
	if (proxy === false) {
		return new Agent({ ...agentOptions, ...secureConnect(ssrf) });
	}
	if (proxy === 'env') {
		// The environment's proxies are part of the deployment, not of a request,
		// so the policy does not decide them (see `buildNodeAgents`).
		return new EnvHttpProxyAgent({ ...agentOptions, ...secureConnect(ssrf) });
	}
	assertProxyHostAllowed(ssrf, proxy);
	return new ProxyAgent({
		uri: proxy,
		...agentOptions,
		...secureProxyConnect(ssrf),
	});
}

/**
 * A connect-time secure DNS lookup for the socket opened to a proxy.
 *
 * undici builds the connector for the proxy socket from `proxyTls`.
 * A caller's `connect` does not reach it: `ProxyAgent` overwrites that with its own
 * tunnel handshake.
 */
function secureProxyConnect(ssrf: TransportSsrfOption) {
	return ssrf === 'disabled' ? {} : { proxyTls: { lookup: ssrf.createSecureLookup() } };
}

/**
 * Catches an IP-literal proxy host, which no lookup sees.
 * Applies to an explicit proxy URI, the one form that can come from a request.
 */
function assertProxyHostAllowed(ssrf: TransportSsrfOption, proxyUri: string): void {
	if (ssrf === 'disabled') {
		return;
	}
	const hostname = proxyHostname(proxyUri);
	if (hostname === undefined) {
		return;
	}
	const result = ssrf.validateConnectionHost(hostname);
	if (!result.ok) {
		throw result.error;
	}
}

function proxyHostname(uri: string): string | undefined {
	try {
		return new URL(uri).hostname;
	} catch {
		return undefined;
	}
}

/**
 * A connect-time secure DNS lookup for direct connections.
 * It pins the validated IP to the socket, so a hostname that passed the interceptor's pre-flight
 * `validateUrl` cannot be rebound to a private IP before undici resolves it again at connect time (DNS-rebinding / TOCTOU).
 */
function secureConnect(ssrf: TransportSsrfOption) {
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
	const responseSizeLimit = options?.responseSizeLimit;

	const lazyDispatcher = lazyValue(() => buildDispatcher(proxy, ssrf, { timeouts, authorize }));

	return {
		// `getDispatcher()` returns a bare dispatcher, which sees only wire bytes;
		// the response-size limit is a decoded-body concern, so it is applied here
		// on the fetch path where the body is already decompressed.
		asCustomFetch: () => async (input, init) =>
			await dispatchedFetch(lazyDispatcher(), input, init, responseSizeLimit),
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
 * IP-literal targets.
 *
 * This interceptor does not validate a proxy's own host.
 * That host is fixed for the dispatcher rather than per request, so
 * {@link buildDispatcherFromProxy} decides it where the dispatcher is built.
 */
export function createSsrfInterceptor(
	bridge: Pick<TransportSsrfPolicy, 'validateUrl'>,
): Dispatcher.DispatcherComposeInterceptor {
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
 * Coerces an unknown throw into an `Error`. Kept local so the pure transport core
 * (`@n8n/backend-network/transport`) has no runtime dependency beyond `undici`.
 */
function ensureError(error: unknown): Error {
	return error instanceof Error
		? error
		: new Error('Error that was not an instance of Error was thrown', { cause: error });
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

/**
 * Response-size limit for {@link dispatchedFetch} and {@link limitResponseBody}.
 * `maxBytes <= 0` disables the limit.
 *
 * The count is of *decoded* bytes: `fetch` reverses any `Content-Encoding`
 * before the body reaches this stream, so a compressed payload cannot expand
 * past the cap. `createError` lets a caller supply its own error type (n8n's
 * `OperationalError`, say) without this pure subpath importing `n8n-workflow`.
 */
export interface ResponseSizeLimit {
	maxBytes: number;
	createError?: (maxBytes: number) => Error;
}

function defaultResponseSizeError(maxBytes: number): Error {
	return new Error(`Response body exceeded the maximum allowed size of ${maxBytes} bytes`);
}

/**
 * A `TransformStream` that throws once the decoded bytes pass `maxBytes`. This
 * rejects the whole response; it does not truncate the body to `maxBytes`. Its
 * own function so it can be unit-tested without a live response.
 */
export function createResponseSizeLimit({
	maxBytes,
	createError = defaultResponseSizeError,
}: ResponseSizeLimit): TransformStream<Uint8Array, Uint8Array> {
	let received = 0;
	return new TransformStream({
		transform(chunk, controller) {
			received += chunk.byteLength;
			if (received > maxBytes) throw createError(maxBytes);
			controller.enqueue(chunk);
		},
	});
}

/**
 * Wraps a fetch `Response` so that reading its body throws once the decoded
 * size passes `limit.maxBytes`. The response is rejected in full, not truncated
 * to the cap. Returns the response unchanged when the limit is disabled
 * (`maxBytes <= 0`) or the body is empty.
 */
export function limitResponseBody(response: Response, limit: ResponseSizeLimit): Response {
	if (limit.maxBytes <= 0 || !response.body) return response;
	const body = response.body.pipeThrough(createResponseSizeLimit(limit));
	// `new Response(body, response)` drops these read-only fields; restore them.
	return Object.defineProperties(new Response(body, response), {
		url: { value: response.url },
		redirected: { value: response.redirected },
		type: { value: response.type },
	});
}

/**
 * Performs a `fetch` bound to the given undici dispatcher (the engine behind `asCustomFetch`).
 * Without a dispatcher it falls through to this undici's default dispatcher.
 *
 * Pass `responseSizeLimit` to reject a response whose decoded body passes the
 * cap: reading the body then throws, rather than the body being truncated. It
 * is opt-in; without it the response streams unchanged.
 */
export async function dispatchedFetch(
	dispatcher: Dispatcher | undefined,
	input: RequestInfo | URL,
	init?: RequestInit,
	responseSizeLimit?: ResponseSizeLimit,
): Promise<Response> {
	const response = (await undiciFetch(
		input as Parameters<typeof undiciFetch>[0],
		{ ...(init ?? {}), dispatcher } as Parameters<typeof undiciFetch>[1],
	)) as unknown as Response;
	return responseSizeLimit ? limitResponseBody(response, responseSizeLimit) : response;
}
