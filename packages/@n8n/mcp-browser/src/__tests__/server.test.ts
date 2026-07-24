import { createServer } from 'node:net';
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

// A loopback bind turns on the SDK's DNS-rebinding protection, whose allowed-hosts
// list is derived from the bind port. The successful path therefore has to bind to a
// concrete port (not port 0) and reach it with a matching Host header — so reserve a
// free port up front rather than letting the OS pick one after allowedHosts is baked.
async function getFreePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const probe = createServer();
		probe.on('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const { port } = probe.address() as AddressInfo;
			probe.close(() => resolve(port));
		});
	});
}

function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw);
	} catch (error) {
		throw new Error(`Expected a JSON payload, got: ${raw}`, { cause: error });
	}
}

// The Streamable HTTP transport answers a POST with a one-off SSE frame
// (`data: <json-rpc>`), or plain JSON — accept either and return the JSON-RPC payload.
function extractJsonRpc(contentType: string | null, body: string): unknown {
	if ((contentType ?? '').includes('text/event-stream')) {
		const payloads = body
			.split('\n')
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice('data:'.length).trim());
		return parseJson(payloads[payloads.length - 1]);
	}
	return parseJson(body);
}

describe('MCP protocol handshake over HTTP transport', () => {
	const token = 'protocol-test-token';
	// The server negotiates the protocol version it will speak; propose the one this
	// pinned SDK settles on so initialize is accepted without a downgrade round-trip.
	const PROTOCOL_VERSION = '2025-11-25';

	let started: Started;
	let port: number;

	beforeEach(async () => {
		port = await getFreePort();
		started = await startHttpTransport({ config: {}, host: '127.0.0.1', port, authToken: token });
	});

	afterEach(async () => {
		// Mirror the production cleanup in server.ts: stop the listener, then drain any
		// browser connection spun up when a session initialized.
		const connections = [...started.activeConnections];
		started.activeConnections.clear();
		await new Promise<void>((resolve) => started.httpServer.close(() => resolve()));
		await Promise.allSettled(connections.map(async (c) => await c.shutdown()));
	});

	async function post(body: unknown, sessionId?: string): Promise<Response> {
		const headers = new Headers();
		headers.set('content-type', 'application/json');
		headers.set('accept', 'application/json, text/event-stream');
		headers.set('authorization', `Bearer ${token}`);
		if (sessionId) headers.set('mcp-session-id', sessionId);
		const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});
		return res;
	}

	async function rpcResult<T>(res: Response): Promise<T> {
		const parsed = extractJsonRpc(res.headers.get('content-type'), await res.text()) as {
			result: T;
		};
		return parsed.result;
	}

	it('completes an authenticated initialize + tools/list exchange', async () => {
		const initRes = await post({
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: {
				protocolVersion: PROTOCOL_VERSION,
				capabilities: {},
				clientInfo: { name: 'protocol-test', version: '0.0.0' },
			},
		});

		expect(initRes.status).toBe(200);
		const sessionId = initRes.headers.get('mcp-session-id');
		expect(sessionId).toBeTruthy();

		const initResult = await rpcResult<{
			protocolVersion: string;
			serverInfo: { name: string; version: string };
			capabilities: { tools?: unknown };
		}>(initRes);
		expect(initResult.serverInfo.name).toBe('n8n-browser');
		expect(typeof initResult.protocolVersion).toBe('string');
		expect(initResult.capabilities.tools).toBeDefined();

		const initializedRes = await post(
			{ jsonrpc: '2.0', method: 'notifications/initialized' },
			sessionId as string,
		);
		expect(initializedRes.status).toBe(202);
		await initializedRes.text();

		const listRes = await post(
			{ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
			sessionId as string,
		);
		expect(listRes.status).toBe(200);

		const { tools } = await rpcResult<{
			tools: Array<{ name: string; inputSchema?: { type?: string } }>;
		}>(listRes);
		const toolNames = tools.map((tool) => tool.name);
		expect(tools.length).toBeGreaterThan(0);
		expect(toolNames).toContain('browser_connect');
		expect(toolNames).toContain('browser_navigate');
		// Every registered tool carries a JSON Schema, so this also proves the
		// zod-v4 → Standard Schema bridge (asMcpSchema) survives serialization
		// through the real transport, not just in isolation.
		for (const tool of tools) {
			expect(tool.inputSchema?.type).toBe('object');
		}
	});

	it('returns 404 for a request that carries an unknown session id', async () => {
		const res = await post(
			{ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
			'00000000-0000-0000-0000-000000000000',
		);

		expect(res.status).toBe(404);
		const body = (await res.json()) as { error: { message: string } };
		expect(body.error.message).toBe('Session not found');
	});
});
