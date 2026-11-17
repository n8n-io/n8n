/**
 * The network guard of the harnesses that run v1 node code: a request to a public host
 * fails before a DNS lookup and before a connection, through every client that a node uses.
 */
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import https from 'node:https';
import { createRequire } from 'node:module';
import net from 'node:net';
import { join } from 'node:path';

import { installNetworkGuard, isLoopback, networkGuard } from './no-network.ts';
import { FALLBACK_HOST_DIR } from './v1-recorder.ts';

// A reserved name (RFC 2606): it has no service, and the guard stops the request anyway.
const HOST = 'api.example.com';
const URL_ = `https://${HOST}/v1/models`;

installNetworkGuard();

/** A `require` that finds the packages of n8n, when they are built. */
function requireFrom(...names: string[]): NodeJS.Require | undefined {
	const base = join(FALLBACK_HOST_DIR, 'package.json');
	if (!existsSync(base)) return undefined;
	let require = createRequire(base);
	try {
		for (const name of names) require = createRequire(require.resolve(name));
		return require;
	} catch {
		return undefined;
	}
}

async function failure(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
	} catch (error) {
		const parts: string[] = [];
		let at: unknown = error;
		for (let depth = 0; depth < 5 && at instanceof Error; depth++) {
			parts.push(at.message);
			at = at.cause;
		}
		return parts.join(' | ');
	}
	return 'no failure';
}

describe('the network guard', () => {
	beforeEach(() => {
		networkGuard.blocked.length = 0;
		networkGuard.lookups = 0;
	});

	/**
	 * The request failed at the guard: at the socket (the guard keeps the host), or at the
	 * MockAgent of undici before any socket. No lookup reached the resolver.
	 */
	const blockedOnly = (message: string) => {
		expect(message).not.toBe('no failure');
		const atSocket = networkGuard.blocked.length > 0;
		const atMockAgent = message.includes('net.connect is not enabled for this origin');
		expect(atSocket || atMockAgent).toBe(true);
		expect(networkGuard.blocked.every((host) => host === HOST)).toBe(true);
		expect(networkGuard.lookups).toBe(0);
	};

	it('knows the loopback addresses', () => {
		for (const host of ['localhost', '127.0.0.1', '127.8.9.10', '::1', '::ffff:127.0.0.1']) {
			expect(isLoopback(host)).toBe(true);
		}
		for (const host of ['api.example.com', '10.0.0.1', '128.0.0.1', '127.0.0.1.example.com', '']) {
			expect(isLoopback(host)).toBe(false);
		}
	});

	it('stops the global fetch', async () => {
		blockedOnly(await failure(async () => await fetch(URL_, { method: 'POST', body: '{}' })));
	});

	it('stops https.request', async () => {
		const message = await failure(
			async () =>
				await new Promise((resolve, reject) => {
					const request = https.request(URL_, resolve);
					request.on('error', reject);
					request.end();
				}),
		);
		expect(message).toContain(HOST);
		blockedOnly(message);
	});

	it('stops a plain socket, with a clear error', () => {
		expect(() => net.connect(443, HOST)).toThrow(/tried to reach the network .*api\.example\.com/);
		expect(() => net.connect({ port: 443, host: '203.0.113.7' })).toThrow(/203\.0\.113\.7/);
	});

	const core = requireFrom('n8n-core');
	it.runIf(core !== undefined)('stops axios', async () => {
		const axios = core?.('axios') as { post(url: string, body: unknown): Promise<unknown> };
		blockedOnly(await failure(async () => await axios.post(URL_, {})));
	});

	const langchain = requireFrom('@n8n/n8n-nodes-langchain/package.json');
	it.runIf(langchain !== undefined)(
		'stops proxyFetch, which has its own undici dispatcher',
		async () => {
			const utilities = langchain?.('@n8n/ai-utilities') as {
				proxyFetch(options: {
					input: string;
					init?: unknown;
					egressFilter: unknown;
				}): Promise<unknown>;
			};
			const network = requireFrom('n8n-core')?.('@n8n/backend-network') as {
				passthroughEgressFilter: unknown;
			};
			const message = await failure(
				async () =>
					await utilities.proxyFetch({
						input: URL_,
						init: { method: 'POST', body: '{}' },
						egressFilter: network.passthroughEgressFilter,
					}),
			);
			// This client has its own dispatcher, so only the socket guard stops it.
			expect(networkGuard.blocked).toContain(HOST);
			blockedOnly(message);
		},
	);

	it('keeps loopback open', async () => {
		const server = createServer((_request, response) => response.end('ok'));
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		try {
			const address = server.address();
			const port = typeof address === 'object' && address !== null ? address.port : 0;
			const response = await fetch(`http://127.0.0.1:${port}/`);
			expect(await response.text()).toBe('ok');
			expect(networkGuard.blocked).toEqual([]);
		} finally {
			server.close();
		}
	});
});
