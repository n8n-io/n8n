import type { Logger } from '@n8n/backend-common';
import { HttpRequestConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import nock from 'nock';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import { binaryToString } from '../binary-string';
import { OutboundHttp } from '../outbound-http';

function makeFacade(): OutboundHttp {
	return new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>());
}

describe('OutboundHttp.requests requestLegacy', () => {
	beforeEach(() => {
		nock.cleanAll();
	});

	describe('request handling', () => {
		const baseUrl = 'https://example.test';

		it('returns the body and fires onFetched on success', async () => {
			nock(baseUrl).get('/ok').reply(200, 'hello');
			const onFetched = vi.fn();
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const body = await client.requestLegacy({ url: `${baseUrl}/ok` }, { onFetched });

			expect(body).toBe('hello');
			expect(onFetched).toHaveBeenCalledTimes(1);
		});

		it('returns the full response when resolveWithFullResponse is set', async () => {
			nock(baseUrl).get('/ok').reply(200, 'hello');
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const response = await client.requestLegacy({
				url: `${baseUrl}/ok`,
				resolveWithFullResponse: true,
			});

			expect(response).toMatchObject({ body: 'hello', statusCode: 200 });
		});

		it('rethrows an enriched error carrying the status, without firing onFetched', async () => {
			nock(baseUrl).get('/bad').reply(403, 'Forbidden', { 'content-type': 'text/plain' });
			const onFetched = vi.fn();
			const client = makeFacade().requests({ ssrf: 'disabled' });

			await expect(
				client.requestLegacy({ url: `${baseUrl}/bad` }, { onFetched }),
			).rejects.toMatchObject({
				statusCode: 403,
				status: 403,
				message: '403 - "Forbidden"',
				config: undefined,
				request: undefined,
				options: { method: 'get', url: `${baseUrl}/bad` },
				response: { status: 403 },
			});
			expect(onFetched).not.toHaveBeenCalled();
		});

		it('returns the error body and fires onFetched when simple is false', async () => {
			nock(baseUrl).get('/missing').reply(404, 'Not Found');
			const onFetched = vi.fn();
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const body = await client.requestLegacy(
				{ url: `${baseUrl}/missing`, simple: false },
				{ onFetched },
			);

			expect(body).toBe('Not Found');
			expect(onFetched).toHaveBeenCalledTimes(1);
		});

		it('returns the full error response when simple is false and resolveWithFullResponse is set', async () => {
			nock(baseUrl).get('/missing').reply(404, 'Not Found');
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const response = await client.requestLegacy({
				url: `${baseUrl}/missing`,
				simple: false,
				resolveWithFullResponse: true,
			});

			expect(response).toMatchObject({
				body: 'Not Found',
				statusCode: 404,
				statusMessage: 'Not Found',
			});
		});
	});

	describe('redirects', () => {
		const baseUrl = 'https://example.test';
		const otherOrigin = 'https://otherdomain.test';
		const basicAuth = 'Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk';

		const reflectHeaders = function (this: { req: { headers: unknown } }) {
			return this.req.headers;
		};

		it.each([[undefined], [true]])(
			'forwards the authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl)
					.get('/redirect')
					.reply(301, '', { Location: `${otherOrigin}/test` });
				nock(otherOrigin).get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ ssrf: 'disabled' });

				const response = (await client.requestLegacy({
					url: `${baseUrl}/redirect`,
					auth: { username: 'testuser', password: 'testpassword' },
					headers: { 'X-Other-Header': 'otherHeaderContent' },
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = JSON.parse(response.body);
				expect(forwardedHeaders.authorization).toBe(basicAuth);
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		it('does not forward the authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is false', async () => {
			nock(baseUrl)
				.get('/redirect')
				.reply(301, '', { Location: `${otherOrigin}/test` });
			nock(otherOrigin).get('/test').reply(200, reflectHeaders);
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const response = (await client.requestLegacy({
				url: `${baseUrl}/redirect`,
				auth: { username: 'testuser', password: 'testpassword' },
				headers: { 'X-Other-Header': 'otherHeaderContent' },
				resolveWithFullResponse: true,
				sendCredentialsOnCrossOriginRedirect: false,
			})) as { statusCode: number; body: string };

			expect(response.statusCode).toBe(200);
			const forwardedHeaders = JSON.parse(response.body);
			expect(forwardedHeaders.authorization).toBeUndefined();
			expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
		});

		it.each([[undefined], [true], [false]])(
			'forwards the authorization header on same-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl)
					.get('/redirect')
					.reply(301, '', { Location: `${baseUrl}/test` });
				nock(baseUrl).get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ ssrf: 'disabled' });

				const response = (await client.requestLegacy({
					url: `${baseUrl}/redirect`,
					auth: { username: 'testuser', password: 'testpassword' },
					headers: { 'X-Other-Header': 'otherHeaderContent' },
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = JSON.parse(response.body);
				expect(forwardedHeaders.authorization).toBe(basicAuth);
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		it('follows redirects by default', async () => {
			nock(baseUrl)
				.get('/redirect')
				.reply(301, '', { Location: `${baseUrl}/test` });
			nock(baseUrl).get('/test').reply(200, 'Redirected');
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const response = await client.requestLegacy({
				url: `${baseUrl}/redirect`,
				resolveWithFullResponse: true,
			});

			expect(response).toMatchObject({ body: 'Redirected', statusCode: 200 });
		});

		it('does not follow redirects when followRedirect is false', async () => {
			nock(baseUrl)
				.get('/redirect')
				.reply(301, '', { Location: `${baseUrl}/test` });
			nock(baseUrl).get('/test').reply(200, 'Redirected');
			const client = makeFacade().requests({ ssrf: 'disabled' });

			await expect(
				client.requestLegacy({
					url: `${baseUrl}/redirect`,
					resolveWithFullResponse: true,
					followRedirect: false,
				}),
			).rejects.toMatchObject({ statusCode: 301 });
		});
	});

	describe('SSRF policy', () => {
		const baseUrl = 'https://example.test';

		it('validates the URL through the provided bridge', async () => {
			nock(baseUrl).get('/ok').reply(200, 'ok');
			const validateUrl = vi.fn().mockResolvedValue({ ok: true, result: undefined });
			const bridge = {
				validateUrl,
				validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
				validateRedirectSync: vi.fn(),
				createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
			} as unknown as SsrfBridge;
			const client = makeFacade().requests({ ssrf: bridge });

			await client.requestLegacy({ baseURL: baseUrl, url: '/ok' });

			expect(validateUrl).toHaveBeenCalledWith(new URL(`${baseUrl}/ok`));
		});
	});

	describe('domain allowlist', () => {
		const baseUrl = 'https://example.com';

		it('blocks requests to disallowed domains', async () => {
			const client = makeFacade().requests({ ssrf: 'disabled' });

			await expect(
				client.requestLegacy({ url: `${baseUrl}/data`, allowedDomains: 'other.com' }),
			).rejects.toThrow('Domain not allowed');
		});

		it.each([['example.com'], [undefined]])(
			'allows requests to allowed domains when allowedDomains is %s',
			async (allowedDomains) => {
				nock(baseUrl).get('/data').reply(200, 'ok');
				const client = makeFacade().requests({ ssrf: 'disabled' });

				const body = await client.requestLegacy({ url: `${baseUrl}/data`, allowedDomains });

				expect(body).toBe('ok');
			},
		);

		it('blocks redirects to disallowed domains', async () => {
			nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://not-allowed.com/data' });
			nock('https://not-allowed.com').get('/data').reply(200, 'not-ok');
			const client = makeFacade().requests({ ssrf: 'disabled' });

			await expect(
				client.requestLegacy({
					url: `${baseUrl}/redirect`,
					allowedDomains: 'example.com',
					followAllRedirects: true,
				}),
			).rejects.toThrow('Domain not allowed');
		});

		it.each([['example.com, allowed.com'], [undefined]])(
			'allows redirects to allowed domains when allowedDomains is %s',
			async (allowedDomains) => {
				nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://allowed.com/data' });
				nock('https://allowed.com').get('/data').reply(200, 'ok');
				const client = makeFacade().requests({ ssrf: 'disabled' });

				const body = await client.requestLegacy({
					url: `${baseUrl}/redirect`,
					allowedDomains,
					followAllRedirects: true,
				});

				expect(body).toBe('ok');
			},
		);

		it('supports wildcard domains in allowedDomains', async () => {
			nock('https://api.example.com').get('/data').reply(200, 'ok');
			const client = makeFacade().requests({ ssrf: 'disabled' });

			const body = await client.requestLegacy({
				url: 'https://api.example.com/data',
				allowedDomains: '*.example.com',
			});

			expect(body).toBe('ok');
		});

		it('blocks wildcard domains that do not match', async () => {
			const client = makeFacade().requests({ ssrf: 'disabled' });

			await expect(
				client.requestLegacy({ url: 'https://blocked.com/data', allowedDomains: '*.example.com' }),
			).rejects.toThrow('Domain not allowed');
		});
	});

	describe('body drain', () => {
		let server: Server;
		let port: number;

		beforeAll(async () => {
			nock.enableNetConnect('127.0.0.1');
			// Sends headers (so axios resolves the response with the body as a
			// stream) then a partial body that never reaches the declared
			// Content-Length, holding the socket open. The body stream then emits
			// neither 'end', 'error' nor 'close' — replicating the stalled proxy
			// response that hangs the caller forever. `/stall` returns 403 (error
			// path, drained internally), `/stall-200` returns 200 (success path,
			// drained by the caller).
			server = createServer((req, res) => {
				const status = (req.url ?? '').startsWith('/stall-200') ? 200 : 403;
				res.writeHead(status, { 'content-type': 'text/plain', 'content-length': '1000' });
				res.write('partial body');
				// intentionally never end the response and never close the socket
			});
			await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
			port = (server.address() as AddressInfo).port;
		});

		afterAll(async () => {
			server.closeAllConnections();
			await new Promise<void>((resolve) => server.close(() => resolve()));
			nock.disableNetConnect();
		});

		beforeEach(() => {
			// Bound the body-read drain to a short deadline so the test stays fast.
			Container.set(
				HttpRequestConfig,
				Object.assign(new HttpRequestConfig(), { responseBodyReadTimeout: 500 }),
			);
		});

		afterEach(() => {
			Container.set(HttpRequestConfig, new HttpRequestConfig());
		});

		it(
			'rejects instead of hanging when the error-response body never terminates',
			{ timeout: 5000 },
			async () => {
				// No per-request `timeout`: axios then sets no socket timeout, so nothing
				// tears the stalled body stream down — without the guard it hangs forever.
				const client = makeFacade().requests({ ssrf: 'disabled' });

				await expect(
					client.requestLegacy({ url: `http://127.0.0.1:${port}/stall`, useStream: true }),
				).rejects.toThrow(/timed out/i);
			},
		);

		it(
			'bounds the error-body read by responseBodyReadTimeout even with a larger per-request timeout',
			{ timeout: 5000 },
			async () => {
				// The HTTP Request node always sets a per-request timeout (default 300_000ms).
				// The configured guard must still apply, so the read aborts at ~500ms here,
				// not at the 30s request timeout.
				const client = makeFacade().requests({ ssrf: 'disabled' });
				const start = Date.now();

				await expect(
					client.requestLegacy({
						url: `http://127.0.0.1:${port}/stall`,
						useStream: true,
						timeout: 30_000,
					}),
				).rejects.toThrow(/timed out/i);
				expect(Date.now() - start).toBeLessThan(3000);
			},
		);

		it(
			'guards a stalled success-response (2xx) body that the caller drains',
			{ timeout: 5000 },
			async () => {
				// A 2xx is not thrown, so requestLegacy returns the body stream and the
				// caller drains it. The guard must still bound it.
				const client = makeFacade().requests({ ssrf: 'disabled' });
				const start = Date.now();

				const body = (await client.requestLegacy({
					url: `http://127.0.0.1:${port}/stall-200`,
					useStream: true,
					timeout: 30_000,
				})) as Readable;

				await expect(binaryToString(body)).rejects.toThrow(/timed out/i);
				expect(Date.now() - start).toBeLessThan(3000);
			},
		);
	});
});
