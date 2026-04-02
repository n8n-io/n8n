import type {
	InstanceAiContext,
	InstanceAiWebResearchService,
	WebSearchResponse,
} from '../../../types';
import { createWebSearchTool } from '../web-search.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSearchResponse: WebSearchResponse = {
	query: 'stripe webhooks',
	results: [
		{
			title: 'Stripe Webhooks Documentation',
			url: 'https://stripe.com/docs/webhooks',
			snippet: 'Learn how to listen for events on your Stripe account.',
			publishedDate: '2 days ago',
		},
		{
			title: 'Stripe API Reference — Webhook Endpoints',
			url: 'https://stripe.com/docs/api/webhook_endpoints',
			snippet: 'Create and manage webhook endpoints via the API.',
		},
	],
};

function createMockWebResearchService(): InstanceAiWebResearchService {
	return {
		search: jest.fn().mockResolvedValue(mockSearchResponse),
		fetchUrl: jest.fn().mockResolvedValue({
			url: 'https://example.com',
			finalUrl: 'https://example.com',
			title: 'Test',
			content: '# Test',
			truncated: false,
			contentLength: 6,
		}),
	};
}

function createMockContext(webResearchService?: InstanceAiWebResearchService): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		webResearchService,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('web-search tool', () => {
	describe('schema validation', () => {
		it('accepts a valid query', () => {
			const tool = createWebSearchTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ query: 'stripe webhooks' });
			expect(result.success).toBe(true);
		});

		it('rejects missing query', () => {
			const tool = createWebSearchTool(createMockContext());
			const result = tool.inputSchema!.safeParse({});
			expect(result.success).toBe(false);
		});

		it('accepts optional maxResults', () => {
			const tool = createWebSearchTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				query: 'test',
				maxResults: 10,
			});
			expect(result.success).toBe(true);
		});

		it('rejects maxResults over 20', () => {
			const tool = createWebSearchTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				query: 'test',
				maxResults: 25,
			});
			expect(result.success).toBe(false);
		});

		it('accepts optional includeDomains', () => {
			const tool = createWebSearchTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				query: 'test',
				includeDomains: ['docs.stripe.com'],
			});
			expect(result.success).toBe(true);
		});
	});

	describe('execute', () => {
		it('delegates to webResearchService.search', async () => {
			const service = createMockWebResearchService();
			const context = createMockContext(service);
			const tool = createWebSearchTool(context);

			const result = (await tool.execute!(
				{
					query: 'stripe webhooks',
					maxResults: 3,
					includeDomains: ['docs.stripe.com'],
				},
				{} as never,
			)) as { query: string; results: Array<{ title: string }> };

			expect(service.search).toHaveBeenCalledWith('stripe webhooks', {
				maxResults: 3,
				includeDomains: ['docs.stripe.com'],
			});
			expect(result.query).toBe('stripe webhooks');
			expect(result.results).toHaveLength(2);
			expect(result.results[0].title).toBe('Stripe Webhooks Documentation');
		});

		it('returns empty results when webResearchService is not configured', async () => {
			const context = createMockContext(undefined);
			const tool = createWebSearchTool(context);

			const result = await tool.execute!({ query: 'test query' }, {} as never);

			expect(result).toEqual({
				query: 'test query',
				results: [],
			});
		});

		it('returns empty results when search method is not available', async () => {
			// Service exists but without search (no API key)
			const service: InstanceAiWebResearchService = {
				fetchUrl: jest.fn().mockResolvedValue({
					url: 'https://example.com',
					finalUrl: 'https://example.com',
					title: 'Test',
					content: '# Test',
					truncated: false,
					contentLength: 6,
				}),
			};
			const context = createMockContext(service);
			const tool = createWebSearchTool(context);

			const result = await tool.execute!({ query: 'test query' }, {} as never);

			expect(result).toEqual({
				query: 'test query',
				results: [],
			});
		});
	});
});
