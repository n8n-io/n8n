import { afterEach, describe, expect, it, vi } from 'vitest';

import { SimulationServiceRemoteAdminClient } from '../remote-admin-client';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

function requestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.href;
	return input.url;
}

describe('SimulationServiceRemoteAdminClient', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('strips trailing slashes and recreates a tenant on 409 conflict', async () => {
		const calls: Array<{ url: string; method?: string }> = [];
		globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			calls.push({ url: requestUrl(input), method: init?.method });
			if (calls.length === 1) return jsonResponse({ error: 'exists' }, 409);
			return jsonResponse({ ok: true }, 200);
		}) as unknown as typeof fetch;

		const admin = new SimulationServiceRemoteAdminClient('http://127.0.0.1:9090///');
		await admin.createTenant('guard-chat-1');

		expect(calls).toEqual([
			{ url: 'http://127.0.0.1:9090/_sim/v1/tenants/guard-chat-1', method: 'PUT' },
			{ url: 'http://127.0.0.1:9090/_sim/v1/tenants/guard-chat-1', method: 'DELETE' },
			{ url: 'http://127.0.0.1:9090/_sim/v1/tenants/guard-chat-1', method: 'PUT' },
		]);
	});

	it('issues nested MCP credentials and throws UnexpectedError when the field is missing', async () => {
		globalThis.fetch = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({ credential: { data: { oauth: { access_token: 'tok-123' } } } }),
			)
			.mockResolvedValueOnce(jsonResponse({ credential: { data: {} } })) as unknown as typeof fetch;

		const admin = new SimulationServiceRemoteAdminClient('http://127.0.0.1:9090');
		await expect(
			admin.issueMcpCredential('t1', 'linear', 'mcp_oauth', 'oauth.access_token'),
		).resolves.toBe('tok-123');
		await expect(
			admin.issueMcpCredential('t1', 'linear', 'mcp_oauth', 'oauth.access_token'),
		).rejects.toThrow('gym credential has no oauth.access_token');
	});

	it('checks tenant existence and posts seed and event payloads', async () => {
		const calls: Array<{ url: string; method?: string; body?: string }> = [];
		globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = requestUrl(input);
			calls.push({ url, method: init?.method, body: init?.body as string });
			if (url.endsWith('/tenants')) {
				return jsonResponse({ tenants: [{ tenant: 'guard-a' }, { tenant: 'guard-b' }] });
			}
			return jsonResponse({ ok: true });
		}) as unknown as typeof fetch;

		const admin = new SimulationServiceRemoteAdminClient('http://127.0.0.1:9090');
		await admin.seed('guard-a', { world_version: 1 });
		await admin.event('guard-a', { kind: 'hydrated' });
		await expect(admin.tenantExists('guard-a')).resolves.toBe(true);
		await expect(admin.tenantExists('guard-missing')).resolves.toBe(false);

		expect(calls[0]).toEqual({
			url: 'http://127.0.0.1:9090/_sim/v1/tenants/guard-a/seed',
			method: 'POST',
			body: JSON.stringify({ world_version: 1 }),
		});
		expect(calls[1]).toEqual({
			url: 'http://127.0.0.1:9090/_sim/v1/tenants/guard-a/events',
			method: 'POST',
			body: JSON.stringify({ kind: 'hydrated' }),
		});
	});
});
