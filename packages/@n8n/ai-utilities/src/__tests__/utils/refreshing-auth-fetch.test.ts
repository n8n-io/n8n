import { createRefreshingAuthFetch } from 'src/utils/refreshing-auth-fetch';

describe('createRefreshingAuthFetch', () => {
	it('applies auth headers case-insensitively over caller headers', async () => {
		const baseFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response('ok'));
		const fetch = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { authorization: 'Bearer trusted' },
		});

		await fetch('https://example.test/mcp', {
			headers: { authorization: 'Bearer caller', 'x-custom': 'value' },
		});

		const headers = new Headers(baseFetch.mock.calls[0][1]?.headers);
		expect(headers.get('authorization')).toBe('Bearer trusted');
		expect(headers.get('x-custom')).toBe('value');
	});

	it('refreshes once across concurrent unauthorized requests', async () => {
		let authorized = false;
		const baseFetch = vi.fn<typeof fetch>(async (_input, init) => {
			const headers = new Headers(init?.headers);
			if (headers.get('authorization') === 'Bearer fresh') {
				authorized = true;
				return await Promise.resolve(new Response('ok'));
			}
			return await Promise.resolve(new Response('unauthorized', { status: 401 }));
		});
		const refreshHeaders = vi.fn(
			async () => await Promise.resolve({ authorization: 'Bearer fresh' }),
		);
		const fetch = createRefreshingAuthFetch({
			baseFetch,
			initialHeaders: { authorization: 'Bearer stale' },
			refreshHeaders,
		});

		const responses = await Promise.all([
			fetch('https://example.test/one'),
			fetch('https://example.test/two'),
		]);

		expect(authorized).toBe(true);
		expect(responses.map((response) => response.status)).toEqual([200, 200]);
		expect(refreshHeaders).toHaveBeenCalledOnce();
	});

	it('validates the initial URL and every redirect before sending', async () => {
		const baseFetch = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: 'https://blocked.test/mcp' },
				}),
			)
			.mockResolvedValue(new Response('ok'));
		const fetch = createRefreshingAuthFetch({
			baseFetch,
			assertAllowedUrl: (url) => {
				if (new URL(url).hostname !== 'allowed.test') throw new Error('blocked');
			},
		});

		await expect(fetch('https://allowed.test/mcp')).rejects.toThrow('blocked');
		expect(baseFetch).toHaveBeenCalledOnce();
	});
});
