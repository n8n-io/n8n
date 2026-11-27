import { OperationalError, UnexpectedError } from '@n8n/errors';

import { GymAdmin } from '../gym-admin';

const reply = (status: number, body: unknown) =>
	new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('GymAdmin', () => {
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => vi.unstubAllGlobals());

	it('should not double the slash when the base URL ends with one', async () => {
		fetchMock.mockImplementation(async () => reply(200, {}));
		await new GymAdmin('http://gym:9090/').seed('t1', { a: 1 });
		expect(fetchMock.mock.calls[0][0]).toBe('http://gym:9090/_sim/v1/tenants/t1/seed');
	});

	it('should post a seed and an event to the tenant', async () => {
		fetchMock.mockImplementation(async () => reply(200, {}));
		const admin = new GymAdmin('http://gym:9090');
		await admin.seed('t1', { a: 1 });
		await admin.event('t1', { type: 'append_blocks' });
		expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
			['http://gym:9090/_sim/v1/tenants/t1/seed', 'POST'],
			['http://gym:9090/_sim/v1/tenants/t1/events', 'POST'],
		]);
		expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ type: 'append_blocks' }));
	});

	it('should delete and create a tenant that exists already', async () => {
		fetchMock
			.mockResolvedValueOnce(reply(409, 'exists'))
			.mockResolvedValueOnce(reply(200, {}))
			.mockResolvedValueOnce(reply(200, {}));
		await new GymAdmin('http://gym:9090').createTenant('t1');
		expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual(['PUT', 'DELETE', 'PUT']);
	});

	it('should throw an OperationalError when the gym answers with an error', async () => {
		fetchMock.mockImplementation(async () => reply(500, 'boom'));
		await expect(new GymAdmin('http://gym:9090').seed('t1', {})).rejects.toBeInstanceOf(
			OperationalError,
		);
	});

	it('should throw an OperationalError when the gym is unreachable', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));
		await expect(new GymAdmin('http://gym:9090').seed('t1', {})).rejects.toBeInstanceOf(
			OperationalError,
		);
	});

	it('should read the bearer from the field of the credential', async () => {
		fetchMock.mockImplementation(async () =>
			reply(200, { credential: { data: { access_token: 'tok' } } }),
		);
		const token = await new GymAdmin('http://gym:9090').issueMcpCredential(
			't1',
			'linear',
			'mcp_oauth',
			'access_token',
		);
		expect(token).toBe('tok');
	});

	it('should throw an UnexpectedError when the credential has no bearer', async () => {
		fetchMock.mockImplementation(async () => reply(200, { credential: { data: {} } }));
		await expect(
			new GymAdmin('http://gym:9090').issueMcpCredential(
				't1',
				'linear',
				'mcp_oauth',
				'access_token',
			),
		).rejects.toBeInstanceOf(UnexpectedError);
	});

	it('should tell if a tenant exists', async () => {
		fetchMock.mockImplementation(async (url) =>
			String(url).endsWith('/t1') ? reply(200, {}) : reply(404, { error: 'tenant_not_found' }),
		);
		const admin = new GymAdmin('http://gym:9090');
		expect(await admin.tenantExists('t1')).toBe(true);
		expect(await admin.tenantExists('t2')).toBe(false);
		expect(fetchMock.mock.calls[0][0]).toBe('http://gym:9090/_sim/v1/tenants/t1');
	});

	it('should rethrow when the gym fails while it looks up a tenant', async () => {
		fetchMock.mockImplementation(async () => reply(500, 'boom'));
		await expect(new GymAdmin('http://gym:9090').tenantExists('t1')).rejects.toBeInstanceOf(
			OperationalError,
		);
	});
});
