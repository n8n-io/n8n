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
 * Builds the undici dispatcher for a given proxy + SSRF policy — the transport
 * plumbing behind `OutboundHttp.transport()`. When SSRF is active the dispatcher
 * is composed with {@link createSsrfInterceptor} so every dispatched request,
 * including each redirect hop, is validated.
 */
export function buildDispatcher(proxy: ProxyOption, ssrf: SsrfOption): Dispatcher {
	const dispatcher = buildDispatcherFromProxy(proxy);
	return ssrf === 'disabled' ? dispatcher : dispatcher.compose(createSsrfInterceptor(ssrf));
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
