import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { promisify } from 'node:util';
import { mock } from 'vitest-mock-extended';

import type { SsrfBridge, SsrfProtectionService } from '../../../ssrf';
import { OutboundHttpFactory } from '../factory';

// End-to-end redirect SSRF tests. Unlike `factory.test.ts` these do NOT mock
// undici's `fetch`, so the SSRF dispatcher interceptor actually runs. A real
// local server issues a redirect and we assert that the redirect target is
// validated — i.e. a 30x cannot smuggle the request past SSRF protection.

interface LocalServer {
	url: string;
	captured: string[];
	close: () => Promise<void>;
}

async function startRedirectServer(): Promise<LocalServer> {
	const captured: string[] = [];
	let port = 0;
	const server = http.createServer((req, res) => {
		captured.push(req.url ?? '');
		if (req.url === '/start') {
			res.writeHead(302, { Location: `http://127.0.0.1:${port}/internal` });
			res.end();
			return;
		}
		res.writeHead(200, { 'content-type': 'text/plain' });
		res.end(`reached:${req.url}`);
	});
	await new Promise<void>((resolve, reject) => {
		server.listen(0, '127.0.0.1', resolve);
		server.on('error', reject);
	});
	port = (server.address() as AddressInfo).port;
	return {
		url: `http://127.0.0.1:${port}`,
		captured,
		close: async () => await promisify(server.close.bind(server))(),
	};
}

/**
 * A bridge that allows every URL except those whose path contains `blockedPath`.
 * `validateUrl` resolves a `Result`, matching `SsrfProtectionService`.
 */
function makeBridge(blockedPath: string): SsrfBridge {
	const error = new Error(`SSRF: blocked ${blockedPath}`);
	return mock<SsrfBridge>({
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
