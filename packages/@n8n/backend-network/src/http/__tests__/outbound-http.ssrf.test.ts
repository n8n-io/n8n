import type { Logger } from '@n8n/backend-common';
import dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import type { Dispatcher } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import {
	makeDenyingLookup,
	makeSsrfBridge,
	useCleanProxyEnv,
} from '../../ssrf/__tests__/mock-ssrf-bridge';
import { type LocalServer, startServer } from '../local-server';
import { OutboundHttp } from '../outbound-http';
import { createSsrfInterceptor } from '../undici/transport';

// SSRF enforcement on the dispatch path lives in the dispatcher interceptor
// (an explicit proxy URI is additionally checked when the dispatcher is built).
// This file proves the interceptor at two levels:
//   (a) a direct unit test of `createSsrfInterceptor`, and
//   (b) end-to-end tests against a real local server (no mocked `fetch`), so the
//       interceptor actually runs and we assert that a 30x cannot smuggle a
//       request past SSRF protection — via both `asCustomFetch()` and the
//       dispatcher returned by `getDispatcher()`.

// Drain the microtask queue so the interceptor's async `validateUrl().then(...)`
// has settled before we assert.
const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

// The interceptor hands `validateUrl` a `URL` object (not a string), so we match
// on its `href` rather than comparing against a raw string.
const validatedUrl = (href: string) => expect.objectContaining({ href }) as unknown as URL;

// ---------------------------------------------------------------------------
// (a) createSsrfInterceptor — unit
// ---------------------------------------------------------------------------

function makeInterceptedDispatch(bridge: SsrfBridge) {
	const innerDispatch = vi.fn();
	const dispatch = createSsrfInterceptor(bridge)(
		innerDispatch as unknown as Dispatcher['dispatch'],
	);
	return { innerDispatch, dispatch };
}

function makeHandler() {
	return { onResponseError: vi.fn(), onError: vi.fn() } as unknown as Dispatcher.DispatchHandler & {
		onResponseError: ReturnType<typeof vi.fn>;
		onError: ReturnType<typeof vi.fn>;
	};
}

function makeOpts(path: string, origin?: string) {
	return { path, origin } as unknown as Dispatcher.DispatchOptions;
}

useCleanProxyEnv();

describe('createSsrfInterceptor', () => {
	it('validates the reconstructed target URL and dispatches when allowed', async () => {
		const bridge = makeSsrfBridge();
		const { innerDispatch, dispatch } = makeInterceptedDispatch(bridge);
		const handler = makeHandler();

		const ret = dispatch(makeOpts('/data', 'https://api.example.com'), handler);
		await flush();

		expect(ret).toBe(true);
		expect(bridge.validateUrl).toHaveBeenCalledWith(validatedUrl('https://api.example.com/data'));
		expect(innerDispatch).toHaveBeenCalledTimes(1);
		expect(handler.onResponseError).not.toHaveBeenCalled();
	});

	it('fails the dispatch and does not dispatch when SSRF rejects the target', async () => {
		const error = new Error('SSRF: blocked');
		const bridge = makeSsrfBridge({
			validateUrl: vi.fn().mockResolvedValue({ ok: false, error }),
		});
		const { innerDispatch, dispatch } = makeInterceptedDispatch(bridge);
		const handler = makeHandler();

		dispatch(makeOpts('/secret', 'http://10.0.0.1'), handler);
		await flush();

		expect(innerDispatch).not.toHaveBeenCalled();
		expect(handler.onResponseError).toHaveBeenCalledWith(null, error);
	});

	it('fails closed when the target URL cannot be derived', async () => {
		const bridge = makeSsrfBridge();
		const { innerDispatch, dispatch } = makeInterceptedDispatch(bridge);
		const handler = makeHandler();

		dispatch(makeOpts('not a url'), handler);
		await flush();

		expect(bridge.validateUrl).not.toHaveBeenCalled();
		expect(innerDispatch).not.toHaveBeenCalled();
		expect(handler.onResponseError).toHaveBeenCalledWith(null, expect.any(TypeError));
	});

	it('falls back to onError when onResponseError is unavailable', async () => {
		const error = new Error('SSRF: blocked');
		const bridge = makeSsrfBridge({
			validateUrl: vi.fn().mockResolvedValue({ ok: false, error }),
		});
		const { dispatch } = makeInterceptedDispatch(bridge);
		const handler = { onError: vi.fn() } as unknown as Dispatcher.DispatchHandler & {
			onError: ReturnType<typeof vi.fn>;
		};

		dispatch(makeOpts('/secret', 'http://10.0.0.1'), handler);
		await flush();

		expect(handler.onError).toHaveBeenCalledWith(error);
	});
});

// ---------------------------------------------------------------------------
// (b) end-to-end — real local server, real interceptor
// ---------------------------------------------------------------------------

async function startRedirectServer(): Promise<LocalServer> {
	let serverUrl = '';
	const server = await startServer((req, res) => {
		if (req.url === '/start') {
			res.writeHead(302, { Location: `${serverUrl}/internal` });
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
	const error = new Error(`SSRF: blocked ${blockedPath}`);
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

function makeTransport(options?: Parameters<OutboundHttp['transport']>[0]) {
	return new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()).transport(options);
}

// Walk the `cause` chain to the deepest error message. undici wraps a
// pre-dispatch failure as `TypeError: fetch failed` with the original error in
// `.cause`, so the SSRF reason lives down the chain.
function rootCauseMessage(error: unknown): string {
	let current = error;
	const seen = new Set<unknown>();
	while (
		current instanceof Error &&
		current.cause !== undefined &&
		current.cause !== null &&
		!seen.has(current)
	) {
		seen.add(current);
		current = current.cause;
	}
	return current instanceof Error ? current.message : String(current);
}

describe('SSRF end-to-end', () => {
	let server: LocalServer;

	beforeEach(async () => {
		server = await startRedirectServer();
	});

	afterEach(async () => {
		await server.close();
	});

	describe('asCustomFetch', () => {
		it('blocks the initial request when SSRF rejects its URL', async () => {
			const { bridge, error } = makeBridge('/start');
			const fetchFn = makeTransport({ ssrf: bridge, proxy: false }).asCustomFetch();

			const rejection = await fetchFn(`${server.url}/start`).catch((e: unknown) => e);

			expect(rejection).toBeInstanceOf(Error);
			expect(rootCauseMessage(rejection)).toBe(error.message);
			expect(bridge.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/start`));
			expect(server.captured).not.toContain('/start');
		});

		it('blocks a redirect to a target that SSRF rejects, even though the initial URL is allowed', async () => {
			const { bridge } = makeBridge('/internal');
			const fetchFn = makeTransport({ ssrf: bridge, proxy: false }).asCustomFetch();

			await expect(fetchFn(`${server.url}/start`)).rejects.toThrow();

			expect(bridge.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/start`));
			expect(bridge.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/internal`));
			expect(server.captured).toContain('/start');
			expect(server.captured).not.toContain('/internal');
		});

		it('follows a redirect when every hop passes SSRF validation', async () => {
			const { bridge } = makeBridge('/never-matches');
			const fetchFn = makeTransport({ ssrf: bridge, proxy: false }).asCustomFetch();

			const res = await fetchFn(`${server.url}/start`);

			expect(res.status).toBe(200);
			await expect(res.text()).resolves.toBe('reached:/internal');
			expect(server.captured).toEqual(['/start', '/internal']);
		});

		it('follows the redirect without validation when SSRF is disabled', async () => {
			const { bridge } = makeBridge('/internal');
			const fetchFn = makeTransport({ ssrf: 'disabled', proxy: false }).asCustomFetch();

			const res = await fetchFn(`${server.url}/start`);

			expect(res.status).toBe(200);
			await expect(res.text()).resolves.toBe('reached:/internal');
			expect(bridge.validateUrl).not.toHaveBeenCalled();
			expect(server.captured).toEqual(['/start', '/internal']);
		});
	});

	describe('getDispatcher', () => {
		it('enforces SSRF on the dispatcher: a redirect to a rejected target is blocked', async () => {
			const { bridge } = makeBridge('/internal');
			const client = makeTransport({ ssrf: bridge, proxy: false });
			const dispatcher = client.getDispatcher();

			const { fetch: undiciFetch } = await import('undici');
			await expect(undiciFetch(`${server.url}/start`, { dispatcher })).rejects.toThrow();

			expect(bridge.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/start`));
			expect(bridge.validateUrl).toHaveBeenCalledWith(validatedUrl(`${server.url}/internal`));
			expect(server.captured).toContain('/start');
			expect(server.captured).not.toContain('/internal');

			await dispatcher.close();
		});

		it('does not validate when SSRF is disabled (bare dispatcher)', async () => {
			const { bridge } = makeBridge('/internal');
			const client = makeTransport({ ssrf: 'disabled', proxy: false });
			const dispatcher = client.getDispatcher();

			const { fetch: undiciFetch } = await import('undici');
			const res = await undiciFetch(`${server.url}/start`, { dispatcher });

			expect(res.status).toBe(200);
			await expect(res.text()).resolves.toBe('reached:/internal');
			expect(bridge.validateUrl).not.toHaveBeenCalled();
			expect(server.captured).toEqual(['/start', '/internal']);

			await dispatcher.close();
		});
	});
});

// ---------------------------------------------------------------------------
// (c) connect-time secure lookup — DNS rebinding (TOCTOU) on the dispatcher path
// ---------------------------------------------------------------------------
//
// The interceptor validates the request URL pre-flight, but undici resolves the hostname again at connect time.
// A connect-time secure lookup pins the validated IP to the socket so the two resolutions cannot diverge (rebinding).

describe('connect-time secure lookup (DNS rebinding)', () => {
	it('routes direct hostname connections through the SSRF secure lookup', async () => {
		const server = await startServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'text/plain' });
			res.end('ok');
		});
		const lookupSpy = vi.fn((hostname: string, options: dns.LookupOptions, onResult: unknown) =>
			dns.lookup(hostname, options, onResult as never),
		);
		const bridge = makeSsrfBridge({
			createSecureLookup: () => lookupSpy as unknown as LookupFunction,
		});
		const { port } = new URL(server.url);
		const fetchFn = makeTransport({ ssrf: bridge, proxy: false }).asCustomFetch();

		try {
			const res = await fetchFn(`http://localhost:${port}/x`);

			expect(res.status).toBe(200);
			expect(lookupSpy).toHaveBeenCalledWith('localhost', expect.anything(), expect.anything());
		} finally {
			await server.close();
		}
	});

	it('rejects the connection when the secure lookup denies a rebound IP', async () => {
		// `validateUrl` (pre-flight) passes, but the connect-time lookup denies the
		// resolved IP — the connection must fail instead of reaching the target.
		const denied = new Error('blocked: restricted IP address');
		const lookup = ((_hostname: string, options: dns.LookupOptions, onResult: unknown) => {
			(onResult as (error: Error | null, address?: unknown, family?: number) => void)(
				denied,
				options.all ? [] : '',
				undefined,
			);
		}) as unknown as LookupFunction;
		const bridge = makeSsrfBridge({ createSecureLookup: () => lookup });
		const fetchFn = makeTransport({ ssrf: bridge, proxy: false }).asCustomFetch();

		await expect(fetchFn('http://rebind.example/')).rejects.toThrow();
	});

	it('resolves the proxy host through the secure lookup behind an explicit proxy', async () => {
		const denied = new Error('blocked: restricted IP address');
		const lookupSpy = makeDenyingLookup(denied);
		const bridge = makeSsrfBridge({ createSecureLookup: () => lookupSpy });
		const fetchFn = makeTransport({
			ssrf: bridge,
			proxy: 'http://proxy.internal:3128',
		}).asCustomFetch();

		const rejection = await fetchFn('http://target.invalid/x').catch((e: unknown) => e);

		expect(lookupSpy).toHaveBeenCalledWith('proxy.internal', expect.anything(), expect.anything());
		expect(rootCauseMessage(rejection)).toBe(denied.message);
	});
});

describe('proxy host validation', () => {
	const realLookup = () => dns.lookup as unknown as LookupFunction;

	function denyingBridge(error: Error) {
		return makeSsrfBridge({
			createSecureLookup: realLookup,
			validateConnectionHost: vi.fn().mockReturnValue({ ok: false, error }),
		});
	}

	function bridgeDenyingProxyHost(deniedHostname: string) {
		const error = new Error('The proxy host is not permitted by policy');
		const bridge = makeSsrfBridge({
			createSecureLookup: realLookup,
			validateUrl: vi.fn(async (url: string | URL) => {
				const hostname = typeof url === 'string' ? new URL(url).hostname : url.hostname;
				return await Promise.resolve(
					hostname === deniedHostname
						? { ok: false as const, error }
						: { ok: true as const, result: undefined },
				);
			}),
		});
		return { bridge, error };
	}

	it('rejects an explicit proxy host the policy denies', () => {
		const error = new Error('The proxy host is not permitted by policy');
		const bridge = denyingBridge(error);

		expect(() =>
			makeTransport({ ssrf: bridge, proxy: 'http://127.0.0.1:3128' }).getDispatcher(),
		).toThrow(error.message);
		expect(bridge.validateConnectionHost).toHaveBeenCalledWith('127.0.0.1');
	});

	it('surfaces the rejection of an explicit proxy host through fetch', async () => {
		const error = new Error('The proxy host is not permitted by policy');
		const fetchFn = makeTransport({
			ssrf: denyingBridge(error),
			proxy: 'http://127.0.0.1:3128',
		}).asCustomFetch();

		await expect(fetchFn('http://target.invalid/x')).rejects.toThrow(error.message);
	});

	// The environment's proxies describe the deployment, so the policy that decides
	// which targets a workflow may reach does not decide them.
	it.each([
		['HTTP_PROXY', 'http://target.invalid/x'],
		['HTTPS_PROXY', 'https://target.invalid/x'],
	] as const)('leaves a proxy configured through %s unchecked', async (envKey, target) => {
		process.env[envKey] = 'http://127.0.0.1:3128';
		const lookupSpy = makeDenyingLookup(new Error('blocked: restricted IP address'));
		const { bridge } = bridgeDenyingProxyHost('127.0.0.1');
		bridge.createSecureLookup = () => lookupSpy;
		const transport = makeTransport({ ssrf: bridge, proxy: 'env' });

		expect(() => transport.getDispatcher()).not.toThrow();
		await transport
			.asCustomFetch()(target)
			.catch(() => undefined);

		const validated = vi.mocked(bridge.validateUrl).mock.calls.map(([url]) => String(url));
		expect(validated).toEqual([target]);
		expect(bridge.validateConnectionHost).not.toHaveBeenCalled();
		expect(lookupSpy).not.toHaveBeenCalled();
	});

	it('leaves an explicit proxy unchecked when SSRF protection is disabled', () => {
		const bridge = denyingBridge(new Error('The proxy host is not permitted by policy'));

		expect(() =>
			makeTransport({ ssrf: 'disabled', proxy: 'http://127.0.0.1:3128' }).getDispatcher(),
		).not.toThrow();
		expect(bridge.validateConnectionHost).not.toHaveBeenCalled();
	});

	it('serves a target the environment exempts from the direct path', async () => {
		const server = await startServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'text/plain' });
			res.end('ok');
		});
		process.env.HTTP_PROXY = 'http://proxy.internal:3128';
		process.env.NO_PROXY = '127.0.0.1';
		const { bridge } = bridgeDenyingProxyHost('proxy.internal');
		const fetchFn = makeTransport({ ssrf: bridge, proxy: 'env' }).asCustomFetch();

		try {
			const res = await fetchFn(`${server.url}/x`);

			expect(res.status).toBe(200);
		} finally {
			await server.close();
		}
	});

	it('leaves the dispatcher untouched when no proxy is configured in the environment', () => {
		const bridge = makeSsrfBridge({ createSecureLookup: realLookup });

		expect(() => makeTransport({ ssrf: bridge, proxy: 'env' }).getDispatcher()).not.toThrow();
		expect(bridge.validateConnectionHost).not.toHaveBeenCalled();
	});
});
