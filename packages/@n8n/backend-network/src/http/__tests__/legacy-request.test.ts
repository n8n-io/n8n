import type { Logger } from '@n8n/backend-common';
import { HttpRequestConfig, type SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import axios from 'axios';
import { jsonParse, type IHttpRequestOptions, type IRequestOptions } from 'n8n-workflow';
import nock from 'nock';
import { createServer, type Server } from 'node:http';
import {
	createServer as createNetServer,
	type AddressInfo,
	type Server as NetServer,
	type Socket,
} from 'node:net';
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
		let dropTruncatedSocket: (() => void) | undefined;

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
				if (req.url === '/truncated-200') {
					res.writeHead(200, { 'content-type': 'text/plain', 'content-length': '100' });
					res.write('half');
					dropTruncatedSocket = () => res.socket?.destroy();
					return;
				}
				if (req.url === '/truncated-403-mid-drain') {
					res.writeHead(403, { 'content-type': 'text/plain', 'content-length': '1000' });
					res.write('Access denied ');
					setTimeout(() => {
						if (!res.socket?.destroyed) {
							res.write('mid-drain');
							setTimeout(() => res.socket?.destroy(), 20).unref();
						}
					}, 20).unref();
					return;
				}
				if (req.url === '/invalid-charset-403') {
					res.writeHead(403, { 'content-type': 'text/plain; charset=invalid-charset' });
					res.end('Access Denied by proxy');
					return;
				}
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
			'rejects with the HTTP status instead of hanging when the error-response body never terminates',
			{ timeout: 5000 },
			async () => {
				// No per-request `timeout`: axios then sets no socket timeout, so nothing
				// tears the stalled body stream down. The body-read guard aborts the
				// drain and requestLegacy still surfaces the original 403 status.
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				await expect(
					client.requestLegacy({ url: `http://127.0.0.1:${port}/stall`, useStream: true }),
				).rejects.toMatchObject({ statusCode: 403, status: 403, error: 'partial body' });
			},
		);

		it(
			'bounds the error-body read by responseBodyReadTimeout even with a larger per-request timeout',
			{ timeout: 5000 },
			async () => {
				// The HTTP Request node always sets a per-request timeout (default 300_000ms).
				// The configured guard must still apply, so the read aborts at ~500ms here,
				// not at the 30s request timeout, and still surfaces the original 403.
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
				const start = Date.now();

				await expect(
					client.requestLegacy({
						url: `http://127.0.0.1:${port}/stall`,
						useStream: true,
						timeout: 30_000,
					}),
				).rejects.toMatchObject({ statusCode: 403, status: 403, error: 'partial body' });
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

		it(
			'rejects a truncated success-response (2xx) body instead of returning partial bytes',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				const body = (await client.requestLegacy({
					url: `http://127.0.0.1:${port}/truncated-200`,
					useStream: true,
					timeout: 30_000,
				})) as Readable;

				// Drop the server socket after headers arrived so the IncomingMessage is
				// already destroyed with partial bytes still buffered before draining.
				const closed = new Promise<void>((resolve) => {
					body.once('error', () => {});
					body.once('close', resolve);
				});
				dropTruncatedSocket?.();
				await closed;

				expect(body.destroyed).toBe(true);
				await expect(binaryToString(body)).rejects.toThrow(/aborted|closed before completing/i);
			},
		);

		it(
			'preserves error-body bytes received before the connection drops mid-drain',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				await expect(
					client.requestLegacy({
						url: `http://127.0.0.1:${port}/truncated-403-mid-drain`,
						useStream: true,
						timeout: 30_000,
					}),
				).rejects.toMatchObject({
					statusCode: 403,
					status: 403,
					error: 'Access denied mid-drain',
				});
			},
		);

		it(
			'preserves the error body via UTF-8 fallback when the response charset cannot be decoded',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });

				await expect(
					client.requestLegacy({
						url: `http://127.0.0.1:${port}/invalid-charset-403`,
						useStream: true,
					}),
				).rejects.toMatchObject({
					statusCode: 403,
					status: 403,
					error: 'Access Denied by proxy',
				});
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

	// Regression test for NODE-5666: HTTP Request node with Response Format = Autodetect
	// hangs until responseBodyReadTimeout (default 5 min) on a proxy 403 CONNECT denial.
	describe('proxy CONNECT error responses', () => {
		let proxyServer: NetServer;
		let proxyUrl: string;
		let previousAxiosProxy: typeof axios.defaults.proxy;
		const openSockets = new Set<Socket>();
		const pendingTimers = new Set<NodeJS.Timeout>();
		const errorBody = `<!DOCTYPE html><html><body>${'Access Denied. '.repeat(250)}</body></html>`;

		beforeAll(async () => {
			// Match production startup (configureGlobalAxiosDefaults) so axios lets
			// HttpsProxyAgent handle proxying even when the test runner sets HTTPS_PROXY.
			previousAxiosProxy = axios.defaults.proxy;
			axios.defaults.proxy = false;
			// Restore native http/https modules because nock's @mswjs/interceptors
			// breaks HttpsProxyAgent real socket passthrough.
			nock.restore();
			// Emulate Squid denying an HTTPS CONNECT tunnel: write 403 headers with a
			// multi-KB Content-Length first, then send the HTML body shortly after
			// (matching headers and body spanning separate writes or TCP segments).
			proxyServer = createNetServer((socket) => {
				openSockets.add(socket);
				socket.once('close', () => openSockets.delete(socket));
				socket.setNoDelay(true);
				socket.once('data', (chunk) => {
					const requestLine = chunk.toString('ascii').split('\r\n')[0] ?? '';
					if (requestLine.includes('partial-body.example.com')) {
						// Headers and a partial HTML body arrive in the same TCP segment,
						// with a larger Content-Length that is never satisfied.
						socket.write(
							'HTTP/1.1 403 Forbidden\r\n' +
								'Server: squid/5.7\r\n' +
								'Content-Type: text/html;charset=utf-8\r\n' +
								'Content-Length: 100000\r\n' +
								'\r\n' +
								'<html><body><h1>Access Denied.</h1></body></html>\n',
						);
						return;
					}
					if (requestLine.includes('empty-body.example.com')) {
						socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n');
						return;
					}
					socket.write(
						'HTTP/1.1 403 Forbidden\r\n' +
							'Server: squid/5.7\r\n' +
							'Content-Type: text/html;charset=utf-8\r\n' +
							`Content-Length: ${Buffer.byteLength(errorBody)}\r\n` +
							'X-Squid-Error: ERR_ACCESS_DENIED 0\r\n' +
							'Connection: close\r\n' +
							'\r\n',
					);
					const timer = setTimeout(() => {
						pendingTimers.delete(timer);
						if (!socket.destroyed) {
							socket.end(errorBody);
						}
					}, 20);
					timer.unref();
					pendingTimers.add(timer);
				});
			});
			await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
			proxyUrl = `http://127.0.0.1:${(proxyServer.address() as AddressInfo).port}`;
		});

		afterAll(async () => {
			for (const timer of pendingTimers) clearTimeout(timer);
			pendingTimers.clear();
			for (const socket of openSockets) socket.destroy();
			openSockets.clear();
			await new Promise<void>((resolve) => proxyServer.close(() => resolve()));
			axios.defaults.proxy = previousAxiosProxy;
			if (!nock.isActive()) nock.activate();
		});

		beforeEach(() => {
			// Bound the inactivity timeout below the test timeout so a hang fails fast
			// in CI rather than waiting for the 300_000ms production default.
			Container.set(
				HttpRequestConfig,
				Object.assign(new HttpRequestConfig(), { responseBodyReadTimeout: 1500 }),
			);
		});

		afterEach(() => {
			Container.set(HttpRequestConfig, new HttpRequestConfig());
		});

		it(
			'fails fast with 403 when proxy denies CONNECT without streaming (Text format)',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
				const start = Date.now();

				await expect(
					client.requestLegacy({
						url: 'https://denied.example.com/',
						method: 'GET',
						proxy: proxyUrl,
						json: true,
						resolveWithFullResponse: true,
						timeout: 300_000,
					}),
				).rejects.toMatchObject({ statusCode: 403 });

				expect(Date.now() - start).toBeLessThan(1000);
			},
		);

		it(
			'fails fast with 403 when proxy denies CONNECT with streaming (Autodetect format)',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
				const start = Date.now();

				await expect(
					client.requestLegacy({
						url: 'https://denied.example.com/',
						method: 'GET',
						proxy: proxyUrl,
						encoding: null,
						json: false,
						useStream: true,
						resolveWithFullResponse: true,
						timeout: 300_000,
					}),
				).rejects.toMatchObject({ statusCode: 403 });

				expect(Date.now() - start).toBeLessThan(1000);
			},
		);

		it(
			'surfaces buffered partial error body when proxy CONNECT 403 arrives with truncated Content-Length',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
				const start = Date.now();

				await expect(
					client.requestLegacy({
						url: 'https://partial-body.example.com/',
						method: 'GET',
						proxy: proxyUrl,
						encoding: null,
						json: false,
						useStream: true,
						resolveWithFullResponse: true,
						timeout: 300_000,
					}),
				).rejects.toMatchObject({
					statusCode: 403,
					status: 403,
					error: expect.stringContaining('Access Denied.'),
				});

				expect(Date.now() - start).toBeLessThan(1000);
			},
		);

		it(
			'fails fast with 403 when proxy CONNECT denial has empty body and no Content-Type',
			{ timeout: 5000 },
			async () => {
				const client = makeFacade().requests({ useDefaultSsrfPolicy: 'unsafe' });
				const start = Date.now();

				await expect(
					client.requestLegacy({
						url: 'https://empty-body.example.com/',
						method: 'GET',
						proxy: proxyUrl,
						encoding: null,
						json: false,
						useStream: true,
						resolveWithFullResponse: true,
						timeout: 300_000,
					}),
				).rejects.toMatchObject({
					statusCode: 403,
					status: 403,
					error: '',
				});

				expect(Date.now() - start).toBeLessThan(1000);
			},
		);
	});
});
