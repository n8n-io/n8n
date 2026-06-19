import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import { mock } from 'jest-mock-extended';
import type { IHttpRequestOptions } from 'n8n-workflow';

export interface Route {
	method?: string;
	pathname: string;
	status?: number;
	body?: unknown;
	networkError?: 'ECONNREFUSED';
}

/**
 * Mirrors the `OutboundHttp` request client's status handling: it rejects on
 * non-2xx responses (with an axios-shaped error carrying `response.status`)
 * UNLESS `ignoreHttpStatusErrors` relaxes validation. `returnFullResponse` only
 * changes the resolved shape ({@link IN8nHttpFullResponse} vs the parsed body);
 * it does NOT make non-2xx responses resolve.
 */
function resolvesStatus(
	status: number,
	ignore: IHttpRequestOptions['ignoreHttpStatusErrors'],
): boolean {
	if (ignore === true) return true;
	if (typeof ignore === 'object') return !ignore.except.includes(status);
	return status >= 200 && status < 300;
}

const isAbsoluteUrl = (url: string) => /^[a-z][a-z\d+\-.]*:\/\//i.test(url);

/** axios-style join: a single slash between the base and a relative path. */
function combineUrls(baseURL: string, url: string): string {
	return isAbsoluteUrl(url) ? url : `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

/**
 * Applies a bound client's `baseURL` + default `headers` to a request, exactly
 * as `OutboundHttp.requests({ baseURL, headers })` does in production, so the
 * fake observes the same resolved URL and merged headers the real client sends.
 */
function applyClientDefaults(
	options: HttpRequestClientOptions | undefined,
	request: IHttpRequestOptions,
): IHttpRequestOptions {
	if (!options) return request;
	const resolved: IHttpRequestOptions = { ...request };
	if (options.baseURL !== undefined && request.baseURL === undefined) {
		resolved.url = combineUrls(options.baseURL, request.url);
	}
	if (options.headers !== undefined) {
		const defaults = typeof options.headers === 'function' ? options.headers() : options.headers;
		const merged: Record<string, unknown> = { ...defaults, ...request.headers };
		for (const key of Object.keys(merged)) {
			if (merged[key] === undefined) delete merged[key];
		}
		resolved.headers = merged as IHttpRequestOptions['headers'];
	}
	return resolved;
}

/**
 * Emulates the `OutboundHttp` request client over a set of routes:
 * - resolves the full response (`returnFullResponse`) or the parsed body,
 *   following the same status validation as the real client (see above).
 * - rejects (mirroring the factory's axios-shaped error with `code` /
 *   `response.status`) on a rejected status or network error.
 *
 * Matching routes are consumed in order, so a sequence of calls to the same
 * endpoint can return different responses (e.g. a 401 then a 200 on retry).
 */
function respondWith(routes: Route[]) {
	const consumed = new Set<Route>();
	// eslint-disable-next-line @typescript-eslint/require-await -- a stub matching the async request client
	return async (options: IHttpRequestOptions): Promise<unknown> => {
		const { pathname } = new URL(options.url);
		const matching = routes.filter(
			(r) => r.pathname === pathname && (r.method ?? 'GET') === (options.method ?? 'GET'),
		);
		const route = matching.find((r) => !consumed.has(r)) ?? matching[matching.length - 1];
		if (!route) {
			throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${options.url}`);
		}
		consumed.add(route);
		if (route.networkError) {
			const error = new Error('connect ECONNREFUSED') as Error & { code: string };
			error.code = route.networkError;
			throw error;
		}
		const status = route.status ?? 200;
		if (!resolvesStatus(status, options.ignoreHttpStatusErrors)) {
			const error = new Error(`Request failed with status ${status}`) as Error & {
				response: { status: number };
			};
			error.response = { status };
			throw error;
		}
		if (options.returnFullResponse) {
			return { statusCode: status, body: route.body, headers: {} };
		}
		return route.body;
	};
}

/**
 * Builds a faithful fake {@link OutboundHttp} over a set of routes. The returned
 * `httpRequest` jest.fn records the *resolved* request (bound `baseURL` applied,
 * `headers` merged), so assertions see exactly what the real client would send.
 */
export function createFakeOutboundHttp(routes: Route[]) {
	const stub = respondWith(routes);
	const httpRequest = jest.fn(stub);
	const requests = jest.fn((options?: HttpRequestClientOptions) =>
		mock<HttpRequestClient>({
			request: (async (request: IHttpRequestOptions) =>
				await httpRequest(applyClientDefaults(options, request))) as HttpRequestClient['request'],
		}),
	);
	const outboundHttp = mock<OutboundHttp>({ requests });
	return { outboundHttp, httpRequest, requests };
}
