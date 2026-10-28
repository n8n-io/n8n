import type { Logger } from '@n8n/backend-common';
import { HttpRequestConfig, type SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { jsonParse, type IHttpRequestOptions, type IRequestOptions } from 'n8n-workflow';
import nock from 'nock';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import { binaryToString } from '../binary-string';
import { OutboundHttp } from '../outbound-http';

// A given `bridge` is installed as the instance's protection service, so
// clients pick it up through the default safe mode.
function makeFacade(bridge?: SsrfBridge): OutboundHttp {
	const service = bridge ? mock<SsrfProtectionService>(bridge) : mock<SsrfProtectionService>();
	return new OutboundHttp(service, mock<SsrfProtectionConfig>({ enabled: true }), mock<Logger>());
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
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			const body = await client.requestLegacy({ url: `${baseUrl}/ok` }, { onFetched });

			expect(body).toBe('hello');
			expect(onFetched).toHaveBeenCalledTimes(1);
		});

		it('returns the full response when resolveWithFullResponse is set', async () => {
			nock(baseUrl).get('/ok').reply(200, 'hello');
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			const response = await client.requestLegacy({
				url: `${baseUrl}/ok`,
				resolveWithFullResponse: true,
			});

			expect(response).toMatchObject({ body: 'hello', statusCode: 200 });
		});

		it('rethrows an enriched error carrying the status, without firing onFetched', async () => {
			nock(baseUrl).get('/bad').reply(403, 'Forbidden', { 'content-type': 'text/plain' });
			const onFetched = vi.fn();
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			const body = await client.requestLegacy(
				{ url: `${baseUrl}/missing`, simple: false },
				{ onFetched },
			);

			expect(body).toBe('Not Found');
			expect(onFetched).toHaveBeenCalledTimes(1);
		});

		it('returns the full error response when simple is false and resolveWithFullResponse is set', async () => {
			nock(baseUrl).get('/missing').reply(404, 'Not Found');
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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

		it.each([[true]])(
			'forwards the authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl)
					.get('/redirect')
					.reply(301, '', { Location: `${otherOrigin}/test` });
				nock(otherOrigin).get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const response = (await client.requestLegacy({
					url: `${baseUrl}/redirect`,
					auth: { username: 'testuser', password: 'testpassword' },
					headers: { 'X-Other-Header': 'otherHeaderContent' },
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = jsonParse<Record<string, string>>(response.body);
				expect(forwardedHeaders.authorization).toBe(basicAuth);
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		it.each([[undefined], [false]])(
			'does not forward the authorization header on cross-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl)
					.get('/redirect')
					.reply(301, '', { Location: `${otherOrigin}/test` });
				nock(otherOrigin).get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const response = (await client.requestLegacy({
					url: `${baseUrl}/redirect`,
					auth: { username: 'testuser', password: 'testpassword' },
					headers: { 'X-Other-Header': 'otherHeaderContent' },
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = jsonParse<Record<string, string>>(response.body);
				expect(forwardedHeaders.authorization).toBeUndefined();
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		it.each([
			['https://example.test', 'http://example.test', undefined],
			['http://example.test', 'https://example.test:8443', undefined],
			['https://example.test', 'https://sub.example.test', undefined],
			['https://example.test', 'https://sub.example.test', false],
		])(
			'does not forward credential headers on a redirect from %s to %s when sendCredentialsOnCrossOriginRedirect is %s',
			async (fromOrigin, toOrigin, sendCredentialsOnCrossOriginRedirect) => {
				nock(fromOrigin)
					.get('/redirect')
					.reply(301, '', { Location: `${toOrigin}/test` });
				nock(toOrigin).get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const response = (await client.requestLegacy({
					url: `${fromOrigin}/redirect`,
					headers: {
						authorization: 'Bearer secret',
						Cookie: 'session=secret',
						'X-Other-Header': 'otherHeaderContent',
					},
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = jsonParse<Record<string, string>>(response.body);
				expect(forwardedHeaders.authorization).toBeUndefined();
				expect(forwardedHeaders.cookie).toBeUndefined();
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		it.each([[undefined], [false]])(
			'forwards credential headers on a redirect from http to https on the same host when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock('http://example.test')
					.get('/redirect')
					.reply(301, '', { Location: 'https://example.test/test' });
				nock('https://example.test').get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const response = (await client.requestLegacy({
					url: 'http://example.test/redirect',
					headers: {
						authorization: 'Bearer secret',
						Cookie: 'session=secret',
					},
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = jsonParse<Record<string, string>>(response.body);
				expect(forwardedHeaders.authorization).toBe('Bearer secret');
				expect(forwardedHeaders.cookie).toBe('session=secret');
			},
		);

		it.each([[undefined], [true], [false]])(
			'forwards the authorization header on same-origin redirects when sendCredentialsOnCrossOriginRedirect is %s',
			async (sendCredentialsOnCrossOriginRedirect) => {
				nock(baseUrl)
					.get('/redirect')
					.reply(301, '', { Location: `${baseUrl}/test` });
				nock(baseUrl).get('/test').reply(200, reflectHeaders);
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const response = (await client.requestLegacy({
					url: `${baseUrl}/redirect`,
					auth: { username: 'testuser', password: 'testpassword' },
					headers: { 'X-Other-Header': 'otherHeaderContent' },
					resolveWithFullResponse: true,
					sendCredentialsOnCrossOriginRedirect,
				})) as { statusCode: number; body: string };

				expect(response.statusCode).toBe(200);
				const forwardedHeaders = jsonParse<Record<string, string>>(response.body);
				expect(forwardedHeaders.authorization).toBe(basicAuth);
				expect(forwardedHeaders['x-other-header']).toBe('otherHeaderContent');
			},
		);

		it('follows redirects by default', async () => {
			nock(baseUrl)
				.get('/redirect')
				.reply(301, '', { Location: `${baseUrl}/test` });
			nock(baseUrl).get('/test').reply(200, 'Redirected');
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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
		const otherUrl = 'https://other.test';

		function makeBridge() {
			const validateUrl = vi.fn().mockResolvedValue({ ok: true, result: undefined });
			const bridge = {
				validateUrl,
				validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
				validateRedirectSync: vi.fn(),
				createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
			} as unknown as SsrfBridge;
			return { bridge, validateUrl };
		}

		it('validates the URL through the provided bridge', async () => {
			nock(baseUrl).get('/ok').reply(200, 'ok');
			const { bridge, validateUrl } = makeBridge();
			const client = makeFacade(bridge).requests();

			await client.requestLegacy({ baseURL: baseUrl, url: '/ok' });

			expect(validateUrl).toHaveBeenCalledWith(new URL(`${baseUrl}/ok`));
		});

		it('validates the url the request is sent to, not the uri alias', async () => {
			const scope = nock(otherUrl).get('/target').reply(200, 'ok');
			const { bridge, validateUrl } = makeBridge();
			const client = makeFacade(bridge).requests();

			await client.requestLegacy({ uri: `${baseUrl}/ok`, url: `${otherUrl}/target` });

			expect(validateUrl).toHaveBeenCalledTimes(1);
			expect(validateUrl).toHaveBeenCalledWith(new URL(`${otherUrl}/target`));
			expect(scope.isDone()).toBe(true);
		});

		it('rejects a blocked url even when the uri alias is allowed', async () => {
			const scope = nock(otherUrl).get('/target').reply(200, 'ok');
			const { bridge, validateUrl } = makeBridge();
			validateUrl.mockImplementation((url: URL) =>
				url.href === `${otherUrl}/target`
					? { ok: false, error: new Error('Blocked') }
					: { ok: true, result: undefined },
			);
			const client = makeFacade(bridge).requests();

			await expect(
				client.requestLegacy({ uri: `${baseUrl}/ok`, url: `${otherUrl}/target` }),
			).rejects.toThrow('Blocked');
			expect(scope.isDone()).toBe(false);
		});

		it('validates a baseURL-only target', async () => {
			const scope = nock(baseUrl).get('/only').reply(200, 'ok');
			const { bridge, validateUrl } = makeBridge();
			const client = makeFacade(bridge).requests();

			await client.requestLegacy({ baseURL: `${baseUrl}/only` });

			expect(validateUrl).toHaveBeenCalledWith(new URL(`${baseUrl}/only`));
			expect(scope.isDone()).toBe(true);
		});
	});

	describe('domain allowlist', () => {
		const baseUrl = 'https://example.com';

		it('blocks requests to disallowed domains', async () => {
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			await expect(
				client.requestLegacy({ url: `${baseUrl}/data`, allowedDomains: 'other.com' }),
			).rejects.toThrow('Domain not allowed');
		});

		it.each([['example.com'], [undefined]])(
			'allows requests to allowed domains when allowedDomains is %s',
			async (allowedDomains) => {
				nock(baseUrl).get('/data').reply(200, 'ok');
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const body = await client.requestLegacy({ url: `${baseUrl}/data`, allowedDomains });

				expect(body).toBe('ok');
			},
		);

		it('blocks redirects to disallowed domains', async () => {
			nock(baseUrl).get('/redirect').reply(301, '', { Location: 'https://not-allowed.com/data' });
			nock('https://not-allowed.com').get('/data').reply(200, 'not-ok');
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			const body = await client.requestLegacy({
				url: 'https://api.example.com/data',
				allowedDomains: '*.example.com',
			});

			expect(body).toBe('ok');
		});

		it('blocks wildcard domains that do not match', async () => {
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			await expect(
				client.requestLegacy({ url: 'https://blocked.com/data', allowedDomains: '*.example.com' }),
			).rejects.toThrow('Domain not allowed');
		});
	});

	describe('digest auth', () => {
		const baseUrl = 'https://digest.test';

		// A strict Digest-only server: it issues its WWW-Authenticate challenge only to
		// an unauthenticated first request. A stray `Basic` header gets a bare 401 with
		// no challenge, so the client can never derive the Digest header.
		const mockStrictDigestServer = () => {
			// No auth header -> issue the Digest challenge.
			nock(baseUrl, { badheaders: ['authorization'] })
				.get('/get_file')
				.reply(401, '', {
					'www-authenticate': 'Digest realm="test", nonce="abc123", qop="auth"',
				});

			// A stray Basic header -> reject without a usable challenge.
			nock(baseUrl, { reqheaders: { authorization: /^Basic /i } })
				.get('/get_file')
				.reply(401, 'Unauthorized');

			// A proper Digest response -> serve the file.
			nock(baseUrl, { reqheaders: { authorization: /^Digest /i } })
				.get('/get_file')
				.reply(200, 'FILE_CONTENTS');
		};

		it('authenticates against a Digest-only server when sendImmediately is false', async () => {
			mockStrictDigestServer();
			const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

			const body = await client.requestLegacy({
				url: `${baseUrl}/get_file`,
				method: 'GET',
				auth: { user: 'user', pass: 'pass', sendImmediately: false },
			});

			expect(body).toBe('FILE_CONTENTS');
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
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

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
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
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
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
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

	describe('stream request bodies', () => {
		let refusedUrl: string;
		let okServer: Server;
		let okUrl: string;

		beforeAll(async () => {
			nock.enableNetConnect('127.0.0.1');
			const closed = createServer();
			await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
			refusedUrl = `http://127.0.0.1:${(closed.address() as AddressInfo).port}/upload`;
			await new Promise<void>((resolve) => closed.close(() => resolve()));

			// Answers before it reads the whole body, so the body is still open after the request.
			okServer = createServer((_req, res) => res.end('ok'));
			await new Promise<void>((resolve) => okServer.listen(0, '127.0.0.1', resolve));
			okUrl = `http://127.0.0.1:${(okServer.address() as AddressInfo).port}/upload`;
		});

		afterAll(async () => {
			nock.disableNetConnect();
			okServer.closeAllConnections();
			await new Promise<void>((resolve) => okServer.close(() => resolve()));
		});

		/** Sends one chunk and then waits, like a large file that is still being read when the request fails. */
		const pendingStream = () => {
			let sent = false;
			return new Readable({
				read() {
					if (sent) return;
					sent = true;
					this.push(Buffer.alloc(1024));
				},
			});
		};

		/** Blocks every URL except the local test server. */
		const blockingBridge = () =>
			({
				validateUrl: vi.fn(async (url: URL) =>
					url.hostname === '127.0.0.1'
						? { ok: true, result: undefined }
						: { ok: false, error: new Error('Blocked') },
				),
				validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
				validateRedirectSync: vi.fn(),
				createSecureLookup: vi.fn().mockReturnValue(undefined),
			}) as unknown as SsrfBridge;

		const sendLegacy = async (options: IRequestOptions) =>
			await makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' }).requestLegacy(options);

		const sendHttpRequest = async (options: IHttpRequestOptions) =>
			await makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' }).request(options);

		const multipart = (stream: Readable) => ({
			file: { value: stream, options: { filename: 'file.bin', knownLength: 1024 } },
		});

		it.each([
			{
				name: 'a binary body when the connection is refused',
				error: /ECONNREFUSED/,
				send: async (stream: Readable) =>
					await sendLegacy({ url: refusedUrl, method: 'POST', body: stream }),
			},
			{
				name: 'a multipart body when the connection is refused',
				error: /ECONNREFUSED/,
				send: async (stream: Readable) =>
					await sendLegacy({ url: refusedUrl, method: 'POST', formData: multipart(stream) }),
			},
			{
				name: 'a binary body of httpRequest when the connection is refused',
				error: /ECONNREFUSED/,
				send: async (stream: Readable) =>
					await sendHttpRequest({ url: refusedUrl, method: 'POST', body: stream }),
			},
			{
				name: 'a binary body when the domain is not allowed',
				error: 'Domain not allowed',
				send: async (stream: Readable) =>
					await sendLegacy({
						url: refusedUrl,
						method: 'POST',
						body: stream,
						allowedDomains: 'example.com',
					}),
			},
			{
				name: 'a multipart body when the domain is not allowed',
				error: 'Domain not allowed',
				send: async (stream: Readable) =>
					await sendLegacy({
						url: refusedUrl,
						method: 'POST',
						formData: multipart(stream),
						allowedDomains: 'example.com',
					}),
			},
			{
				name: 'a binary body of httpRequest when the domain is not allowed',
				error: 'Domain not allowed',
				send: async (stream: Readable) =>
					await sendHttpRequest({
						url: refusedUrl,
						method: 'POST',
						body: stream,
						allowedDomains: 'example.com',
					}),
			},
			{
				name: 'a binary body when the URL is blocked',
				error: 'Blocked',
				send: async (stream: Readable) =>
					await makeFacade(blockingBridge())
						.requests()
						.requestLegacy({ url: 'https://blocked.test/upload', method: 'POST', body: stream }),
			},
		])('should destroy the stream of $name', async ({ send, error }) => {
			const stream = pendingStream();

			await expect(send(stream)).rejects.toThrow(error);

			expect(stream.destroyed).toBe(true);
		});

		it.each([
			{
				name: 'requestLegacy',
				send: async (stream: Readable) =>
					await sendLegacy({ url: okUrl, method: 'POST', body: stream }),
			},
			{
				name: 'request',
				send: async (stream: Readable) =>
					await sendHttpRequest({ url: okUrl, method: 'POST', body: stream }),
			},
		])('should not destroy the stream when $name succeeds', async ({ send }) => {
			const stream = pendingStream();

			await expect(send(stream)).resolves.toBe('ok');

			expect(stream.destroyed).toBe(false);
			stream.destroy();
		});
	});
});
