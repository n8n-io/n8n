import { searxngSearch } from '../searxng-search';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
	mockFetch.mockReset();
});

const MOCK_SEARXNG_RESPONSE = {
	results: [
		{
			title: 'Stripe Webhooks',
			url: 'https://stripe.com/docs/webhooks',
			content: 'Listen for events on your Stripe account.',
			publishedDate: '2025-12-01',
		},
		{
			title: 'Webhook Endpoints API',
			url: 'https://stripe.com/docs/api/webhook_endpoints',
			content: 'Create and manage webhook endpoints.',
		},
	],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searxngSearch', () => {
	it('sends correct request to SearXNG', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => MOCK_SEARXNG_RESPONSE,
		});

		await searxngSearch('http://searxng:8080', 'stripe webhooks', {});

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('http://searxng:8080/search');
		expect(url).toContain('q=stripe+webhooks');
		expect(url).toContain('format=json');
		expect(url).toContain('pageno=1');
		expect(init.headers).toEqual(
			expect.objectContaining({
				Accept: 'application/json',
			}),
		);
		// No auth header — SearXNG requires none
		expect(init.headers).not.toHaveProperty('X-Subscription-Token');
		expect(init.headers).not.toHaveProperty('Authorization');
	});

	it('maps response correctly (content → snippet, optional publishedDate)', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => MOCK_SEARXNG_RESPONSE,
		});

		const result = await searxngSearch('http://searxng:8080', 'stripe webhooks', {});

		expect(result.query).toBe('stripe webhooks');
		expect(result.results).toHaveLength(2);
		expect(result.results[0]).toEqual({
			title: 'Stripe Webhooks',
			url: 'https://stripe.com/docs/webhooks',
			snippet: 'Listen for events on your Stripe account.',
			publishedDate: '2025-12-01',
		});
		expect(result.results[1]).toEqual({
			title: 'Webhook Endpoints API',
			url: 'https://stripe.com/docs/api/webhook_endpoints',
			snippet: 'Create and manage webhook endpoints.',
		});
	});

	it('slices results to maxResults', async () => {
		const manyResults = {
			results: Array.from({ length: 20 }, (_, i) => ({
				title: `Result ${i}`,
				url: `https://example.com/${i}`,
				content: `Content ${i}`,
			})),
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => manyResults,
		});

		const result = await searxngSearch('http://searxng:8080', 'test', { maxResults: 3 });

		expect(result.results).toHaveLength(3);
		expect(result.results[0].title).toBe('Result 0');
		expect(result.results[2].title).toBe('Result 2');
	});

	it('adds site: operators for includeDomains', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ results: [] }),
		});

		await searxngSearch('http://searxng:8080', 'webhooks', {
			includeDomains: ['docs.stripe.com', 'stripe.com'],
		});

		const [url] = mockFetch.mock.calls[0] as [string];
		const parsed = new URL(url);
		const q = parsed.searchParams.get('q')!;
		expect(q).toBe('webhooks (site:docs.stripe.com OR site:stripe.com)');
	});

	it('adds -site: operators for excludeDomains', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ results: [] }),
		});

		await searxngSearch('http://searxng:8080', 'webhooks', {
			excludeDomains: ['reddit.com'],
		});

		const [url] = mockFetch.mock.calls[0] as [string];
		const parsed = new URL(url);
		const q = parsed.searchParams.get('q')!;
		expect(q).toBe('webhooks -site:reddit.com');
	});

	it('throws on non-OK response', async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 503,
			statusText: 'Service Unavailable',
		});

		await expect(searxngSearch('http://searxng:8080', 'test', {})).rejects.toThrow(
			'SearXNG search failed: 503 Service Unavailable',
		);
	});

	it('handles empty results gracefully', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ results: [] }),
		});

		const result = await searxngSearch('http://searxng:8080', 'nonexistent query', {});

		expect(result.query).toBe('nonexistent query');
		expect(result.results).toHaveLength(0);
	});

	it('handles missing results field gracefully', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({}),
		});

		const result = await searxngSearch('http://searxng:8080', 'test', {});

		expect(result.results).toHaveLength(0);
	});

	it('normalizes trailing slash in base URL', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ results: [] }),
		});

		await searxngSearch('http://searxng:8080/', 'test', {});

		const [url] = mockFetch.mock.calls[0] as [string];
		expect(url).toContain('http://searxng:8080/search');
		expect(url).not.toContain('http://searxng:8080//search');
	});

	it('defaults to 5 results when maxResults is not specified', async () => {
		const manyResults = {
			results: Array.from({ length: 10 }, (_, i) => ({
				title: `Result ${i}`,
				url: `https://example.com/${i}`,
				content: `Content ${i}`,
			})),
		};

		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => manyResults,
		});

		const result = await searxngSearch('http://searxng:8080', 'test', {});

		expect(result.results).toHaveLength(5);
	});
});
