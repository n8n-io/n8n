import { createRefreshingAuthFetch } from 'src/utils/refreshing-auth-fetch';

const makeRedirect = (location: string): Response =>
	new Response(null, { status: 302, headers: { location } });

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

	it('forwards auth headers to a redirect after its URL is validated', async () => {
		const baseFetch = vi
			.fn()
			.mockResolvedValueOnce(makeRedirect('https://redirected.example/mcp'))
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
		expect(assertAllowedUrl).toHaveBeenLastCalledWith('https://redirected.example/mcp');
		expect(headers.get('authorization')).toBe('Bearer token');
		expect(headers.get('x-api-key')).toBe('secret');
		expect(headers.get('cookie')).toBe('session=secret');
		expect(headers.get('x-request')).toBe('value');
	});
});
