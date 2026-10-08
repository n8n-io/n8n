import { getHtmlSandboxCSP } from 'n8n-core';
import type { IncomingHttpHeaders } from 'node:http';

/**
 * Request headers that a page can set and that the app may need. The preflight
 * answer allows exactly these, so a request with another header fails in the
 * browser with a clear CORS error instead of reaching the app without it.
 */
export const PAGE_REQUEST_HEADERS: readonly string[] = [
	'accept',
	'accept-language',
	'cache-control',
	'content-language',
	'content-type',
	'if-match',
	'if-range',
	'if-unmodified-since',
	'pragma',
	'range',
	'x-requested-with',
];

/**
 * The only request headers that reach the app. All others stay in n8n: the
 * n8n session, `Authorization`, and identity headers that a reverse proxy in
 * front of n8n adds. `if-none-match` and `if-modified-since` are left out
 * because the sandbox service refuses every 3xx from its runner, so a 304
 * would fail. The proxy sets `host` and `connection` for the hop from n8n to
 * the service.
 */
const FORWARDED_REQUEST_HEADERS: ReadonlySet<string> = new Set([
	...PAGE_REQUEST_HEADERS,
	'accept-encoding',
	'connection',
	'content-encoding',
	'content-length',
	'host',
	'origin',
	'sec-fetch-dest',
	'sec-fetch-mode',
	'sec-fetch-site',
	'sec-fetch-user',
	'transfer-encoding',
	'user-agent',
]);

/** The names in `names` that the proxy must remove before it sends the request on. */
export const droppedRequestHeaders = (names: readonly string[]): string[] =>
	names.filter((name) => !FORWARDED_REQUEST_HEADERS.has(name.toLowerCase()));

/** Every answer: the URL is the credential, and the content is untrusted. */
export const previewAnswerHeaders = (): Record<string, string> => ({
	'content-security-policy': getHtmlSandboxCSP(),
	'x-content-type-options': 'nosniff',
	// `no-transform` stops the global compression, which holds back streamed answers.
	'cache-control': 'no-store, no-transform',
	'referrer-policy': 'no-referrer',
	// The sandbox CSP gives the page an opaque origin, so its requests to its own URL are cross-origin.
	'access-control-allow-origin': 'null',
	'access-control-expose-headers': '*',
});

/**
 * Upstream headers that n8n replaces, or that act on the whole n8n origin and
 * not only on one answer. The browser shows a credential prompt for the n8n
 * origin for an authentication challenge, and the proxy never forwards
 * `authorization`, so the challenge headers go too.
 */
const DROPPED_RESPONSE_HEADERS: readonly string[] = [
	'access-control-allow-credentials',
	'alt-svc',
	'clear-site-data',
	'content-security-policy-report-only',
	'nel',
	'proxy-authenticate',
	'report-to',
	'reporting-endpoints',
	'service-worker-allowed',
	'set-cookie',
	'strict-transport-security',
	'www-authenticate',
	'x-frame-options',
];

/** Rewrites the upstream headers in place, before the proxy copies them to the answer. */
export function hardenResponseHeaders(headers: IncomingHttpHeaders): void {
	for (const name of DROPPED_RESPONSE_HEADERS) delete headers[name];
	Object.assign(headers, previewAnswerHeaders());
}

/** A CORS preflight that the page sends before a request with a body type or method that is not simple. */
export const isCorsPreflight = (method: string | undefined, headers: IncomingHttpHeaders) =>
	method === 'OPTIONS' && typeof headers['access-control-request-method'] === 'string';

/** n8n answers the preflight, because the app does not expect a page with an opaque origin. */
export const preflightAnswerHeaders = (): Record<string, string> => ({
	'access-control-allow-methods': 'GET, HEAD, POST, PUT, PATCH, DELETE',
	'access-control-allow-headers': PAGE_REQUEST_HEADERS.join(', '),
	'access-control-max-age': '600',
});
