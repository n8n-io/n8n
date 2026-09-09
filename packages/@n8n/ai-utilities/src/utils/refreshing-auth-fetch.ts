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

function applyInit(base: RequestInit, init: RequestInit | undefined): RequestInit {
	const merged: RequestInit = { ...base };
	if (init) {
		Object.assign(
			merged,
			Object.fromEntries(Object.entries(init).filter(([, value]) => value !== undefined)),
		);
	}
	return merged;
}

// The redirect loop takes a URL, so a `Request` is unwrapped into `init`,
// which still wins per spec. The body is buffered so a retry can replay it.
async function normalizeInput(
	input: RequestInfo | URL,
	init: RequestInit | undefined,
): Promise<{ url: string | URL; init: RequestInit | undefined }> {
	if (!(input instanceof Request)) return { url: input, init };

	const merged = applyInit(initFromRequest(input), init);
	if (merged.body === undefined && input.body) {
		merged.body = await input.arrayBuffer();
	}
	return { url: input.url, init: merged };
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

interface AuthState {
	readonly headers: Headers;
	readonly version: number;
	refresh: () => Promise<boolean>;
}

function createAuthState(
	initialHeaders: HeadersInit | undefined,
	refreshHeaders: RefreshingAuthFetchOptions['refreshHeaders'],
): AuthState {
	// Owned by `refresh`, shared so concurrent requests reuse one grant
	let headers = new Headers(initialHeaders);
	let version = 0;
	let inFlight: Promise<boolean> | undefined;

	return {
		get headers() {
			return headers;
		},
		get version() {
			return version;
		},
		refresh: async () => {
			inFlight ??= (async () => {
				const refreshed = await refreshHeaders?.(new Headers(headers));
				if (!refreshed) return false;
				headers = new Headers(refreshed);
				version += 1;
				return true;
			})();
			try {
				return await inFlight;
			} finally {
				inFlight = undefined;
			}
		},
	};
}

interface RequestAuth {
	resolved: Headers | undefined;
	retried: boolean;
	sendAuth: boolean;
}

function createRetryingCall(deps: {
	baseFetch: typeof fetch;
	refreshHeaders: RefreshingAuthFetchOptions['refreshHeaders'];
	shouldRefresh: RefreshingAuthFetchOptions['shouldRefresh'];
	auth: AuthState;
	expiredStatuses: number[];
	state: RequestAuth;
}): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
	const { baseFetch, refreshHeaders, shouldRefresh, auth, expiredStatuses, state } = deps;

	return async (requestInput, requestInit) => {
		if (state.sendAuth && refreshHeaders && shouldRefresh?.()) {
			// Or a caller using both hooks would discard the refresh it just asked for
			if (await auth.refresh()) state.resolved = auth.headers;
		}

		const seenVersion = auth.version;
		// The redirect loop only ever passes a URL; a `Request` is normalized below
		const execute = async () =>
			await baseFetch(requestInput, {
				...requestInit,
				headers: state.sendAuth
					? mergeHeaders(requestInit?.headers, state.resolved ?? auth.headers)
					: requestInit?.headers,
			});

		const response = await execute();
		if (!expiredStatuses.includes(response.status)) return response;
		if (!refreshHeaders || state.retried || !state.sendAuth) return response;

		state.retried = true;
		let canRetry: boolean;
		try {
			canRetry = auth.version !== seenVersion || (await auth.refresh());
		} catch (error) {
			// Nobody owns this body once the throw leaves here
			await response.body?.cancel().catch(() => {});
			throw error;
		}
		if (!canRetry) return response;

		// Adopt what the refresh produced, including a concurrent one
		state.resolved = auth.headers;
		await response.body?.cancel().catch(() => {});
		return await execute();
	};
}

export function createRefreshingAuthFetch(options: RefreshingAuthFetchOptions): typeof fetch {
	const { initialHeaders, resolveHeaders, refreshHeaders, shouldRefresh, assertAllowedUrl } =
		options;
	const expiredStatuses = toExpiredStatuses(options.expiredStatus ?? DEFAULT_EXPIRED_STATUS);
	const auth = createAuthState(initialHeaders, refreshHeaders);

	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const state: RequestAuth = {
			// Undefined unless the caller resolves per request, so everyone else keeps
			// reading the shared slot live and picks up a sibling's refresh
			resolved: resolveHeaders ? new Headers(await resolveHeaders()) : undefined,
			retried: false,
			// Auth headers follow redirects within the starting origin, but per fetch
			// spec are withheld once a hop crosses origins, even to an allowed host
			sendAuth: true,
		};
		const call = createRetryingCall({
			baseFetch: options.baseFetch,
			refreshHeaders,
			shouldRefresh,
			auth,
			expiredStatuses,
			state,
		});

		const request = await normalizeInput(input, init);
		const startUrl = request.url instanceof URL ? request.url.href : request.url;

		// Only `follow` gets the hop loop; other modes have to see the redirect
		// themselves, and a hop never followed has no headers to strip.
		if ((request.init?.redirect ?? 'follow') !== 'follow') {
			await assertAllowedUrl?.(startUrl);
			return await call(request.url, request.init);
		}

		// Following redirects here rather than letting the platform do it is what
		// withholds the auth headers once a hop crosses origins. `assertAllowedUrl`
		// is an extra per-hop check, not the thing that turns that protection on.
		return await fetchFollowingRedirects(call, request.url, request.init, {
			onBeforeHop: async (hopUrl, { crossedOrigin }) => {
				state.sendAuth = !crossedOrigin;
				await assertAllowedUrl?.(hopUrl);
			},
		});
	};
}
