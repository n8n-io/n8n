import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../../ssrf';
import { makeSsrfBridge } from '../../../ssrf/__tests__/mock-ssrf-bridge';
import { type LocalServer, startServer } from '../../__tests__/local-server';
import { OutboundHttpFactory } from '../factory';

// End-to-end redirect SSRF tests. Unlike `factory.test.ts` these do NOT mock
// undici's `fetch`, so the SSRF dispatcher interceptor actually runs. A real
// local server issues a redirect and we assert that the redirect target is
// validated — i.e. a 30x cannot smuggle the request past SSRF protection.

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

/**
 * A bridge that allows every URL except those whose path contains `blockedPath`.
 * `validateUrl` resolves a `Result`, matching `SsrfProtectionService`.
 */
function makeBridge(blockedPath: string): SsrfBridge {
	const error = new Error(`SSRF: blocked ${blockedPath}`);
	return makeSsrfBridge({
		validateUrl: vi.fn(async (url: string | URL) => {
			const href = typeof url === 'string' ? url : url.href;
			return href.includes(blockedPath)
				? { ok: false as const, error }
				: { ok: true as const, result: undefined };
		}),
	});
}

function makeFactory(): OutboundHttpFactory {
	return new OutboundHttpFactory(mock<SsrfProtectionService>());
}

describe('asCustomFetch redirect SSRF', () => {
	let server: LocalServer;

	beforeEach(async () => {
		server = await startRedirectServer();
	});

	afterEach(async () => {
		await server.close();
	});

	it('blocks a redirect to a target that SSRF rejects, even though the initial URL is allowed', async () => {
		const bridge = makeBridge('/internal');
		const fetchFn = makeFactory().create({ ssrf: bridge, proxy: false }).asCustomFetch();

		await expect(fetchFn(`${server.url}/start`)).rejects.toThrow();

		// Initial hop validated and reached; redirect target validated and refused
		// before it could be dispatched, so the server never served `/internal`.
		expect(bridge.validateUrl).toHaveBeenCalledWith(`${server.url}/start`);
		expect(bridge.validateUrl).toHaveBeenCalledWith(`${server.url}/internal`);
		expect(server.captured).toContain('/start');
		expect(server.captured).not.toContain('/internal');
	});

	it('follows a redirect when every hop passes SSRF validation', async () => {
		const bridge = makeBridge('/never-matches');
		const fetchFn = makeFactory().create({ ssrf: bridge, proxy: false }).asCustomFetch();

		const res = await fetchFn(`${server.url}/start`);

		expect(res.status).toBe(200);
		await expect(res.text()).resolves.toBe('reached:/internal');
		expect(bridge.validateUrl).toHaveBeenCalledWith(`${server.url}/internal`);
		expect(server.captured).toEqual(['/start', '/internal']);
	});

	it('follows the redirect without validation when SSRF is disabled', async () => {
		const bridge = makeBridge('/internal');
		const fetchFn = makeFactory().create({ ssrf: 'disabled', proxy: false }).asCustomFetch();

		const res = await fetchFn(`${server.url}/start`);

		expect(res.status).toBe(200);
		await expect(res.text()).resolves.toBe('reached:/internal');
		expect(bridge.validateUrl).not.toHaveBeenCalled();
		expect(server.captured).toEqual(['/start', '/internal']);
	});

	it('does not enforce SSRF on the dispatcher returned by getDispatcher()', async () => {
		// getDispatcher() is documented to expose the bare dispatcher. Driving the
		// redirect through it directly must NOT trigger validation.
		const bridge = makeBridge('/internal');
		const client = makeFactory().create({ ssrf: bridge, proxy: false });
		const dispatcher = client.getDispatcher();

		const { fetch: undiciFetch } = await import('undici');
		const res = await undiciFetch(`${server.url}/start`, { dispatcher });

		expect(res.status).toBe(200);
		await expect(res.text()).resolves.toBe('reached:/internal');
		expect(bridge.validateUrl).not.toHaveBeenCalled();

		await dispatcher.close();
	});
});
