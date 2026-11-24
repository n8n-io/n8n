import { OperationalError } from '@n8n/errors';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GymAdmin } from '../gym-admin';

type Call = { url: string; init: RequestInit };

function stubFetch(answers: Array<{ status: number; body?: unknown }>) {
	const calls: Call[] = [];
	const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		const next = answers.shift() ?? { status: 200, body: {} };
		return new Response(JSON.stringify(next.body ?? {}), { status: next.status });
	});
	vi.stubGlobal('fetch', fetchMock);
	return calls;
}

const header = (call: Call, name: string) => new Headers(call.init.headers).get(name);

describe('GymAdmin', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('sends the harness bearer on admin calls when it has one', async () => {
		const calls = stubFetch([{ status: 200 }]);
		await new GymAdmin('http://gym:9090/', 'harness-1').seed('t1', {});
		expect(calls[0].url).toBe('http://gym:9090/_sim/v1/tenants/t1/seed');
		expect(header(calls[0], 'authorization')).toBe('Bearer harness-1');
	});

	it('sends no authorization header without a harness token', async () => {
		const calls = stubFetch([{ status: 200 }]);
		await new GymAdmin('http://gym:9090').seed('t1', {});
		expect(header(calls[0], 'authorization')).toBeNull();
	});

	it('creates a tenant with a random admin token', async () => {
		const calls = stubFetch([{ status: 200 }, { status: 200 }]);
		const admin = new GymAdmin('http://gym');
		await admin.createTenant('t1');
		await admin.createTenant('t2');

		const tokens = calls.map(
			(c) => (JSON.parse(String(c.init.body)) as { admin_token: string }).admin_token,
		);
		expect(tokens[0]).toMatch(/^guard-t1-[0-9a-f-]{36}-admin$/);
		expect(tokens[1]).not.toBe(tokens[0].replace('t1', 't2'));
	});

	it('deletes and creates the tenant again when it exists from an earlier run', async () => {
		const calls = stubFetch([{ status: 409 }, { status: 200 }, { status: 200 }]);
		await new GymAdmin('http://gym').createTenant('t1');
		expect(calls.map((c) => `${c.init.method} ${c.url}`)).toEqual([
			'PUT http://gym/_sim/v1/tenants/t1',
			'DELETE http://gym/_sim/v1/tenants/t1',
			'PUT http://gym/_sim/v1/tenants/t1',
		]);
	});

	it('does not retry other tenant failures', async () => {
		stubFetch([{ status: 500 }]);
		await expect(new GymAdmin('http://gym').createTenant('t1')).rejects.toThrow(OperationalError);
	});

	it('returns the bearer at the nested field of an issued credential', async () => {
		stubFetch([{ status: 200, body: { credential: { data: { oauth: { token: 'tok-1' } } } } }]);
		await expect(
			new GymAdmin('http://gym').issueMcpCredential('t1', 'linear', 'linearApi', 'oauth.token'),
		).resolves.toBe('tok-1');
	});

	it('fails when the credential has no such field', async () => {
		stubFetch([{ status: 200, body: { credential: { data: {} } } }]);
		await expect(
			new GymAdmin('http://gym').issueMcpCredential('t1', 'linear', 'linearApi', 'token'),
		).rejects.toThrow('gym credential has no token');
	});

	it('says which gym is unreachable without the request body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					await Promise.reject(new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') })),
			),
		);
		await expect(new GymAdmin('http://gym').seed('t1', { secret: 'x' })).rejects.toThrow(
			'gym POST http://gym/_sim/v1/tenants/t1/seed unreachable: ECONNREFUSED',
		);
	});

	it('finds a tenant in the tenant list', async () => {
		stubFetch([
			{ status: 200, body: { tenants: [{ tenant: 't1' }] } },
			{ status: 200, body: {} },
		]);
		const admin = new GymAdmin('http://gym');
		await expect(admin.tenantExists('t1')).resolves.toBe(true);
		await expect(admin.tenantExists('t1')).resolves.toBe(false);
	});
});
