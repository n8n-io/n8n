import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { buildAllowedHosts, isAuthorized, startHttpTransport } from '../server';

type Started = Awaited<ReturnType<typeof startHttpTransport>>;

/** Bind an ephemeral port, note it, release it. Sessions can only initialize on a concrete port:
 * `buildAllowedHosts` bakes the port into the allowed Host list, so booting on port 0 produces
 * `127.0.0.1:0` and the SDK's DNS-rebinding check then rejects the real Host header. */
async function freePort(): Promise<number> {
	const probe = createServer();
	await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', () => resolve()));
	const { port } = probe.address() as AddressInfo;
	await new Promise<void>((resolve) => probe.close(() => resolve()));
	return port;
}

async function boot(
	authToken: string,
	sessionOpts: { sessionIdleTtlMs?: number; sessionSweepIntervalMs?: number } = {},
): Promise<{
	started: Started;
	baseUrl: string;
	close: () => Promise<void>;
}> {
	// There is an unavoidable gap between releasing the probed port and re-binding it, so another
	// process can win the race. `startHttpTransport` now rejects on a failed bind rather than
	// hanging, which makes that losable race simply retryable here.
	let lastError: unknown;
	for (let attempt = 0; attempt < 5; attempt++) {
		const port = await freePort();
		try {
			const started = await startHttpTransport({
				config: {},
				host: '127.0.0.1',
				port,
				authToken,
				...sessionOpts,
			});
			return {
				started,
				baseUrl: `http://127.0.0.1:${port}`,
				close: async () => {
					await new Promise<void>((resolve) => started.httpServer.close(() => resolve()));
				},
			};
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
			lastError = error;
		}
	}
	throw lastError;
}

describe('isAuthorized', () => {
	const token = 'shared-secret';

	function reqWith(authorization?: string) {
		return { headers: authorization ? { authorization } : {} } as unknown as Parameters<
			typeof isAuthorized
		>[0];
	}

	it('accepts a matching bearer token', () => {
		expect(isAuthorized(reqWith(`Bearer ${token}`), token)).toBe(true);
	});

	it('is case-insensitive on the scheme', () => {
		expect(isAuthorized(reqWith(`bearer ${token}`), token)).toBe(true);
	});

	it('rejects a missing header', () => {
		expect(isAuthorized(reqWith(undefined), token)).toBe(false);
	});

	it('rejects a token that does not match', () => {
		expect(isAuthorized(reqWith('Bearer wrong-token'), token)).toBe(false);
	});

	it('rejects a non-bearer scheme', () => {
		expect(isAuthorized(reqWith(`Basic ${token}`), token)).toBe(false);
	});

	it('rejects a token of a different length', () => {
		expect(isAuthorized(reqWith('Bearer x'), token)).toBe(false);
	});
});

describe('HTTP transport', () => {
	const token = 'test-token-1234';
	let booted: Awaited<ReturnType<typeof boot>>;

	beforeEach(async () => {
		booted = await boot(token);
	});

	afterEach(async () => {
		await booted.close();
	});

	it('binds to loopback only', () => {
		const address = booted.started.httpServer.address() as AddressInfo;
		expect(address.address).toBe('127.0.0.1');
	});

	it('rejects unauthenticated requests with 401', async () => {
		const res = await fetch(`${booted.baseUrl}/mcp`, { method: 'POST', body: '{}' });

		expect(res.status).toBe(401);
		const body = (await res.json()) as { error: { message: string } };
		expect(body.error.message).toBe('Unauthorized');
	});

	it('rejects requests with a non-matching bearer token', async () => {
		const res = await fetch(`${booted.baseUrl}/mcp`, {
			method: 'POST',
			body: '{}',
			headers: { authorization: 'Bearer not-the-token' },
		});

		expect(res.status).toBe(401);
	});

	it('rejects requests with a browser Origin header', async () => {
		const res = await fetch(`${booted.baseUrl}/mcp`, {
			method: 'POST',
			body: '{}',
			headers: {
				origin: 'http://evil.example.com',
				authorization: `Bearer ${token}`,
			},
		});

		expect(res.status).toBe(403);
		const body = (await res.json()) as { error: { message: string } };
		expect(body.error.message).toBe('Origin not allowed');
	});

	it('does not advertise CORS or expose the session id header on rejected requests', async () => {
		const res = await fetch(`${booted.baseUrl}/mcp`, { method: 'POST', body: '{}' });

		expect(res.headers.get('access-control-allow-origin')).toBeNull();
		expect(res.headers.get('access-control-expose-headers')).toBeNull();
	});
});

describe('idle session eviction', () => {
	const token = 'test-token-1234';

	/** Opens a session and returns its id. Requires a real (non-ephemeral) port so the SDK's
	 * DNS-rebinding Host check passes and initialization actually completes. */
	async function openSession(baseUrl: string, id: number): Promise<string> {
		const res = await fetch(`${baseUrl}/mcp`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${token}`,
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id,
				method: 'initialize',
				params: {
					protocolVersion: '2025-06-18',
					capabilities: {},
					clientInfo: { name: 'test-client', version: '1.0.0' },
				},
			}),
		});
		const sessionId = res.headers.get('mcp-session-id');
		if (!sessionId) throw new Error(`initialize did not return a session id (status ${res.status})`);
		return sessionId;
	}

	/** A follow-up request on an existing session -- the path that refreshes its activity stamp. */
	async function pingSession(baseUrl: string, sessionId: string, id: number) {
		await fetch(`${baseUrl}/mcp`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${token}`,
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				'content-type': 'application/json',
				accept: 'application/json, text/event-stream',
				// eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
				'mcp-session-id': sessionId,
			},
			body: JSON.stringify({ jsonrpc: '2.0', id, method: 'ping' }),
		});
	}

	it('evicts sessions that go idle past the TTL, shutting down their browser connections', async () => {
		const booted = await boot(token, { sessionIdleTtlMs: 50, sessionSweepIntervalMs: 10 });
		try {
			for (let i = 0; i < 3; i++) await openSession(booted.baseUrl, i);
			expect(booted.started.activeConnections.size).toBe(3);

			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(booted.started.activeConnections.size).toBe(0);
		} finally {
			await booted.close();
		}
	});

	it('keeps a session alive while its client keeps making requests', async () => {
		const ttl = 100;
		const booted = await boot(token, { sessionIdleTtlMs: ttl, sessionSweepIntervalMs: 10 });
		try {
			const sessionId = await openSession(booted.baseUrl, 1);
			expect(booted.started.activeConnections.size).toBe(1);

			// Keep pinging for well over the TTL. Each ping must refresh the activity stamp,
			// so the session survives a span it would certainly have been evicted across
			// had it stayed idle.
			for (let i = 0; i < 6; i++) {
				await new Promise((resolve) => setTimeout(resolve, ttl / 2));
				await pingSession(booted.baseUrl, sessionId, 100 + i);
			}

			expect(booted.started.activeConnections.size).toBe(1);
		} finally {
			await booted.close();
		}
	});
});

describe('startHttpTransport bind failures', () => {
	it('rejects instead of hanging when the port is already taken', async () => {
		const port = await freePort();
		const squatter = createServer();
		await new Promise<void>((resolve) => squatter.listen(port, '127.0.0.1', () => resolve()));

		try {
			await expect(
				startHttpTransport({ config: {}, host: '127.0.0.1', port, authToken: 'token' }),
			).rejects.toMatchObject({ code: 'EADDRINUSE' });
		} finally {
			await new Promise<void>((resolve) => squatter.close(() => resolve()));
		}
	});
});

describe('buildAllowedHosts', () => {
	it('returns the full loopback alias set when bound to a loopback address', () => {
		const hosts = buildAllowedHosts('127.0.0.1', 3100);

		expect(hosts).toEqual(expect.arrayContaining(['127.0.0.1:3100', '::1:3100', 'localhost:3100']));
	});

	it('returns undefined for non-loopback binds so the SDK skips Host validation', () => {
		expect(buildAllowedHosts('0.0.0.0', 3100)).toBeUndefined();
		expect(buildAllowedHosts('192.168.1.10', 3100)).toBeUndefined();
	});
});
