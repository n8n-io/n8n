import { fetchFollowingRedirects } from './follow-redirects';

export interface RefreshingAuthFetchOptions {
	baseFetch: typeof fetch;
	initialHeaders?: HeadersInit;
	/**
	 * Resolved before every request, for a caller that renews on a clock rather
	 * than on a rejection. Use this when a long execution can outlive the token.
	 */
	resolveHeaders?: () => Promise<HeadersInit>;
	refreshHeaders?: (current: Headers) => Promise<HeadersInit | null>;
	shouldRefresh?: () => boolean;
	assertAllowedUrl?: (url: string) => void | Promise<void>;
	/**
	 * Status(es) that mean the token expired, defaulting to 401. Some gateways
	 * answer a different code, and one caller may need to match several.
	 */
	expiredStatus?: number | number[];
}

function mergeHeaders(requestHeaders: HeadersInit | undefined, authHeaders: Headers): Headers {
	const merged = new Headers(requestHeaders);
	authHeaders.forEach((value, name) => merged.set(name, value));
	return merged;
}

const DEFAULT_EXPIRED_STATUS = 401;

/**
 * Only a client error can mean "the token expired". A 2xx or 3xx here would make
 * a request that already succeeded get replayed, repeating its side effects, and
 * the value reaches us from a credential field. Falls back to 401 if nothing in
 * the list qualifies.
 */
function toExpiredStatuses(expiredStatus: number | number[]): number[] {
	const candidates = Array.isArray(expiredStatus) ? expiredStatus : [expiredStatus];
	const clientErrors = candidates.filter(
		(status) => Number.isInteger(status) && status >= 400 && status <= 499,
	);
	return clientErrors.length > 0 ? clientErrors : [DEFAULT_EXPIRED_STATUS];
}

export function createRefreshingAuthFetch({
	baseFetch,
	initialHeaders,
	resolveHeaders,
	refreshHeaders,
	shouldRefresh,
	assertAllowedUrl,
	expiredStatus = DEFAULT_EXPIRED_STATUS,
}: RefreshingAuthFetchOptions): typeof fetch {
	const expiredStatuses = toExpiredStatuses(expiredStatus);
	// Owned by `refresh`: the latest headers a rejection produced, shared so
	// concurrent requests can reuse one grant. Not what a request sends - see below.
	let authHeaders = new Headers(initialHeaders);
	let authVersion = 0;
	let refreshInFlight: Promise<boolean> | undefined;

	const refresh = async (): Promise<boolean> => {
		refreshInFlight ??= (async () => {
			const refreshed = await refreshHeaders?.(new Headers(authHeaders));
			if (!refreshed) return false;
			authHeaders = new Headers(refreshed);
			authVersion += 1;
			return true;
		})();
		try {
			return await refreshInFlight;
		} finally {
			refreshInFlight = undefined;
		}
	};

	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		// Resolved once per request, so a caller that resolves a different
		// credential per request keeps its own headers on the initial send. Left
		// undefined otherwise, so those callers keep reading the shared slot live
		// and pick up a refresh a sibling request already ran.
		let resolved = resolveHeaders ? new Headers(await resolveHeaders()) : undefined;

		let retried = false;
		// Auth headers follow redirects within the starting origin, but per fetch
		// spec are withheld once a hop crosses origins, even to an allowed host
		let sendAuth = true;
		const authedFetch = async (
			requestInput: RequestInfo | URL,
			requestInit?: RequestInit,
		): Promise<Response> => {
			if (sendAuth && refreshHeaders && shouldRefresh?.()) {
				// Adopt the result, or a caller using both hooks would keep sending the
				// headers it resolved and discard the refresh it just asked for
				if (await refresh()) resolved = authHeaders;
			}

			const requestAuthVersion = authVersion;
			// The redirect loop only ever hands this a URL: a `Request` input is
			// normalized into `startUrl` + `redirectInit` once, below.
			const execute = async () =>
				await baseFetch(requestInput, {
					...requestInit,
					headers: sendAuth
						? mergeHeaders(requestInit?.headers, resolved ?? authHeaders)
						: requestInit?.headers,
				});

			const response = await execute();
			if (!expiredStatuses.includes(response.status)) return response;
			if (!refreshHeaders || retried || !sendAuth) return response;

			retried = true;
			let canRetry: boolean;
			try {
				canRetry = authVersion !== requestAuthVersion || (await refresh());
			} catch (error) {
				// Nobody owns this body once the throw leaves here
				await response.body?.cancel().catch(() => {});
				throw error;
			}
			if (!canRetry) return response;

			// A refresh is instance-wide, so adopt what it produced - including one a
			// concurrent request ran
			resolved = authHeaders;
			await response.body?.cancel().catch(() => {});
			return await execute();
		};

		// `fetchFollowingRedirects` accepts `string | URL`, so a `Request` input is
		// unwrapped to its URL and the rest of it carried over in `init` - which
		// still wins, per fetch spec. The body is buffered so the retry above and
		// a 307/308 hop can both replay it.
		const startUrl = input instanceof Request ? input.url : input;
		let redirectInit = init;
		if (input instanceof Request) {
			redirectInit = { ...init };
			redirectInit.method ??= input.method;
			redirectInit.signal ??= input.signal;
			redirectInit.headers ??= input.headers;
			if (redirectInit.body === undefined && input.body) {
				redirectInit.body = await input.arrayBuffer();
			}
		}
		// Redirects are always followed here rather than by the platform, because
		// this is what withholds the injected auth headers once a hop crosses
		// origins. `assertAllowedUrl` is an extra check on each hop, not the thing
		// that turns the protection on.
		return await fetchFollowingRedirects(authedFetch, startUrl, redirectInit, {
			onBeforeHop: async (hopUrl, { crossedOrigin }) => {
				sendAuth = !crossedOrigin;
				await assertAllowedUrl?.(hopUrl);
			},
		});
	};
}
