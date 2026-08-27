import { fetchFollowingRedirects } from './follow-redirects';

export interface RefreshingAuthFetchOptions {
	baseFetch: typeof fetch;
	initialHeaders?: HeadersInit;
	refreshHeaders?: (current: Headers) => Promise<HeadersInit | null>;
	assertAllowedUrl?: (url: string) => void | Promise<void>;
}

function mergeHeaders(requestHeaders: HeadersInit | undefined, authHeaders: Headers): Headers {
	const merged = new Headers(requestHeaders);
	authHeaders.forEach((value, name) => merged.set(name, value));
	return merged;
}

function getInputHeaders(input: RequestInfo | URL, init?: RequestInit): HeadersInit | undefined {
	return init?.headers ?? (input instanceof Request ? input.headers : undefined);
}

export function createRefreshingAuthFetch({
	baseFetch,
	initialHeaders,
	refreshHeaders,
	assertAllowedUrl,
}: RefreshingAuthFetchOptions): typeof fetch {
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
		let retried = false;
		const authedFetch = async (
			requestInput: RequestInfo | URL,
			requestInit?: RequestInit,
		): Promise<Response> => {
			const requestAuthVersion = authVersion;
			const execute = async () =>
				await baseFetch(requestInput instanceof Request ? requestInput.clone() : requestInput, {
					...requestInit,
					// Include auth headers for redirect requests too
					headers: mergeHeaders(getInputHeaders(requestInput, requestInit), authHeaders),
				});

			const response = await execute();
			if (response.status !== 401 || !refreshHeaders || retried) return response;

			retried = true;
			const canRetry = authVersion !== requestAuthVersion || (await refresh());
			if (!canRetry) return response;

			await response.body?.cancel().catch(() => {});
			return await execute();
		};

		if (!assertAllowedUrl) return await authedFetch(input, init);

		// `fetchFollowingRedirects` accepts `string | URL`. `Request` objects are
		// unwrapped to their URL so the redirect loop can carry a stable input.
		const startUrl = input instanceof Request ? input.url : input;
		return await fetchFollowingRedirects(authedFetch, startUrl, init, {
			onBeforeHop: assertAllowedUrl,
		});
	};
}
