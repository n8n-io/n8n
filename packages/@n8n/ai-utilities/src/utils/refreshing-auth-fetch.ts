import { fetchFollowingRedirects } from './follow-redirects';

export interface RefreshingAuthFetchOptions {
	baseFetch: typeof fetch;
	initialHeaders?: HeadersInit;
	initialQuery?: Readonly<Record<string, string>>;
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

function mergeQuery(
	input: RequestInfo | URL,
	query: Readonly<Record<string, string>>,
): RequestInfo | URL {
	if (Object.keys(query).length === 0) return input;
	const inputUrl = input instanceof Request ? input.url : input;
	const url = new URL(inputUrl);
	for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
	return input instanceof Request ? new Request(url, input) : url;
}

export function createRefreshingAuthFetch({
	baseFetch,
	initialHeaders,
	initialQuery = {},
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
			const inputWithQuery = mergeQuery(requestInput, initialQuery);
			const requestAuthVersion = authVersion;
			const execute = async () =>
				await baseFetch(inputWithQuery instanceof Request ? inputWithQuery.clone() : inputWithQuery, {
					...requestInit,
					// Include auth headers for redirect requests too
					headers: mergeHeaders(getInputHeaders(inputWithQuery, requestInit), authHeaders),
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
