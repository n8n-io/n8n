import type { MockedFunction } from 'vitest';

import { fetchFollowingRedirects } from 'src/utils/follow-redirects';

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const makeResponse = (status: number, headers: Record<string, string> = {}, body = ''): Response =>
	new Response(body, { status, headers });

const makeRedirect = (status: number, location: string): Response =>
	makeResponse(status, { location });

const mockFetcher = (): MockedFunction<Fetcher> => vi.fn();

describe('fetchFollowingRedirects', () => {
	it('returns the response unchanged when there are no redirects', async () => {
		const fetcher = mockFetcher().mockResolvedValue(makeResponse(200, {}, 'ok'));

		const response = await fetchFollowingRedirects(fetcher, 'https://example.com');

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('ok');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it("forwards `redirect: 'manual'` to the inner fetcher on every hop", async () => {
		// Use 307 so the method is preserved and the assertion stays focused on `redirect`.
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(307, 'https://example.com/next'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com', { method: 'POST' });

		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(fetcher).toHaveBeenNthCalledWith(
			1,
			'https://example.com',
			expect.objectContaining({ redirect: 'manual', method: 'POST' }),
		);
		// Hop 2 receives a URL object derived from the Location header.
		const [hop2Input, hop2Init] = fetcher.mock.calls[1];
		expect(hop2Input).toBeInstanceOf(URL);
		expect((hop2Input as URL).href).toBe('https://example.com/next');
		expect(hop2Init).toEqual(expect.objectContaining({ redirect: 'manual', method: 'POST' }));
	});

	it('invokes onBeforeHop with the resolved absolute URL for every hop', async () => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(302, '/relative'))
			.mockResolvedValueOnce(makeResponse(200));
		const onBeforeHop = vi.fn();

		await fetchFollowingRedirects(fetcher, 'https://example.com/start', undefined, {
			onBeforeHop,
		});

		expect(onBeforeHop).toHaveBeenCalledTimes(2);
		expect(onBeforeHop).toHaveBeenNthCalledWith(1, 'https://example.com/start', {
			crossedOrigin: false,
		});
		expect(onBeforeHop).toHaveBeenNthCalledWith(2, 'https://example.com/relative', {
			crossedOrigin: false,
		});
	});

	it('treats crossedOrigin as permanent, even when the chain returns to the original origin', async () => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(307, 'https://other.example.com/away'))
			.mockResolvedValueOnce(makeRedirect(307, 'https://example.com/back'))
			.mockResolvedValueOnce(makeResponse(200));
		const onBeforeHop = vi.fn();

		await fetchFollowingRedirects(
			fetcher,
			'https://example.com',
			{ headers: { authorization: 'Bearer secret' } },
			{ onBeforeHop },
		);

		expect(onBeforeHop.mock.calls.map((call) => call[1])).toEqual([
			{ crossedOrigin: false },
			{ crossedOrigin: true },
			{ crossedOrigin: true },
		]);
		// Credential headers stripped on the cross-origin hop are not restored either
		const hop3Headers = new Headers((fetcher.mock.calls[2][1] as RequestInit).headers);
		expect(hop3Headers.get('authorization')).toBeNull();
	});

	it('aborts the chain when onBeforeHop throws', async () => {
		const fetcher = mockFetcher().mockResolvedValueOnce(
			makeRedirect(302, 'https://attacker.example'),
		);
		const onBeforeHop = vi.fn((url: string) => {
			if (url.includes('attacker')) throw new Error('blocked');
		});

		await expect(
			fetchFollowingRedirects(fetcher, 'https://example.com', undefined, { onBeforeHop }),
		).rejects.toThrow('blocked');

		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('resolves relative Location headers against the current URL', async () => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(301, '/path/two'))
			.mockResolvedValueOnce(makeRedirect(301, '../three'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com/path/one');

		expect((fetcher.mock.calls[1][0] as URL).href).toBe('https://example.com/path/two');
		expect((fetcher.mock.calls[2][0] as URL).href).toBe('https://example.com/three');
	});

	it('switches the method to GET on a 303 redirect', async () => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(303, 'https://example.com/done'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com', {
			method: 'POST',
			body: 'payload',
		});

		expect((fetcher.mock.calls[1][0] as URL).href).toBe('https://example.com/done');
		expect(fetcher.mock.calls[1][1]).toEqual(
			expect.objectContaining({ method: 'GET', body: undefined }),
		);
	});

	it.each([301, 302])('switches the method to GET on a %s redirect with POST', async (status) => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(status, 'https://example.com/done'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com', {
			method: 'POST',
			body: 'payload',
		});

		expect((fetcher.mock.calls[1][0] as URL).href).toBe('https://example.com/done');
		expect(fetcher.mock.calls[1][1]).toEqual(
			expect.objectContaining({ method: 'GET', body: undefined }),
		);
	});

	it.each([301, 302])('preserves method and body on a %s redirect with GET', async (status) => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(status, 'https://example.com/done'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com', { method: 'GET' });

		expect(fetcher.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'GET' }));
	});

	it.each([307, 308])('preserves the original method and body on a %s redirect', async (status) => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(status, 'https://example.com/done'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com', {
			method: 'POST',
			body: 'payload',
		});

		expect((fetcher.mock.calls[1][0] as URL).href).toBe('https://example.com/done');
		expect(fetcher.mock.calls[1][1]).toEqual(
			expect.objectContaining({ method: 'POST', body: 'payload' }),
		);
	});

	it('strips credential headers when a redirect crosses origins', async () => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(307, 'https://other.example.com/target'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com', {
			headers: {
				authorization: 'Bearer secret',
				cookie: 'session=abc',
				'proxy-authorization': 'Basic xyz',
				'content-type': 'application/json',
			},
		});

		const hop2Headers = new Headers((fetcher.mock.calls[1][1] as RequestInit).headers);
		expect(hop2Headers.get('authorization')).toBeNull();
		expect(hop2Headers.get('cookie')).toBeNull();
		expect(hop2Headers.get('proxy-authorization')).toBeNull();
		expect(hop2Headers.get('content-type')).toBe('application/json');
	});

	it('keeps credential headers on a same-origin redirect', async () => {
		const fetcher = mockFetcher()
			.mockResolvedValueOnce(makeRedirect(307, '/moved'))
			.mockResolvedValueOnce(makeResponse(200));

		await fetchFollowingRedirects(fetcher, 'https://example.com/start', {
			headers: { authorization: 'Bearer secret' },
		});

		const hop2Headers = new Headers((fetcher.mock.calls[1][1] as RequestInit).headers);
		expect(hop2Headers.get('authorization')).toBe('Bearer secret');
	});

	it('preserves a URL input object on the first hop', async () => {
		const fetcher = mockFetcher().mockResolvedValue(makeResponse(200));
		const url = new URL('https://example.com');

		await fetchFollowingRedirects(fetcher, url);

		expect(fetcher.mock.calls[0][0]).toBe(url);
	});

	it('returns the 30x response when the Location header is missing', async () => {
		const fetcher = mockFetcher().mockResolvedValueOnce(makeResponse(302, {}));

		const response = await fetchFollowingRedirects(fetcher, 'https://example.com');

		expect(response.status).toBe(302);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('throws when redirects exceed the maximum', async () => {
		const fetcher = mockFetcher().mockResolvedValue(makeRedirect(302, 'https://example.com/loop'));

		await expect(
			fetchFollowingRedirects(fetcher, 'https://example.com', undefined, { maxRedirects: 3 }),
		).rejects.toThrow('Too many redirects (max 3)');
		expect(fetcher).toHaveBeenCalledTimes(4); // initial + 3 redirects
	});

	it('uses the default max-redirects (20) when not specified', async () => {
		const fetcher = mockFetcher().mockResolvedValue(makeRedirect(302, 'https://example.com/loop'));

		await expect(fetchFollowingRedirects(fetcher, 'https://example.com')).rejects.toThrow(
			'Too many redirects (max 20)',
		);
	});

	it('awaits an async onBeforeHop before issuing the next request', async () => {
		const order: string[] = [];
		const fetcher = mockFetcher()
			.mockImplementationOnce(async () => {
				order.push('fetch1');
				await Promise.resolve();
				return makeRedirect(302, 'https://example.com/next');
			})
			.mockImplementationOnce(async () => {
				order.push('fetch2');
				await Promise.resolve();
				return makeResponse(200);
			});

		await fetchFollowingRedirects(fetcher, 'https://example.com', undefined, {
			onBeforeHop: (url) => {
				order.push(`hop:${url}`);
			},
		});

		expect(order).toEqual([
			'hop:https://example.com',
			'fetch1',
			'hop:https://example.com/next',
			'fetch2',
		]);
	});
});
