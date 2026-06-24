import type { Logger } from '@n8n/backend-common';
import type { Dispatcher } from 'undici';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../ssrf';
import { makeSsrfBridge } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { type LocalServer, startServer } from '../local-server';
import { OutboundHttp } from '../outbound-http';
import { createAuthorizationInterceptor, type RequestAuthorizer } from '../undici/transport';

// The authorization gate is a dispatcher interceptor, like the SSRF one. This
// file proves it at two levels:
//   (a) a direct unit test of `createAuthorizationInterceptor`, and
//   (b) end-to-end tests against a real local server (no mocked `fetch`), so the
//       interceptor actually runs on the initial request and every redirect hop,
//       and we assert the SSRF policy runs *before* the authorizer.

// Drain the microtask queue so the interceptor's async `authorize().then(...)`
// has settled before we assert.
const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

// The interceptor hands the authorizer a `URL` object (not a string), so we match
// on its `href` rather than comparing against a raw string.
const authorizedUrl = (href: string) => expect.objectContaining({ href }) as unknown as URL;

// ---------------------------------------------------------------------------
// (a) createAuthorizationInterceptor — unit
// ---------------------------------------------------------------------------

function makeInterceptedDispatch(authorize: RequestAuthorizer) {
	const innerDispatch = vi.fn();
	const dispatch = createAuthorizationInterceptor(authorize)(
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

describe('createAuthorizationInterceptor', () => {
	it('authorizes the reconstructed target URL and dispatches when allowed', async () => {
		const authorize = vi.fn<RequestAuthorizer>().mockResolvedValue(undefined);
		const { innerDispatch, dispatch } = makeInterceptedDispatch(authorize);
		const handler = makeHandler();

		const ret = dispatch(makeOpts('/data', 'https://api.example.com'), handler);
		await flush();

		expect(ret).toBe(true);
		expect(authorize).toHaveBeenCalledWith(authorizedUrl('https://api.example.com/data'));
		expect(innerDispatch).toHaveBeenCalledTimes(1);
		expect(handler.onResponseError).not.toHaveBeenCalled();
	});

	it('fails the dispatch and does not dispatch when the authorizer throws', async () => {
		const error = new Error('domain not approved');
		const authorize = vi.fn<RequestAuthorizer>().mockRejectedValue(error);
		const { innerDispatch, dispatch } = makeInterceptedDispatch(authorize);
		const handler = makeHandler();

		dispatch(makeOpts('/secret', 'https://blocked.example.com'), handler);
		await flush();

		expect(innerDispatch).not.toHaveBeenCalled();
		expect(handler.onResponseError).toHaveBeenCalledWith(null, error);
	});

	it('fails closed when the target URL cannot be derived', async () => {
		const authorize = vi.fn<RequestAuthorizer>().mockResolvedValue(undefined);
		const { innerDispatch, dispatch } = makeInterceptedDispatch(authorize);
		const handler = makeHandler();

		dispatch(makeOpts('not a url'), handler);
		await flush();

		expect(authorize).not.toHaveBeenCalled();
		expect(innerDispatch).not.toHaveBeenCalled();
		expect(handler.onResponseError).toHaveBeenCalled();
	});

	it('falls back to onError when onResponseError is unavailable', async () => {
		const error = new Error('domain not approved');
		const authorize = vi.fn<RequestAuthorizer>().mockRejectedValue(error);
		const { dispatch } = makeInterceptedDispatch(authorize);
		const handler = { onError: vi.fn() } as unknown as Dispatcher.DispatchHandler & {
			onError: ReturnType<typeof vi.fn>;
		};

		dispatch(makeOpts('/secret', 'https://blocked.example.com'), handler);
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

function makeTransport(options?: Parameters<OutboundHttp['transport']>[0]) {
	return new OutboundHttp(mock<SsrfProtectionService>(), mock<Logger>()).transport(options);
}

// Walk the `cause` chain to the deepest error message: undici wraps a
// pre-dispatch failure as `TypeError: fetch failed` with the original error in
// `.cause`, so the authorizer's reason lives down the chain.
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

describe('authorization end-to-end', () => {
	let server: LocalServer;

	beforeEach(async () => {
		server = await startRedirectServer();
	});

	afterEach(async () => {
		await server.close();
	});

	it('authorizes the initial request and every redirect hop before fetching it', async () => {
		const authorize = vi.fn<RequestAuthorizer>().mockResolvedValue(undefined);
		const fetchFn = makeTransport({ ssrf: 'disabled', proxy: false, authorize }).asCustomFetch();

		const res = await fetchFn(`${server.url}/start`);

		expect(res.status).toBe(200);
		await expect(res.text()).resolves.toBe('reached:/internal');
		expect(authorize).toHaveBeenCalledWith(authorizedUrl(`${server.url}/start`));
		expect(authorize).toHaveBeenCalledWith(authorizedUrl(`${server.url}/internal`));
		expect(server.captured).toEqual(['/start', '/internal']);
	});

	it('blocks a redirect hop the authorizer rejects, even though the initial URL is allowed', async () => {
		const error = new Error('redirect target not approved');
		const authorize = vi.fn<RequestAuthorizer>(async (url) => {
			if (url.href.includes('/internal')) throw error;
		});
		const fetchFn = makeTransport({ ssrf: 'disabled', proxy: false, authorize }).asCustomFetch();

		const rejection = await fetchFn(`${server.url}/start`).catch((e: unknown) => e);

		expect(rejection).toBeInstanceOf(Error);
		expect(rootCauseMessage(rejection)).toBe(error.message);
		expect(server.captured).toContain('/start');
		expect(server.captured).not.toContain('/internal');
	});

	it('runs the SSRF policy before the authorizer: an SSRF-blocked hop is never authorized', async () => {
		const ssrfError = new Error('SSRF: blocked /internal');
		const bridge: SsrfBridge = makeSsrfBridge({
			validateUrl: vi.fn(async (url: string | URL) => {
				const href = typeof url === 'string' ? url : url.href;
				return href.includes('/internal')
					? { ok: false as const, error: ssrfError }
					: { ok: true as const, result: undefined };
			}),
		});
		const authorize = vi.fn<RequestAuthorizer>().mockResolvedValue(undefined);
		const fetchFn = makeTransport({ ssrf: bridge, proxy: false, authorize }).asCustomFetch();

		await expect(fetchFn(`${server.url}/start`)).rejects.toThrow();

		// The initial hop passed SSRF, so it was authorized; the redirect target was
		// SSRF-blocked first, so the authorizer was never consulted for it.
		expect(authorize).toHaveBeenCalledWith(authorizedUrl(`${server.url}/start`));
		expect(authorize).not.toHaveBeenCalledWith(authorizedUrl(`${server.url}/internal`));
		expect(server.captured).not.toContain('/internal');
	});
});
