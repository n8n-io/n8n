import { AsyncLocalStorage } from 'node:async_hooks';

export interface ScopedFetchInterceptor {
	/** Return `true` when this interceptor owns the target URL and should handle it in-process. */
	matches(url: URL): boolean;
	/** Execute the intercepted request and return a standard `Response`. */
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

const interceptorStorage = new AsyncLocalStorage<ScopedFetchInterceptor>();

/**
 * Runs `fn` with a scoped outbound HTTP interceptor bound to the current async context.
 * Any outbound request in `fn` whose target URL matches `interceptor.matches(url)` is
 * dispatched directly to `interceptor.fetch` without hitting DNS, SSRF lookup, or real sockets.
 */
export function runWithScopedHttpInterceptor<T>(
	interceptor: ScopedFetchInterceptor,
	fn: () => T,
): T {
	return interceptorStorage.run(interceptor, fn);
}

/** Returns the active scoped outbound HTTP interceptor for the current async context, if any. */
export function getScopedHttpInterceptor(): ScopedFetchInterceptor | undefined {
	return interceptorStorage.getStore();
}
