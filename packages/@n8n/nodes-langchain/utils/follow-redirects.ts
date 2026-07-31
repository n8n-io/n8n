import { ApplicationError } from 'n8n-workflow';

const DEFAULT_MAX_REDIRECTS = 20;

export interface FollowRedirectsOptions {
	/** Called before each hop; throw to reject. */
	onBeforeHop?: (url: string) => void | Promise<void>;
	maxRedirects?: number;
}

/**
 * Manual redirect handling so each hop can be validated before the request is
 * sent. 301/302/303 demote unsafe methods to GET per fetch spec.
 */
export async function fetchFollowingRedirects(
	fetcher: (input: string | URL, init?: RequestInit) => Promise<Response>,
	url: string | URL,
	init?: RequestInit,
	options?: FollowRedirectsOptions,
): Promise<Response> {
	const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
	let currentInput: string | URL = url;
	let currentInit: RequestInit = { ...init };
	let hops = 0;

	while (true) {
		const currentUrlString = currentInput instanceof URL ? currentInput.href : currentInput;
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
			throw new ApplicationError(`Too many redirects (max ${maxRedirects})`);
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
