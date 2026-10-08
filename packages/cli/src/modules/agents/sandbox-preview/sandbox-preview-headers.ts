import { getHtmlSandboxCSP } from 'n8n-core';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';

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
 * n8n session, `Authorization`, `Expect`, and identity headers that a reverse
 * proxy in front of n8n adds. `if-none-match` and `if-modified-since` are left
 * out because the sandbox service refuses every 3xx from its runner, so a 304
 * would fail. The forwarder sets `host` and `connection` for the hop from n8n
 * to the service.
 */
const FORWARDED_REQUEST_HEADERS: ReadonlySet<string> = new Set([
	...PAGE_REQUEST_HEADERS,
	'accept-encoding',
	'content-encoding',
	'content-length',
	'origin',
	'sec-fetch-dest',
	'sec-fetch-mode',
	'sec-fetch-site',
	'sec-fetch-user',
	'transfer-encoding',
	'user-agent',
]);

/** A new object with only the request headers that may reach the app. */
export function forwardedRequestHeaders(headers: IncomingHttpHeaders): OutgoingHttpHeaders {
	const forwarded: OutgoingHttpHeaders = {};
	for (const [name, value] of Object.entries(headers)) {
		const key = name.toLowerCase();
		if (value !== undefined && FORWARDED_REQUEST_HEADERS.has(key)) forwarded[key] = value;
	}
	return forwarded;
}

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
 * `authorization`, so the challenge headers go too. The hop-by-hop headers
 * (`connection`, `keep-alive`, `transfer-encoding`, ...) describe the
 * connection from n8n to the service, not the one from the browser to n8n.
 */
const DROPPED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
	'access-control-allow-credentials',
	'alt-svc',
	'clear-site-data',
	'connection',
	'content-security-policy-report-only',
	'keep-alive',
	'nel',
	'proxy-authenticate',
	'proxy-connection',
	'report-to',
	'reporting-endpoints',
	'service-worker-allowed',
	'set-cookie',
	'strict-transport-security',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'www-authenticate',
	'x-frame-options',
]);

/** The headers of the app's answer that the browser gets, with the preview headers in place. */
export function hardenedResponseHeaders(upstream: IncomingHttpHeaders): OutgoingHttpHeaders {
	const headers: OutgoingHttpHeaders = {};
	for (const [name, value] of Object.entries(upstream)) {
		const key = name.toLowerCase();
		if (value !== undefined && !DROPPED_RESPONSE_HEADERS.has(key)) headers[key] = value;
	}
	return Object.assign(headers, previewAnswerHeaders());
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
