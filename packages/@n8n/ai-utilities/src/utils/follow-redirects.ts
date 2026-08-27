import { OperationalError } from 'n8n-workflow';

const DEFAULT_MAX_REDIRECTS = 20;

export interface FollowRedirectsOptions {
	/** Called before each hop; throw to reject. */
	onBeforeHop?: (url: string) => void | Promise<void>;
	maxRedirects?: number;
}

function requestInitFrom(input: RequestInfo | URL, init?: RequestInit): RequestInit {
	if (!(input instanceof Request)) return { ...init };

	return {
		cache: input.cache,
		credentials: input.credentials,
		headers: input.headers,
		integrity: input.integrity,
		keepalive: input.keepalive,
		method: input.method,
		mode: input.mode,
		redirect: input.redirect,
		referrer: input.referrer,
		referrerPolicy: input.referrerPolicy,
		signal: input.signal,
		...init,
	};
}

/**
 * Manual redirect handling so each hop can be validated before the request is
 * sent. 301/302/303 demote unsafe methods to GET per fetch spec.
 */
export async function fetchFollowingRedirects(
	fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
	url: RequestInfo | URL,
	init?: RequestInit,
	options?: FollowRedirectsOptions,
): Promise<Response> {
	const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
	let currentInput: RequestInfo | URL = url;
	let currentInit = requestInitFrom(url, init);
	let hops = 0;

	while (true) {
		const currentUrlString =
			currentInput instanceof Request
				? currentInput.url
				: currentInput instanceof URL
					? currentInput.href
					: currentInput;
		if (options?.onBeforeHop) {
			await options.onBeforeHop(currentUrlString);
		}

		const response = await fetcher(currentInput, {
			...currentInit,
			redirect: 'manual',
		});

		if (response.status < 300 || response.status >= 400) {
			return response;
		}

		const location = response.headers.get('location');
		if (!location) {
			return response;
		}

		hops += 1;
		if (hops > maxRedirects) {
			throw new OperationalError(`Too many redirects (max ${maxRedirects})`);
		}

		await response.body?.cancel().catch(() => {});

		currentInput = new URL(location, currentUrlString);

		const method = (currentInit.method ?? 'GET').toUpperCase();
		const isUnsafe = method !== 'GET' && method !== 'HEAD';
		if (
			response.status === 303 ||
			((response.status === 301 || response.status === 302) && isUnsafe)
		) {
			currentInit = { ...currentInit, method: 'GET', body: undefined };
		}
	}
}
