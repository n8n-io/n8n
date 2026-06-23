import type { Logger } from '@n8n/backend-common';
import dns from 'node:dns';
import type { LookupFunction } from 'node:net';
import type { Dispatcher } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import { makeLookupFn, makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { type LocalServer, startServer } from '../local-server';
import { OutboundHttp } from '../outbound-http';
import { createSsrfInterceptor } from '../undici/transport';

// SSRF enforcement lives in a single place: the dispatcher interceptor.
// This file proves it at two levels:
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
		expect(handler.onResponseError).toHaveBeenCalled();
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
			return href.includes(blockedPath)
				? { ok: false as const, error }
				: { ok: true as const, result: undefined };
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

	it('does not derive a connect-time lookup behind an explicit proxy', () => {
		const createSecureLookup = vi.fn(makeLookupFn);
		const bridge = makeSsrfBridge({ createSecureLookup });

		// Forces the lazy dispatcher to build. The proxy resolves the target, so
		// the secure lookup must not be consulted on our side.
		makeTransport({ ssrf: bridge, proxy: 'http://proxy.invalid:3128' }).getDispatcher();

		expect(createSecureLookup).not.toHaveBeenCalled();
	});
});
