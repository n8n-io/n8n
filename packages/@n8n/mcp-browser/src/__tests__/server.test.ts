import type { AddressInfo } from 'node:net';

import { buildAllowedHosts, isAuthorized, startHttpTransport } from '../server';

type Started = Awaited<ReturnType<typeof startHttpTransport>>;

async function boot(authToken: string): Promise<{
	started: Started;
	baseUrl: string;
	close: () => Promise<void>;
}> {
	const started = await startHttpTransport({
		config: {},
		host: '127.0.0.1',
		port: 0,
		authToken,
	});
	const address = started.httpServer.address() as AddressInfo;
	return {
		started,
		baseUrl: `http://127.0.0.1:${address.port}`,
		close: async () => {
			await new Promise<void>((resolve) => started.httpServer.close(() => resolve()));
		},
	};
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
