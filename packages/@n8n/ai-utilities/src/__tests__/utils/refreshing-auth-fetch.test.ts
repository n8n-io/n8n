import { createRefreshingAuthFetch } from 'src/utils/refreshing-auth-fetch';

const makeRedirect = (location: string): Response =>
	new Response(null, { status: 302, headers: { location } });

const makeUnauthorized = (): Response => new Response('unauthorized', { status: 401 });

const authorizationOf = (call: unknown[]): string | null =>
	new Headers((call[1] as RequestInit).headers).get('authorization');

describe('createRefreshingAuthFetch', () => {
	it('preserves Request state when no redirect validation is configured', async () => {
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

		// The Request is unwrapped to a URL plus init, because the redirect loop
		// needs a URL it can advance
		const [input, init] = baseFetch.mock.calls[0] as [string, RequestInit];
		expect(input).toBe('https://example.com/mcp');
		expect(init.method).toBe('POST');
		expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('payload');
		const headers = new Headers(init.headers);
		expect(headers.get('x-request')).toBe('value');
		expect(headers.get('authorization')).toBe('Bearer token');
		// Hops are followed here, not by the platform, so credentials can be
		// withheld once one crosses origins
		expect(init.redirect).toBe('manual');
	});

	it('carries the rest of a Request past the unwrap to a URL', async () => {
		const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
		const request = new Request('https://example.com/mcp', {
			method: 'POST',
			body: 'payload',
			cache: 'no-store',
			credentials: 'include',
			integrity: 'sha256-abc',
			referrerPolicy: 'no-referrer',
		});
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer token' },
		});

		await fetchWithAuth(request);

		const [, init] = baseFetch.mock.calls[0] as [string, RequestInit];
		expect(init.cache).toBe('no-store');
		expect(init.credentials).toBe('include');
		expect(init.integrity).toBe('sha256-abc');
		expect(init.referrerPolicy).toBe('no-referrer');
	});

	it('keeps a Request value when init passes that option as undefined', async () => {
		const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
		const request = new Request('https://example.com/mcp', {
			method: 'POST',
			body: 'payload',
			integrity: 'sha256-abc',
		});
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer token' },
		});

		await fetchWithAuth(request, { method: undefined, integrity: undefined });

		const [, init] = baseFetch.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('POST');
		expect(init.integrity).toBe('sha256-abc');
	});

	describe('a caller that handles redirects itself', () => {
		it('returns the redirect unfollowed when the caller asked for manual', async () => {
			const baseFetch = vi.fn().mockResolvedValue(makeRedirect('https://example.com/v2/mcp'));
			const assertAllowedUrl = vi.fn();
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer token' },
				assertAllowedUrl,
			});

			const response = await fetchWithAuth('https://example.com/mcp', { redirect: 'manual' });

			expect(response.status).toBe(302);
			expect(baseFetch).toHaveBeenCalledTimes(1);
			// The start URL is still validated, even with the hop loop skipped
			expect(assertAllowedUrl).toHaveBeenCalledWith('https://example.com/mcp');
		});

		it('leaves the caller redirect mode on the request', async () => {
			const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer token' },
			});

			await fetchWithAuth('https://example.com/mcp', { redirect: 'error' });

			const [, init] = baseFetch.mock.calls[0] as [string, RequestInit];
			expect(init.redirect).toBe('error');
		});

		it('still injects and refreshes auth on the single request', async () => {
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

			const response = await fetchWithAuth('https://example.com/mcp', { redirect: 'manual' });

			expect(response.status).toBe(200);
			expect(baseFetch.mock.calls.map(authorizationOf)).toEqual(['Bearer stale', 'Bearer fresh']);
		});
	});

	it('withholds auth headers on a cross-origin redirect with no URL validation configured', async () => {
		const baseFetch = vi
			.fn()
			.mockResolvedValueOnce(makeRedirect('https://elsewhere.example/mcp'))
			.mockResolvedValueOnce(new Response('ok'));
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer token' },
		});

		await fetchWithAuth('https://example.com/mcp');

		expect(authorizationOf(baseFetch.mock.calls[0])).toBe('Bearer token');
		expect(authorizationOf(baseFetch.mock.calls[1])).toBeNull();
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

		it('keeps non-auth headers when refreshHeaders returns only the new authorization', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValueOnce(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale', 'User-Agent': 'partner-agent' },
				refreshHeaders,
			});

			await fetchWithAuth('https://example.com/mcp');

			const retried = new Headers((baseFetch.mock.calls[1][1] as RequestInit).headers);
			expect(retried.get('authorization')).toBe('Bearer fresh');
			expect(retried.get('user-agent')).toBe('partner-agent');
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

	describe('a provider that signals expiry with something other than 401', () => {
		const makeForbidden = (body = 'forbidden'): Response => new Response(body, { status: 403 });

		it('refreshes and retries once on the configured status', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeForbidden())
				.mockResolvedValueOnce(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				expiredStatus: 403,
			});

			const response = await fetchWithAuth('https://example.com/chat');

			expect(response.status).toBe(200);
			expect(refreshHeaders).toHaveBeenCalledTimes(1);
			expect(authorizationOf(baseFetch.mock.calls[0])).toBe('Bearer stale');
			expect(authorizationOf(baseFetch.mock.calls[1])).toBe('Bearer fresh');
		});

		it('leaves the default 401 alone once a status is configured', async () => {
			const baseFetch = vi.fn().mockResolvedValue(makeUnauthorized());
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				expiredStatus: 403,
			});

			const response = await fetchWithAuth('https://example.com/chat');

			expect(response.status).toBe(401);
			expect(refreshHeaders).not.toHaveBeenCalled();
			expect(baseFetch).toHaveBeenCalledTimes(1);
		});

		it('matches every status in a list', async () => {
			const baseFetch = vi
				.fn()
				.mockResolvedValueOnce(makeUnauthorized())
				.mockResolvedValueOnce(new Response('ok'))
				.mockResolvedValueOnce(makeForbidden())
				.mockResolvedValueOnce(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				expiredStatus: [401, 403],
			});

			await expect(fetchWithAuth('https://example.com/chat')).resolves.toMatchObject({
				status: 200,
			});
			await expect(fetchWithAuth('https://example.com/chat')).resolves.toMatchObject({
				status: 200,
			});
			expect(refreshHeaders).toHaveBeenCalledTimes(2);
		});

		it('still spends a refresh on a rejection the status cannot distinguish', async () => {
			// A 403 also covers "no permission on this resource". Nothing in the
			// response separates the two, so the cost of that ambiguity is one token
			// exchange plus one replay, and the caller gets the original rejection.
			const baseFetch = vi.fn().mockImplementation(async () => makeForbidden('PERMISSION_DENIED'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				expiredStatus: 403,
			});

			const response = await fetchWithAuth('https://example.com/chat');

			expect(response.status).toBe(403);
			await expect(response.text()).resolves.toBe('PERMISSION_DENIED');
			expect(refreshHeaders).toHaveBeenCalledTimes(1);
			expect(baseFetch).toHaveBeenCalledTimes(2);
		});

		it('ignores a status that cannot mean expiry, so a success is never replayed', async () => {
			const baseFetch = vi.fn().mockResolvedValue(new Response('ok'));
			const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
			const fetchWithAuth = createRefreshingAuthFetch({
				baseFetch,
				initialHeaders: { Authorization: 'Bearer stale' },
				refreshHeaders,
				expiredStatus: 200,
			});

			const response = await fetchWithAuth('https://example.com/chat');

			expect(response.status).toBe(200);
			expect(refreshHeaders).not.toHaveBeenCalled();
			expect(baseFetch).toHaveBeenCalledTimes(1);
		});
	});

	it('picks up a refresh a sibling request already ran', async () => {
		// The stale token is always rejected, so any request that still sends it
		// costs a round trip
		const baseFetch = vi.fn().mockImplementation(async (_input, init: RequestInit) => {
			const auth = new Headers(init.headers).get('authorization');
			return auth === 'Bearer stale' ? makeUnauthorized() : new Response('ok');
		});
		const refreshHeaders = vi.fn().mockResolvedValue({ Authorization: 'Bearer fresh' });
		// No `resolveHeaders`, so the shared slot has to be read at send time. The
		// staggered park lets the second request enter while the token is stale but
		// send only after the first request refreshed it.
		const parks = [1, 20];
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer stale' },
			refreshHeaders,
			assertAllowedUrl: async () => {
				await new Promise((resolve) => setTimeout(resolve, parks.shift() ?? 0));
			},
		});

		await Promise.all([
			fetchWithAuth('https://example.com/mcp'),
			fetchWithAuth('https://example.com/mcp'),
		]);

		expect(refreshHeaders).toHaveBeenCalledTimes(1);
		// Only the request that discovered the expiry should ever send the stale one
		const staleSends = baseFetch.mock.calls.filter(
			(call) => authorizationOf(call) === 'Bearer stale',
		);
		expect(staleSends).toHaveLength(1);
	});

	it('releases the rejected body when the refresh itself throws', async () => {
		const rejected = makeUnauthorized();
		const cancel = vi.spyOn(rejected.body as ReadableStream, 'cancel');
		const baseFetch = vi.fn().mockResolvedValue(rejected);
		const dead = new Error('credential needs to be reconnected');
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { Authorization: 'Bearer stale' },
			refreshHeaders: async () => {
				throw dead;
			},
		});

		await expect(fetchWithAuth('https://example.com/mcp')).rejects.toBe(dead);
		expect(cancel).toHaveBeenCalled();
	});

	it('keeps per-request resolved headers off other in-flight requests', async () => {
		const seen: Array<string | null> = [];
		const baseFetch = vi.fn().mockImplementation(async (_input, init: RequestInit) => {
			seen.push(new Headers(init.headers).get('authorization'));
			return new Response('ok');
		});
		const tokens = ['Bearer first', 'Bearer second'];
		const fetchWithAuth = createRefreshingAuthFetch({
			baseFetch,
			resolveHeaders: async () => ({ Authorization: tokens.shift() as string }),
			// Parks each request after it resolved its own headers but before it
			// sends them, so the second resolution lands in between. A shared header
			// slot would serve the second request's token on the first one.
			assertAllowedUrl: async () => {
				await new Promise((resolve) => setTimeout(resolve, 5));
			},
		});

		await Promise.all([
			fetchWithAuth('https://example.com/chat'),
			fetchWithAuth('https://example.com/chat'),
		]);

		expect(seen).toEqual(['Bearer first', 'Bearer second']);
	});
});
