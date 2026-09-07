import { createRefreshingAuthFetch } from 'src/utils/refreshing-auth-fetch';

const makeRedirect = (location: string): Response =>
	new Response(null, { status: 302, headers: { location } });

const makeUnauthorized = (): Response => new Response('unauthorized', { status: 401 });

const authorizationOf = (call: unknown[]): string | null =>
	new Headers((call[1] as RequestInit).headers).get('authorization');

describe('createRefreshingAuthFetch', () => {
	it('preserves Request state when no redirect validation is needed', async () => {
		const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
		const request = new Request('https://example.com/mcp', {
			method: 'POST',
			body: 'payload',
			headers: { 'X-Request': 'value' },
		});
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer token' },
		});

		await fetchWithAuth(request);

		const [input, init] = baseFetch.mock.calls[0] as [Request, RequestInit];
		expect(input).toBeInstanceOf(Request);
		expect(input.method).toBe('POST');
		expect(await input.text()).toBe('payload');
		const headers = new Headers(init.headers);
		expect(headers.get('x-request')).toBe('value');
		expect(headers.get('authorization')).toBe('Bearer token');
		expect(init.redirect).toBeUndefined();
	});

	it('forwards auth headers to a same-origin redirect after its URL is validated', async () => {
		const baseFetch = vi
			.fn()
			.mockResolvedValueOnce(makeRedirect('https://example.com/v2/mcp'))
			.mockResolvedValueOnce(new Response('ok'));
		const assertAllowedUrl = vi.fn();
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: {
				Authorization: 'Bearer token',
				'X-Api-Key': 'secret',
			},
			assertAllowedUrl,
		});

		await fetchWithAuth('https://example.com/mcp', {
			headers: {
				Cookie: 'session=secret',
				'X-Request': 'value',
			},
		});

		const [, secondInit] = baseFetch.mock.calls[1] as [URL, RequestInit];
		const headers = new Headers(secondInit.headers);
		expect(assertAllowedUrl).toHaveBeenLastCalledWith('https://example.com/v2/mcp');
		expect(headers.get('authorization')).toBe('Bearer token');
		expect(headers.get('x-api-key')).toBe('secret');
		expect(headers.get('cookie')).toBe('session=secret');
		expect(headers.get('x-request')).toBe('value');
	});

	it('withholds auth headers once a redirect crosses origins, even to a validated URL', async () => {
		const baseFetch = vi
			.fn()
			.mockResolvedValueOnce(makeRedirect('https://other.example/mcp'))
			.mockResolvedValueOnce(new Response('ok'));
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer token', 'X-Api-Key': 'secret' },
			assertAllowedUrl: vi.fn(),
		});

		await fetchWithAuth('https://example.com/mcp', {
			headers: { 'X-Request': 'value' },
		});

		const [, secondInit] = baseFetch.mock.calls[1] as [URL, RequestInit];
		const headers = new Headers(secondInit.headers);
		expect(headers.get('authorization')).toBeNull();
		expect(headers.get('x-api-key')).toBeNull();
		expect(headers.get('x-request')).toBe('value');
	});

	it('does not refresh on a 401 from a cross-origin redirect target', async () => {
		const baseFetch = vi
			.fn()
			.mockResolvedValueOnce(makeRedirect('https://other.example/mcp'))
			.mockResolvedValueOnce(makeUnauthorized());
		const refreshHeaders = vi.fn();
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer token' },
			refreshHeaders,
			assertAllowedUrl: vi.fn(),
		});

		const response = await fetchWithAuth('https://example.com/mcp');

		expect(response.status).toBe(401);
		expect(refreshHeaders).not.toHaveBeenCalled();
		expect(baseFetch).toHaveBeenCalledTimes(2);
	});

	describe('401 handling', () => {
		it('refreshes the token and retries the request once', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValueOnce(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
			});

			const response = await fetchWithAuth('https://example.com/mcp');

			expect(response.status).toBe(200);
			expect(baseFetch).toHaveBeenCalledTimes(2);
			expect(authorizationOf(baseFetch.mock.calls[0])).toBe('Bearer stale');
			expect(authorizationOf(baseFetch.mock.calls[1])).toBe('Bearer fresh');
		});

		it('hands the current auth headers to refreshHeaders', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValueOnce(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale', 'X-Api-Key': 'secret' },
				refreshHeaders,
			});

			await fetchWithAuth('https://example.com/mcp');

			const [current] = refreshHeaders.mock.calls[0] as [Headers];
			expect(current.get('authorization')).toBe('Bearer stale');
			expect(current.get('x-api-key')).toBe('secret');
		});

		it('reuses the refreshed token on later requests without refreshing again', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValue(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
			});

			await fetchWithAuth('https://example.com/mcp');
			await fetchWithAuth('https://example.com/mcp');

			expect(refreshHeaders).toHaveBeenCalledTimes(1);
			expect(authorizationOf(baseFetch.mock.calls[2])).toBe('Bearer fresh');
		});

		it('refreshes once when two in-flight requests are both unauthorized', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValue(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
			});

			const responses = await Promise.all([
				fetchWithAuth('https://example.com/mcp'),
				fetchWithAuth('https://example.com/mcp'),
			]);

			expect(responses.map(({ status }) => status)).toEqual([200, 200]);
			expect(refreshHeaders).toHaveBeenCalledTimes(1);
			expect(authorizationOf(baseFetch.mock.calls[2])).toBe('Bearer fresh');
			expect(authorizationOf(baseFetch.mock.calls[3])).toBe('Bearer fresh');
		});

		it('returns the 401 without retrying when the refresh fails', async () => {
			const baseFetch = vi.fn().mockResolvedValue(makeUnauthorized());
			const refreshHeaders = vi.fn().mockResolvedValue(null);
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
			});

			const response = await fetchWithAuth('https://example.com/mcp');

			expect(response.status).toBe(401);
			expect(baseFetch).toHaveBeenCalledTimes(1);
		});

		it('retries at most once when the refreshed token is also rejected', async () => {
			const baseFetch = vi.fn().mockResolvedValue(makeUnauthorized());
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
			});

			const response = await fetchWithAuth('https://example.com/mcp');

			expect(response.status).toBe(401);
			expect(baseFetch).toHaveBeenCalledTimes(2);
			expect(refreshHeaders).toHaveBeenCalledTimes(1);
		});

		it('returns the 401 unchanged when no refreshHeaders is configured', async () => {
			const baseFetch = vi.fn().mockResolvedValue(makeUnauthorized());
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
			});

			const response = await fetchWithAuth('https://example.com/mcp');

			expect(response.status).toBe(401);
			expect(baseFetch).toHaveBeenCalledTimes(1);
		});

		it('retries with the refreshed token on a redirect-validated request', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeRedirect('https://example.com/v2/mcp'))
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValueOnce(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const assertAllowedUrl = vi.fn();
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				assertAllowedUrl,
			});

			const response = await fetchWithAuth('https://example.com/mcp');

			expect(response.status).toBe(200);
			expect(authorizationOf(baseFetch.mock.calls[1])).toBe('Bearer stale');
			expect(authorizationOf(baseFetch.mock.calls[2])).toBe('Bearer fresh');
			expect(assertAllowedUrl.mock.calls.map((call) => call[0])).toEqual([
				'https://example.com/mcp',
				'https://example.com/v2/mcp',
			]);
		});
	});

	describe('proactive refresh', () => {
		it('refreshes before sending a request when the token is close to expiry', async () => {
			const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
			let refreshDue = true;
			const refreshHeaders = vi.fn().mockImplementation(async () => {
				refreshDue = false;
				return { Authorization: 'Bearer fresh' };
			});
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				shouldRefresh: () => refreshDue,
			});

			const response = await fetchWithAuth('https://example.com/mcp');

			expect(response.status).toBe(200);
			expect(refreshHeaders).toHaveBeenCalledTimes(1);
			expect(baseFetch).toHaveBeenCalledTimes(1);
			expect(authorizationOf(baseFetch.mock.calls[0])).toBe('Bearer fresh');
		});

		it('shares one proactive refresh between concurrent requests', async () => {
			const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
			let finishRefresh: ((headers: HeadersInit) => void) | undefined;
			const refreshHeaders = vi.fn().mockImplementation(
				async () =>
					await new Promise<HeadersInit>((resolve) => {
						finishRefresh = resolve;
					}),
			);
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				shouldRefresh: () => true,
			});

			const requests = [
				fetchWithAuth('https://example.com/first'),
				fetchWithAuth('https://example.com/second'),
			];
			await vi.waitFor(() => expect(refreshHeaders).toHaveBeenCalledTimes(1));
			finishRefresh?.({ Authorization: 'Bearer fresh' });
			await Promise.all(requests);

			expect(refreshHeaders).toHaveBeenCalledTimes(1);
			expect(baseFetch).toHaveBeenCalledTimes(2);
			expect(baseFetch.mock.calls.map(authorizationOf)).toEqual(['Bearer fresh', 'Bearer fresh']);
		});
	});
});
