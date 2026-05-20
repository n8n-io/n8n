import { braveSearch } from '../brave-search';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
	mockFetch.mockReset();
});

const MOCK_BRAVE_RESPONSE = {
	web: {
		results: [
			{
				title: 'Stripe Webhooks',
				url: 'https://stripe.com/docs/webhooks',
				description: 'Listen for events on your Stripe account.',
				age: '3 days ago',
			},
			{
				title: 'Webhook Endpoints API',
				url: 'https://stripe.com/docs/api/webhook_endpoints',
				description: 'Create and manage webhook endpoints.',
			},
		],
	},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('braveSearch', () => {
	it('sends correct request to Brave API', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => MOCK_BRAVE_RESPONSE,
		});

		await braveSearch('BSA-test-key', 'stripe webhooks', {});

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('https://api.search.brave.com/res/v1/web/search');
		expect(url).toContain('q=stripe+webhooks');
		expect(url).toContain('count=5');
		expect(init.headers).toEqual(
			expect.objectContaining({
				'X-Subscription-Token': 'BSA-test-key',
			}),
		);
	});

	it('maps response correctly', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => MOCK_BRAVE_RESPONSE,
		});

		const result = await braveSearch('BSA-test-key', 'stripe webhooks', {});

		expect(result.query).toBe('stripe webhooks');
		expect(result.results).toHaveLength(2);
		expect(result.results[0]).toEqual({
			title: 'Stripe Webhooks',
			url: 'https://stripe.com/docs/webhooks',
			snippet: 'Listen for events on your Stripe account.',
			publishedDate: '3 days ago',
		});
		expect(result.results[1]).toEqual({
			title: 'Webhook Endpoints API',
			url: 'https://stripe.com/docs/api/webhook_endpoints',
			snippet: 'Create and manage webhook endpoints.',
		});
	});

	it('passes maxResults as count parameter', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ web: { results: [] } }),
		});

		await braveSearch('BSA-key', 'test', { maxResults: 10 });

		const [url] = mockFetch.mock.calls[0] as [string];
		expect(url).toContain('count=10');
	});

	it('adds site: operators for includeDomains', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ web: { results: [] } }),
		});

		await braveSearch('BSA-key', 'webhooks', {
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
			json: async () => ({ web: { results: [] } }),
		});

		await braveSearch('BSA-key', 'webhooks', {
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
			status: 429,
			statusText: 'Too Many Requests',
		});

		await expect(braveSearch('BSA-key', 'test', {})).rejects.toThrow(
			'Brave search failed: 429 Too Many Requests',
		);
	});

	it('handles empty results gracefully', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ web: { results: [] } }),
		});

		const result = await braveSearch('BSA-key', 'nonexistent query', {});

		expect(result.query).toBe('nonexistent query');
		expect(result.results).toHaveLength(0);
	});

	it('handles missing web.results gracefully', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({}),
		});

		const result = await braveSearch('BSA-key', 'test', {});

		expect(result.results).toHaveLength(0);
	});

	describe('proxy mode', () => {
		const proxyConfig = {
			apiUrl: 'https://proxy.example.com/brave-search',
			getAuthHeaders: async () => ({ Authorization: 'Bearer proxy-token' }),
		};

		it('uses proxy URL and auth headers when proxyConfig is provided', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => MOCK_BRAVE_RESPONSE,
			});

			await braveSearch('', 'stripe webhooks', { proxyConfig });

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			expect(url).toContain('https://proxy.example.com/brave-search/res/v1/web/search');
			expect(url).not.toContain('api.search.brave.com');
			const headers = init.headers as Record<string, string>;
			expect(headers.Authorization).toBe('Bearer proxy-token');
		});

		it('does not include X-Subscription-Token when using proxy', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => MOCK_BRAVE_RESPONSE,
			});

			await braveSearch('BSA-key', 'test', { proxyConfig });

			const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			const headers = init.headers as Record<string, string>;
			expect(headers).not.toHaveProperty('X-Subscription-Token');
		});

		it('still appends query parameters to proxy URL', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ web: { results: [] } }),
			});

			await braveSearch('', 'test query', { maxResults: 10, proxyConfig });

			const [url] = mockFetch.mock.calls[0] as [string];
			expect(url).toContain('q=test+query');
			expect(url).toContain('count=10');
		});

		it('applies domain filtering when using proxy', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: async () => ({ web: { results: [] } }),
			});

			await braveSearch('', 'webhooks', {
				includeDomains: ['stripe.com'],
				proxyConfig,
			});

			const [url] = mockFetch.mock.calls[0] as [string];
			const parsed = new URL(url);
			const q = parsed.searchParams.get('q')!;
			expect(q).toBe('webhooks (site:stripe.com)');
		});
	});
});
