<<<<<<< HEAD
=======
import type { CustomFetch } from '@n8n/backend-network';
import { UserError } from 'n8n-workflow';

>>>>>>> a4bc50f9 (chore: Bundle/2.x (#32896))
import { createAuthFetch } from '@/utils/auth-fetch';

const proxyFetchMock = jest.fn();
jest.mock('@n8n/ai-utilities', () => ({
	proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

function makeOk(): Response {
	return new Response('ok', { status: 200 });
}

function make401(): Response {
	return new Response('unauthorized', { status: 401 });
}

function makeRedirect(location: string): Response {
	return new Response(null, { status: 302, headers: { location } });
}

describe('createAuthFetch', () => {
	beforeEach(() => {
		proxyFetchMock.mockReset();
	});

	it('routes through proxyFetch and injects the initial headers', async () => {
		proxyFetchMock.mockResolvedValueOnce(makeOk());

		const fetchFn = createAuthFetch({ initialHeaders: { Authorization: 'Bearer A' } });
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
		const [, init] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		expect(init.headers).toMatchObject({ Authorization: 'Bearer A' });
	});

	it('returns 401 unchanged when no onUnauthorized handler is configured', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401());

		const fetchFn = createAuthFetch({ initialHeaders: { Authorization: 'Bearer A' } });
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(401);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
	});

	it('returns the original 401 when onUnauthorized returns null', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401());

		const onUnauthorized = jest.fn().mockResolvedValue(null);
		const fetchFn = createAuthFetch({
			initialHeaders: { Authorization: 'Bearer A' },
			onUnauthorized,
		});
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(401);
		expect(onUnauthorized).toHaveBeenCalledTimes(1);
		expect(proxyFetchMock).toHaveBeenCalledTimes(1);
	});

	it('retries once with refreshed headers when onUnauthorized returns new headers', async () => {
		proxyFetchMock.mockResolvedValueOnce(make401()).mockResolvedValueOnce(makeOk());

		const onUnauthorized = jest.fn().mockResolvedValue({ Authorization: 'Bearer B' });
		const fetchFn = createAuthFetch({
			initialHeaders: { Authorization: 'Bearer A' },
			onUnauthorized,
		});
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(proxyFetchMock).toHaveBeenCalledTimes(2);
		const [, init2] = proxyFetchMock.mock.calls[1] as [unknown, RequestInit];
		expect(init2.headers).toMatchObject({ Authorization: 'Bearer B' });
	});
});

describe('createAuthFetch — header merging', () => {
	beforeEach(() => {
		proxyFetchMock.mockReset();
		proxyFetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
	});

	it('merges caller-supplied init.headers with auth headers (auth takes precedence)', async () => {
		const fetchFn = createAuthFetch({ initialHeaders: { Authorization: 'Bearer A' } });
		await fetchFn('https://example.test/mcp', { headers: { 'X-Custom': 'value' } });

		const [, init] = proxyFetchMock.mock.calls[0] as [unknown, RequestInit];
		expect(init.headers).toMatchObject({
			'X-Custom': 'value',
			Authorization: 'Bearer A',
		});
	});

	it('uses the refreshed headers on the second call after a successful 401 refresh', async () => {
		proxyFetchMock
			.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
			.mockResolvedValueOnce(new Response('ok', { status: 200 }))
			.mockResolvedValueOnce(new Response('ok', { status: 200 }));

		let callCount = 0;
		const onUnauthorized = jest.fn().mockImplementation(async () => {
			callCount++;
			return { Authorization: `Bearer refreshed-${callCount}` };
		});

		const fetchFn = createAuthFetch({
			initialHeaders: { Authorization: 'Bearer stale' },
			onUnauthorized,
		});

		// First call triggers a 401 → refresh → retry
		await fetchFn('https://example.test/mcp');

		// Second call should use the refreshed headers without triggering another refresh
		await fetchFn('https://example.test/mcp');

		expect(onUnauthorized).toHaveBeenCalledTimes(1);
		const [, thirdInit] = proxyFetchMock.mock.calls[2] as [unknown, RequestInit];
		expect((thirdInit.headers as Record<string, string>).Authorization).toBe('Bearer refreshed-1');
	});
});

describe('createAuthFetch — allowedDomains', () => {
	beforeEach(() => {
		baseFetchMock.mockReset();
	});

	it('does not wrap with redirect validation when allowedDomains is not set', async () => {
		baseFetchMock.mockResolvedValueOnce(makeOk());

		const fetchFn = createAuthFetch({ baseFetch, initialHeaders: {} });
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(baseFetchMock).toHaveBeenCalledTimes(1);
	});

	it('allows requests to domains on the allowlist', async () => {
		baseFetchMock.mockResolvedValueOnce(makeOk());

		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'domains', domains: 'example.test' },
		});
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
	});

	it('blocks requests to domains not on the allowlist', async () => {
		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'domains', domains: 'example.test' },
		});

		await expect(fetchFn('https://evil.test/mcp')).rejects.toThrow(UserError);
		expect(baseFetchMock).not.toHaveBeenCalled();
	});

	it('blocks redirect hops to disallowed domains', async () => {
		baseFetchMock.mockResolvedValueOnce(makeRedirect('https://evil.test/exfiltrate'));

		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'domains', domains: 'example.test' },
		});

		await expect(fetchFn('https://example.test/mcp')).rejects.toThrow(UserError);
	});

	it('follows redirect hops to allowed domains', async () => {
		baseFetchMock
			.mockResolvedValueOnce(makeRedirect('https://example.test/v2'))
			.mockResolvedValueOnce(makeOk());

		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'domains', domains: 'example.test' },
		});
		const res = await fetchFn('https://example.test/mcp');

		expect(res.status).toBe(200);
		expect(baseFetchMock).toHaveBeenCalledTimes(2);
	});

	it('blocks all requests when mode is none', async () => {
		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'none' },
		});

		await expect(fetchFn('https://example.test/mcp')).rejects.toThrow(UserError);
		expect(baseFetchMock).not.toHaveBeenCalled();
	});

	it('blocks requests when domain mode has an empty allowlist', async () => {
		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'domains', domains: '' },
		});

		await expect(fetchFn('https://example.test/mcp')).rejects.toThrow(UserError);
		expect(baseFetchMock).not.toHaveBeenCalled();
	});

	it('blocks requests when domain mode has a whitespace-only allowlist', async () => {
		const fetchFn = createAuthFetch({
			baseFetch,
			initialHeaders: {},
			allowedDomains: { mode: 'domains', domains: '    ' },
		});

		await expect(fetchFn('https://example.test/mcp')).rejects.toThrow(UserError);
		expect(baseFetchMock).not.toHaveBeenCalled();
	});
});
