import fc from 'fast-check';
import { getHtmlSandboxCSP } from 'n8n-core';
import type { IncomingHttpHeaders } from 'node:http';

import {
	PAGE_REQUEST_HEADERS,
	droppedRequestHeaders,
	hardenResponseHeaders,
	isCorsPreflight,
	preflightAnswerHeaders,
	previewAnswerHeaders,
} from '../sandbox-preview-headers';

const FORWARDED = [
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
];

/** Headers that carry n8n or reverse-proxy credentials, or that would make the service answer 304. */
const KEPT_IN_N8N = [
	'authorization',
	'browser-id',
	'cf-access-jwt-assertion',
	'cookie',
	'forwarded',
	'if-modified-since',
	'if-none-match',
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

describe('droppedRequestHeaders', () => {
	it('keeps the headers that the app needs', () => {
		expect(droppedRequestHeaders(FORWARDED)).toEqual([]);
	});

	it('drops n8n credentials, reverse-proxy identity headers and conditional headers', () => {
		expect(droppedRequestHeaders(KEPT_IN_N8N)).toEqual(KEPT_IN_N8N);
	});

	it('keeps the order of the names that it drops', () => {
		expect(droppedRequestHeaders(['cookie', 'accept', 'x-forwarded-for', 'range'])).toEqual([
			'cookie',
			'x-forwarded-for',
		]);
	});

	it('drops a name only when it is not on the list, in any letter case', () => {
		fc.assert(
			fc.property(
				fc.array(fc.oneof(fc.constantFrom(...FORWARDED, ...KEPT_IN_N8N), headerNameArb), {
					maxLength: 20,
				}),
				fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
				(names, flips) => {
					const sent = names.map((name) => randomCase(name, flips));

					const dropped = droppedRequestHeaders(sent);

					expect(dropped).toEqual(sent.filter((name) => !FORWARDED.includes(name.toLowerCase())));
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

describe('hardenResponseHeaders', () => {
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

		hardenResponseHeaders(headers);

		expect(headers).toEqual({ 'content-type': 'text/html', ...previewAnswerHeaders() });
	});

	it.each(ORIGIN_WIDE)(
		'removes %s, which would act on the whole n8n origin or prompt for its credentials',
		(name) => {
			const headers: IncomingHttpHeaders = { [name]: 'value' };

			hardenResponseHeaders(headers);

			expect(headers).not.toHaveProperty(name);
		},
	);

	it('keeps every other header of the app as it is', () => {
		const managed = new Set([
			...Object.keys(previewAnswerHeaders()),
			...ORIGIN_WIDE,
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
					const headers: IncomingHttpHeaders = { ...upstream };

					hardenResponseHeaders(headers);

					for (const [name, value] of Object.entries(upstream)) {
						if (!managed.has(name)) expect(headers[name]).toBe(value);
					}
					for (const name of managed) {
						expect(headers[name]).toBe(previewAnswerHeaders()[name]);
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
		expect(droppedRequestHeaders(PAGE_REQUEST_HEADERS)).toEqual([]);
	});
});
