import { OperationalError } from 'n8n-workflow';

const DEFAULT_MAX_REDIRECTS = 20;

export interface FollowRedirectsOptions {
	/**
	 * Called before each hop; throw to reject. `crossedOrigin` turns true once
	 * the chain has left its original origin and stays true — fetchers that
	 * inject their own credential headers must withhold them from then on,
	 * mirroring how this helper strips credentials it carries in `init`.
	 */
	onBeforeHop?: (url: string, info: { crossedOrigin: boolean }) => void | Promise<void>;
	maxRedirects?: number;
}

const CREDENTIAL_HEADERS = ['authorization', 'cookie', 'proxy-authorization'];

/**
 * Manual redirect handling so each hop can be validated before the request is
 * sent. Per fetch spec, 301/302/303 demote unsafe methods to GET, and
 * credential headers are stripped when a redirect crosses origins.
 */
export async function fetchFollowingRedirects(
	fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
	url: string | URL,
	init?: RequestInit,
	options?: FollowRedirectsOptions,
): Promise<Response> {
	const maxRedirects = options?.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
	let currentInput: string | URL = url;
	let currentInit: RequestInit = { ...init };
	let hops = 0;
	let crossedOrigin = false;

	while (true) {
		const currentUrlString = currentInput instanceof URL ? currentInput.href : currentInput;
		if (options?.onBeforeHop) {
			await options.onBeforeHop(currentUrlString, { crossedOrigin });
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

		if (currentInput.origin !== new URL(currentUrlString).origin) {
			crossedOrigin = true;
			const headers = new Headers(currentInit.headers);
			for (const header of CREDENTIAL_HEADERS) headers.delete(header);
			currentInit = { ...currentInit, headers };
		}

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
