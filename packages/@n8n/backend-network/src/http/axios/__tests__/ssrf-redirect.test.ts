import type { Logger } from '@n8n/backend-common';
import dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge } from '../../../ssrf';
import { makeSsrfBridge, useCleanProxyEnv } from '../../../ssrf/__tests__/mock-ssrf-bridge';
import { executeLegacyRequest } from '../../legacy-request';
import { type LocalServer, startServer } from '../../local-server';
import { configureGlobalAxiosDefaults } from '../config';
import { httpRequest } from '../request';

// When a proxy may carry the request, axios' synchronous redirect following
// cannot validate a hostname target, so `httpRequest` follows redirects itself
// and runs the SSRF target check on every hop. These tests drive the real path
// against a local server: a proxy env var is set so the manual follower engages,
// while `NO_PROXY` keeps the loopback connection direct (no real proxy needed).

configureGlobalAxiosDefaults();

async function startRedirectServer(): Promise<LocalServer> {
	let serverUrl = '';
	const server = await startServer((req, res) => {
		if (req.url === '/start') {
			res.writeHead(302, { Location: `${serverUrl}/internal` });
			res.end();
			return;
		}
		if (req.url === '/multiple-choices') {
			// A 3xx outside the classic set (300) that still carries a Location to follow.
			res.writeHead(300, { Location: `${serverUrl}/internal` });
			res.end();
			return;
		}
		if (req.url === '/not-modified') {
			// A 3xx without a Location: not a redirect, must surface to the caller's status policy.
			res.writeHead(304);
			res.end();
			return;
		}
		if (req.url === '/bad-location') {
			// A redirect to a Location the server got wrong: not a resolvable URL.
			res.writeHead(302, { Location: 'http://' });
			res.end();
			return;
		}
		res.writeHead(200, { 'content-type': 'text/plain' });
		res.end(`reached:${req.url}`);
	});
	serverUrl = server.url;
	return server;
}

function makeBridge(blockedPath: string): { bridge: SsrfBridge; error: Error } {
	const error = new Error(`blocked ${blockedPath}`);
	const bridge = makeSsrfBridge({
		validateUrl: vi.fn(async (url: string | URL) => {
			const href = typeof url === 'string' ? url : url.href;
			return await Promise.resolve(
				href.includes(blockedPath)
					? { ok: false as const, error }
					: { ok: true as const, result: undefined },
			);
		}),
	});
	return { bridge, error };
}

describe('httpRequest manual redirect following with SSRF + proxy', () => {
	useCleanProxyEnv();

	let server: LocalServer;

	beforeEach(async () => {
		// A proxy is configured (engages the manual follower), but loopback is
		// exempt so the request connects directly to the local server.
		process.env.HTTP_PROXY = 'http://127.0.0.1:1';
		process.env.HTTPS_PROXY = 'http://127.0.0.1:1';
		process.env.NO_PROXY = '127.0.0.1,localhost';

		server = await startRedirectServer();
	});

	afterEach(async () => {
		await server.close();
	});

	it('validates the redirect target and blocks it even though the initial URL is allowed', async () => {
		const { bridge } = makeBridge('/internal');

		await expect(
			httpRequest({ method: 'GET', url: `${server.url}/start` }, bridge),
		).rejects.toThrow('/internal');

		expect(bridge.validateUrl).toHaveBeenCalledWith(
			expect.objectContaining({ href: `${server.url}/start` }),
		);
		expect(bridge.validateUrl).toHaveBeenCalledWith(
			expect.objectContaining({ href: `${server.url}/internal` }),
		);
		expect(server.captured).toContain('/start');
		expect(server.captured).not.toContain('/internal');
	});

	it('follows the redirect when every hop passes validation', async () => {
		const { bridge } = makeBridge('/never-matches');

		const response = await httpRequest({ method: 'GET', url: `${server.url}/start` }, bridge);

		expect(response).toBe('reached:/internal');
		expect(bridge.validateUrl).toHaveBeenCalledWith(
			expect.objectContaining({ href: `${server.url}/internal` }),
		);
		expect(server.captured).toEqual(['/start', '/internal']);
	});

	it('follows a 3xx outside the classic set when it carries a Location', async () => {
		const { bridge } = makeBridge('/never-matches');

		const response = await httpRequest(
			{ method: 'GET', url: `${server.url}/multiple-choices` },
			bridge,
		);

		expect(response).toBe('reached:/internal');
		expect(bridge.validateUrl).toHaveBeenCalledWith(
			expect.objectContaining({ href: `${server.url}/internal` }),
		);
		expect(server.captured).toEqual(['/multiple-choices', '/internal']);
	});

	it('surfaces a 3xx without a Location through the caller status policy instead of following it', async () => {
		const { bridge } = makeBridge('/never-matches');

		await expect(
			httpRequest({ method: 'GET', url: `${server.url}/not-modified` }, bridge),
		).rejects.toThrow('status code 304');

		expect(server.captured).toEqual(['/not-modified']);
	});

	it('blocks the initial request before any hop when its URL is rejected', async () => {
		const { bridge } = makeBridge('/start');

		await expect(
			httpRequest({ method: 'GET', url: `${server.url}/start` }, bridge),
		).rejects.toThrow('/start');

		expect(server.captured).toEqual([]);
	});

	it('throws a clear error when the server returns a malformed redirect location', async () => {
		const { bridge } = makeBridge('/never-matches');

		await expect(
			httpRequest({ method: 'GET', url: `${server.url}/bad-location` }, bridge),
		).rejects.toThrow('Invalid redirect location received from server');

		expect(server.captured).toEqual(['/bad-location']);
	});

	it('returns the redirect response without following when redirects are disabled', async () => {
		const { bridge } = makeBridge('/internal');

		const response = await httpRequest(
			{
				method: 'GET',
				url: `${server.url}/start`,
				disableFollowRedirect: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			},
			bridge,
		);

		expect(response.statusCode).toBe(302);
		expect(bridge.validateUrl).not.toHaveBeenCalledWith(
			expect.objectContaining({ href: `${server.url}/internal` }),
		);
		expect(server.captured).toEqual(['/start']);
	});

	describe('legacy request path', () => {
		it('validates the redirect target and blocks it', async () => {
			const { bridge } = makeBridge('/internal');

			await expect(
				executeLegacyRequest({ uri: `${server.url}/start` }, bridge, mock<Logger>()),
			).rejects.toThrow('/internal');

			expect(bridge.validateUrl).toHaveBeenCalledWith(
				expect.objectContaining({ href: `${server.url}/internal` }),
			);
			expect(server.captured).toContain('/start');
			expect(server.captured).not.toContain('/internal');
		});

		it('follows the redirect when every hop passes validation', async () => {
			const { bridge } = makeBridge('/never-matches');

			const body = await executeLegacyRequest(
				{ uri: `${server.url}/start` },
				bridge,
				mock<Logger>(),
			);

			expect(body).toBe('reached:/internal');
			expect(server.captured).toEqual(['/start', '/internal']);
		});
	});

	describe('proxy host validation across redirect hops', () => {
		let proxyServer: LocalServer;
		const START_URL = 'http://redirect-target.invalid/start';
		const INTERNAL_URL = 'http://redirect-target.invalid/internal';

		beforeEach(async () => {
			proxyServer = await startServer((req, res) => {
				if (req.url === START_URL) {
					res.writeHead(302, { Location: INTERNAL_URL });
					res.end();
					return;
				}
				res.writeHead(200, { 'content-type': 'text/plain' });
				res.end('reached:proxied');
			});
		});

		afterEach(async () => {
			await proxyServer.close();
		});

		const proxyConfig = () => ({
			host: 'localhost',
			port: Number(new URL(proxyServer.url).port),
			protocol: 'http',
		});

		it('follows the redirect through a proxy the policy allows', async () => {
			const bridge = makeSsrfBridge({
				createSecureLookup: () => dns.lookup as unknown as LookupFunction,
			});

			const response = await httpRequest(
				{ method: 'GET', url: START_URL, proxy: proxyConfig() },
				bridge,
			);

			expect(response).toBe('reached:proxied');
			expect(proxyServer.captured).toEqual([START_URL, INTERNAL_URL]);
		});

		it('blocks the redirect hop when the proxy host is no longer allowed', async () => {
			const denied = new Error(
				'The request was blocked because it resolves to a restricted IP address',
			);
			const lookup = ((hostname: string, options: dns.LookupOptions, onResult: unknown) => {
				if (proxyServer.captured.length > 0) {
					(onResult as (error: Error | null, address?: unknown, family?: number) => void)(
						denied,
						options.all ? [] : '',
						undefined,
					);
					return;
				}
				dns.lookup(hostname, options, onResult as never);
			}) as unknown as LookupFunction;
			const bridge = makeSsrfBridge({ createSecureLookup: () => lookup });

			await expect(
				httpRequest({ method: 'GET', url: START_URL, proxy: proxyConfig() }, bridge),
			).rejects.toThrow(denied.message);

			expect(proxyServer.captured).toEqual([START_URL]);
		});
	});

	describe('proxy host validation before the request is sent', () => {
		let proxyServer: LocalServer;
		const TARGET_URL = 'http://proxied-target.invalid/x';

		beforeEach(async () => {
			proxyServer = await startServer((_req, res) => {
				res.writeHead(200, { 'content-type': 'text/plain' });
				res.end('reached:proxied');
			});
		});

		afterEach(async () => {
			await proxyServer.close();
		});

		const proxyUrl = () => `http://localhost:${new URL(proxyServer.url).port}`;

		const proxyConfig = () => ({
			host: 'localhost',
			port: Number(new URL(proxyServer.url).port),
			protocol: 'http',
		});

		function bridgeDenying(hostname: string, error: Error): SsrfBridge {
			return makeSsrfBridge({
				createSecureLookup: () => dns.lookup as unknown as LookupFunction,
				validateUrl: vi.fn(async (url: string | URL) => {
					const host = typeof url === 'string' ? new URL(url).hostname : url.hostname;
					return await Promise.resolve(
						host === hostname
							? { ok: false as const, error }
							: { ok: true as const, result: undefined },
					);
				}),
			});
		}

		const requestPaths = [
			[
				'httpRequest',
				async (bridge: SsrfBridge) =>
					await httpRequest({ method: 'GET', url: TARGET_URL, proxy: proxyConfig() }, bridge),
			],
			[
				'executeLegacyRequest',
				async (bridge: SsrfBridge) =>
					await executeLegacyRequest(
						{ uri: TARGET_URL, proxy: proxyUrl() },
						bridge,
						mock<Logger>(),
					),
			],
		] as const;

		it.each(requestPaths)(
			'blocks %s when the policy denies the proxy host',
			async (_name, send) => {
				const error = new Error('The proxy host is not permitted by policy');

				await expect(send(bridgeDenying('localhost', error))).rejects.toBe(error);

				expect(proxyServer.captured).toEqual([]);
			},
		);

		it.each(requestPaths)('sends %s when the policy allows the proxy host', async (_name, send) => {
			const bridge = bridgeDenying('never-matches.invalid', new Error('unused'));

			expect(await send(bridge)).toBe('reached:proxied');

			expect(bridge.validateUrl).toHaveBeenCalledWith(
				expect.objectContaining({ hostname: 'localhost' }),
			);
		});

		it('reports the target URL denial before checking the proxy host', async () => {
			const targetError = new Error('The target host is not permitted by policy');
			const bridge = makeSsrfBridge({
				createSecureLookup: () => dns.lookup as unknown as LookupFunction,
				validateUrl: vi.fn(async (url: string | URL) => {
					const host = typeof url === 'string' ? new URL(url).hostname : url.hostname;
					return await Promise.resolve({
						ok: false as const,
						error: host === 'localhost' ? new Error('proxy denied') : targetError,
					});
				}),
			});

			await expect(
				httpRequest({ method: 'GET', url: TARGET_URL, proxy: proxyConfig() }, bridge),
			).rejects.toBe(targetError);
		});

		it('sends the request through the proxy when SSRF protection is disabled', async () => {
			const response = await httpRequest({
				method: 'GET',
				url: TARGET_URL,
				proxy: proxyConfig(),
			});

			expect(response).toBe('reached:proxied');
			expect(proxyServer.captured).toEqual([TARGET_URL]);
		});
	});

	describe('credential headers across redirects', () => {
		let origin: LocalServer;
		let crossOrigin: LocalServer;
		let received: Record<string, string | string[] | undefined> = {};

		const credentialHeaders = {
			Authorization: 'Bearer secret',
			'Proxy-Authorization': 'Basic proxy-secret',
			Cookie: 'session=secret',
			'X-Keep': 'keep-me',
		};

		beforeEach(async () => {
			received = {};
			crossOrigin = await startServer((req, res) => {
				received = req.headers;
				res.writeHead(200, { 'content-type': 'text/plain' });
				res.end('reached');
			});

			let originUrl = '';
			origin = await startServer((req, res) => {
				if (req.url === '/cross') {
					res.writeHead(302, { Location: `${crossOrigin.url}/dest` });
					res.end();
					return;
				}
				if (req.url === '/same') {
					res.writeHead(302, { Location: `${originUrl}/landing` });
					res.end();
					return;
				}
				received = req.headers;
				res.writeHead(200, { 'content-type': 'text/plain' });
				res.end('reached');
			});
			originUrl = origin.url;
		});

		afterEach(async () => {
			await Promise.all([origin.close(), crossOrigin.close()]);
		});

		it('drops Authorization, Proxy-Authorization, and Cookie on a cross-origin redirect', async () => {
			const { bridge } = makeBridge('/never-matches');

			await httpRequest(
				{
					method: 'GET',
					url: `${origin.url}/cross`,
					headers: { ...credentialHeaders },
					sendCredentialsOnCrossOriginRedirect: false,
				},
				bridge,
			);

			expect(received.authorization).toBeUndefined();
			expect(received['proxy-authorization']).toBeUndefined();
			expect(received.cookie).toBeUndefined();
			// Non-credential headers still carry over.
			expect(received['x-keep']).toBe('keep-me');
		});

		it('keeps credential headers on a same-origin redirect', async () => {
			const { bridge } = makeBridge('/never-matches');

			await httpRequest(
				{
					method: 'GET',
					url: `${origin.url}/same`,
					headers: { ...credentialHeaders },
					sendCredentialsOnCrossOriginRedirect: false,
				},
				bridge,
			);

			expect(received.authorization).toBe('Bearer secret');
			expect(received['proxy-authorization']).toBe('Basic proxy-secret');
			expect(received.cookie).toBe('session=secret');
		});

		it('keeps Proxy-Authorization cross-origin when credentials are explicitly allowed', async () => {
			const { bridge } = makeBridge('/never-matches');

			await httpRequest(
				{
					method: 'GET',
					url: `${origin.url}/cross`,
					headers: { ...credentialHeaders },
					sendCredentialsOnCrossOriginRedirect: true,
				},
				bridge,
			);

			expect(received['proxy-authorization']).toBe('Basic proxy-secret');
		});
	});
});
