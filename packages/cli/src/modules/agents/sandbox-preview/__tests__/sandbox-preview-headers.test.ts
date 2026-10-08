import fc from 'fast-check';
import { getHtmlSandboxCSP } from 'n8n-core';
import type { IncomingHttpHeaders } from 'node:http';

import {
	PAGE_REQUEST_HEADERS,
	forwardedRequestHeaders,
	hardenedResponseHeaders,
	isCorsPreflight,
	preflightAnswerHeaders,
	previewAnswerHeaders,
} from '../sandbox-preview-headers';

const FORWARDED = [
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
];

/**
 * Headers that carry n8n or reverse-proxy credentials, that would make the
 * service answer 304, or that belong to the hop from the browser to n8n.
 */
const KEPT_IN_N8N = [
	'authorization',
	'browser-id',
	'cf-access-jwt-assertion',
	'connection',
	'cookie',
	'expect',
	'forwarded',
	'host',
	'if-modified-since',
	'if-none-match',
	'keep-alive',
	'proxy-authorization',
	'referer',
	'upgrade',
	'x-amzn-oidc-data',
	'x-api-key',
	'x-auth-request-email',
	'x-forwarded-access-token',
	'x-forwarded-for',
	'x-forwarded-user',
	'x-n8n-api-key',
	'x-real-ip',
];

/** Headers that describe the connection from n8n to the service. */
const HOP_BY_HOP = [
	'connection',
	'keep-alive',
	'proxy-connection',
	'trailer',
	'transfer-encoding',
	'upgrade',
];

const ORIGIN_WIDE = [
	'alt-svc',
	'clear-site-data',
	'nel',
	'proxy-authenticate',
	'report-to',
	'reporting-endpoints',
	'service-worker-allowed',
	'strict-transport-security',
	'www-authenticate',
];

const headerNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,24}$/);

const randomCase = (name: string, flips: boolean[]) =>
	[...name]
		.map((char, index) => (flips[index % flips.length] ? char.toUpperCase() : char))
		.join('');

const headersFor = (names: readonly string[]): IncomingHttpHeaders =>
	Object.fromEntries(names.map((name) => [name, `value-of-${name}`]));

describe('forwardedRequestHeaders', () => {
	it('keeps the headers that the app needs, with their values', () => {
		expect(forwardedRequestHeaders(headersFor(FORWARDED))).toEqual(headersFor(FORWARDED));
	});

	it('drops n8n credentials, reverse-proxy identity, conditional and connection headers', () => {
		expect(forwardedRequestHeaders(headersFor(KEPT_IN_N8N))).toEqual({});
	});

	it('returns a new object and leaves the request headers as they are', () => {
		const sent = headersFor(['accept', 'cookie']);

		const forwarded = forwardedRequestHeaders(sent);
		forwarded.accept = 'changed';

		expect(sent).toEqual(headersFor(['accept', 'cookie']));
	});

	it('keeps a header only when it is on the list, in any letter case', () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(fc.oneof(fc.constantFrom(...FORWARDED, ...KEPT_IN_N8N), headerNameArb), {
					maxLength: 20,
				}),
				fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
				(names, flips) => {
					const sent = Object.fromEntries(
						names.map((name) => [randomCase(name, flips), `value-of-${name}`]),
					);

					const forwarded = forwardedRequestHeaders(sent);

					expect(forwarded).toEqual(
						Object.fromEntries(
							names
								.filter((name) => FORWARDED.includes(name))
								.map((name) => [name, `value-of-${name}`]),
						),
					);
				},
			),
		);
	});
});

describe('previewAnswerHeaders', () => {
	it('sets the sandbox CSP and keeps the answer out of caches, referrers and compression', () => {
		expect(previewAnswerHeaders()).toEqual({
			'content-security-policy': getHtmlSandboxCSP(),
			'x-content-type-options': 'nosniff',
			'cache-control': 'no-store, no-transform',
			'referrer-policy': 'no-referrer',
			'access-control-allow-origin': 'null',
			'access-control-expose-headers': '*',
		});
	});

	it('returns a new object each time, so a caller cannot change the next answer', () => {
		const first = previewAnswerHeaders();
		first['cache-control'] = 'public';

		expect(previewAnswerHeaders()['cache-control']).toBe('no-store, no-transform');
	});
});

describe('hardenedResponseHeaders', () => {
	it('replaces the security headers of the app and removes its cookies and frame rules', () => {
		const headers: IncomingHttpHeaders = {
			'content-type': 'text/html',
			'content-security-policy': "default-src 'self'",
			'content-security-policy-report-only': "default-src 'none'",
			'x-frame-options': 'DENY',
			'set-cookie': ['session=1'],
			'cache-control': 'max-age=3600',
			'referrer-policy': 'unsafe-url',
			'access-control-allow-origin': '*',
			'access-control-allow-credentials': 'true',
		};

		expect(hardenedResponseHeaders(headers)).toEqual({
			'content-type': 'text/html',
			...previewAnswerHeaders(),
		});
	});

	it('leaves the headers of the app as they are', () => {
		const headers: IncomingHttpHeaders = { 'set-cookie': ['a=1'], 'x-app-version': '1' };

		hardenedResponseHeaders(headers);

		expect(headers).toEqual({ 'set-cookie': ['a=1'], 'x-app-version': '1' });
	});

	it.each(ORIGIN_WIDE)(
		'removes %s, which would act on the whole n8n origin or prompt for its credentials',
		(name) => {
			expect(hardenedResponseHeaders({ [name]: 'value' })).not.toHaveProperty(name);
		},
	);

	it.each(HOP_BY_HOP)(
		'removes %s, which describes the connection from n8n to the service',
		(name) => {
			const hardened = hardenedResponseHeaders({ [name]: 'value', 'x-app-version': '1' });

			expect(hardened).not.toHaveProperty(name);
			expect(hardened['x-app-version']).toBe('1');
		},
	);

	it('keeps every other header of the app as it is', () => {
		const managed = new Set([
			...Object.keys(previewAnswerHeaders()),
			...ORIGIN_WIDE,
			...HOP_BY_HOP,
			'access-control-allow-credentials',
			'content-security-policy-report-only',
			'set-cookie',
			'x-frame-options',
		]);
		fc.assert(
			fc.property(
				fc.dictionary(
					fc.oneof(headerNameArb, fc.constantFrom(...managed)),
					fc.string({ maxLength: 20 }),
					{ maxKeys: 12 },
				),
				(upstream) => {
					const hardened = hardenedResponseHeaders(upstream);

					for (const [name, value] of Object.entries(upstream)) {
						if (!managed.has(name)) expect(hardened[name]).toBe(value);
					}
					for (const name of managed) {
						expect(hardened[name]).toBe(previewAnswerHeaders()[name]);
					}
				},
			),
		);
	});
});

describe('isCorsPreflight', () => {
	it('is true for OPTIONS with a requested method', () => {
		expect(
			isCorsPreflight('OPTIONS', { origin: 'null', 'access-control-request-method': 'POST' }),
		).toBe(true);
	});

	it.each([
		['OPTIONS', { origin: 'null' }],
		['POST', { 'access-control-request-method': 'POST' }],
		['GET', { 'access-control-request-method': 'GET' }],
		[undefined, { 'access-control-request-method': 'POST' }],
	])('is false for %s %j', (method, headers) => {
		expect(isCorsPreflight(method, headers)).toBe(false);
	});
});

describe('preflightAnswerHeaders', () => {
	it('allows the usual methods and exactly the page headers that reach the app', () => {
		const answer = preflightAnswerHeaders();

		expect(answer['access-control-allow-methods']).toBe('GET, HEAD, POST, PUT, PATCH, DELETE');
		expect(answer['access-control-allow-headers'].split(', ')).toEqual(PAGE_REQUEST_HEADERS);
		expect(answer['access-control-max-age']).toBe('600');
		expect(Object.keys(forwardedRequestHeaders(headersFor(PAGE_REQUEST_HEADERS)))).toEqual(
			PAGE_REQUEST_HEADERS,
		);
	});
});
