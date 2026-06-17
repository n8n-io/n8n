import type { Logger } from '@n8n/backend-common';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
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
});
