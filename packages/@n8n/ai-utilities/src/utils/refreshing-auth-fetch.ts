import { fetchFollowingRedirects } from './follow-redirects';

export interface RefreshingAuthFetchOptions {
	baseFetch: typeof fetch;
	initialHeaders?: HeadersInit;
	resolveHeaders?: () => Promise<HeadersInit>;
	refreshHeaders?: (current: Headers) => Promise<HeadersInit | null>;
	shouldRefresh?: () => boolean;
	assertAllowedUrl?: (url: string) => void | Promise<void>;
	expiredStatus?: number | number[];
}

/**
 * A `Request` cannot be spread or passed as an init - its attributes are
 * prototype getters - so the shared fields are listed, and `satisfies` fails the
 * build if the two types ever gain another. `body` is buffered separately.
 */
type CarriedRequestField = Exclude<keyof RequestInit & keyof Request, 'body'>;

function initFromRequest(request: Request): RequestInit {
	return {
		method: request.method,
		headers: request.headers,
		mode: request.mode,
		credentials: request.credentials,
		cache: request.cache,
		redirect: request.redirect,
		referrer: request.referrer,
		referrerPolicy: request.referrerPolicy,
		integrity: request.integrity,
		keepalive: request.keepalive,
		signal: request.signal,
	} satisfies Record<CarriedRequestField, unknown>;
}

function mergeHeaders(requestHeaders: HeadersInit | undefined, authHeaders: Headers): Headers {
	const merged = new Headers(requestHeaders);
	authHeaders.forEach((value, name) => merged.set(name, value));
	return merged;
}

const DEFAULT_EXPIRED_STATUS = 401;

/** Non-4xx would replay a request that already succeeded, and this value comes from a credential field. */
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
	// Owned by `refresh`, shared so concurrent requests reuse one grant
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
		// Undefined unless the caller resolves per request, so everyone else keeps
		// reading the shared slot live and picks up a sibling's refresh
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
				// Or a caller using both hooks would discard the refresh it just asked for
				if (await refresh()) resolved = authHeaders;
			}

			const requestAuthVersion = authVersion;
			// The redirect loop only ever passes a URL; a `Request` is normalized below
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

			// Adopt what the refresh produced, including a concurrent one
			resolved = authHeaders;
			await response.body?.cancel().catch(() => {});
			return await execute();
		};

		// The redirect loop takes a URL, so a `Request` is unwrapped into `init`,
		// which still wins per spec. The body is buffered so a retry can replay it.
		const startUrl = input instanceof Request ? input.url : input;
		let redirectInit = init;
		if (input instanceof Request) {
			redirectInit = { ...initFromRequest(input), ...init };
			if (redirectInit.body === undefined && input.body) {
				redirectInit.body = await input.arrayBuffer();
			}
		}

		// Only `follow` gets the hop loop; other modes have to see the redirect
		// themselves, and a hop never followed has no headers to strip.
		const startUrlString = startUrl instanceof URL ? startUrl.href : startUrl;
		if ((redirectInit?.redirect ?? 'follow') !== 'follow') {
			await assertAllowedUrl?.(startUrlString);
			return await authedFetch(startUrl, redirectInit);
		}

		// Following redirects here rather than letting the platform do it is what
		// withholds the auth headers once a hop crosses origins. `assertAllowedUrl`
		// is an extra per-hop check, not the thing that turns that protection on.
		return await fetchFollowingRedirects(authedFetch, startUrl, redirectInit, {
			onBeforeHop: async (hopUrl, { crossedOrigin }) => {
				sendAuth = !crossedOrigin;
				await assertAllowedUrl?.(hopUrl);
			},
		});
	};
}
