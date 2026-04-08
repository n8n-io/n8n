import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';
import { createResearchTool } from '../research.tool';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {} as never,
		executionService: {} as never,
		credentialService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
		webResearchService: {
			search: jest.fn(),
			fetchUrl: jest.fn(),
		},
		domainAccessTracker: undefined,
		runId: 'test-run',
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function createAgentCtx(opts: { resumeData?: unknown; suspend?: jest.Mock } = {}) {
	return {
		agent: {
			resumeData: opts.resumeData,
			suspend: opts.suspend ?? jest.fn(),
		},
	};
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('research tool', () => {
	// ── web-search ──────────────────────────────────────────────────────────

	describe('web-search action', () => {
		it('should call webResearchService.search and return results', async () => {
			const searchResponse = {
				query: 'n8n docs',
				results: [
					{ title: 'n8n Docs', url: 'https://docs.n8n.io', snippet: 'Documentation for n8n' },
				],
			};
			const context = createMockContext();
			context.webResearchService!.search = jest.fn().mockResolvedValue(searchResponse);

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'web-search' as const, query: 'n8n docs' },
				{} as never,
			);

			expect(context.webResearchService!.search).toHaveBeenCalledWith('n8n docs', {
				maxResults: undefined,
				includeDomains: undefined,
			});
			expect(result).toEqual(searchResponse);
		});

		it('should pass maxResults and includeDomains to search', async () => {
			const searchResponse = { query: 'stripe api', results: [] };
			const context = createMockContext();
			context.webResearchService!.search = jest.fn().mockResolvedValue(searchResponse);

			const tool = createResearchTool(context);
			await tool.execute!(
				{
					action: 'web-search' as const,
					query: 'stripe api',
					maxResults: 10,
					includeDomains: ['docs.stripe.com'],
				},
				{} as never,
			);

			expect(context.webResearchService!.search).toHaveBeenCalledWith('stripe api', {
				maxResults: 10,
				includeDomains: ['docs.stripe.com'],
			});
		});

		it('should sanitize snippets in results', async () => {
			const searchResponse = {
				query: 'test',
				results: [
					{
						title: 'Page',
						url: 'https://example.com',
						snippet: 'Clean text <!-- hidden comment --> more text',
					},
				],
			};
			const context = createMockContext();
			context.webResearchService!.search = jest.fn().mockResolvedValue(searchResponse);

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'web-search' as const, query: 'test' },
				{} as never,
			);

			// The snippet should have HTML comments stripped
			expect((result as { results: Array<{ snippet: string }> }).results[0].snippet).toBe(
				'Clean text  more text',
			);
		});

		it('should return empty results when webResearchService is undefined', async () => {
			const context = createMockContext({ webResearchService: undefined });

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'web-search' as const, query: 'test query' },
				{} as never,
			);

			expect(result).toEqual({ query: 'test query', results: [] });
		});

		it('should return empty results when webResearchService.search is undefined', async () => {
			const context = createMockContext({
				webResearchService: { fetchUrl: jest.fn() } as never,
			});

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'web-search' as const, query: 'no search' },
				{} as never,
			);

			expect(result).toEqual({ query: 'no search', results: [] });
		});
	});

	// ── fetch-url ───────────────────────────────────────────────────────────

	describe('fetch-url action', () => {
		it('should call webResearchService.fetchUrl and return content', async () => {
			const fetchedPage = {
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: 'Example',
				content: 'Page content here',
				truncated: false,
				contentLength: 17,
			};
			const context = createMockContext({
				permissions: { fetchUrl: 'always_allow' },
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx() as never,
			);

			expect(context.webResearchService!.fetchUrl).toHaveBeenCalledWith(
				'https://example.com',
				expect.objectContaining({
					maxContentLength: undefined,
					authorizeUrl: expect.any(Function),
				}),
			);
			// Content should be sanitized and wrapped in boundary tags
			expect((result as { content: string }).content).toContain('<web_content');
			expect((result as { content: string }).content).toContain('Page content here');
		});

		it('should return unavailable message when webResearchService is undefined', async () => {
			const context = createMockContext({ webResearchService: undefined });

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx() as never,
			);

			expect(result).toEqual({
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: '',
				content: 'Web research is not available in this environment.',
				truncated: false,
				contentLength: 0,
			});
		});

		it('should suspend when domain is not allowed and needs approval', async () => {
			const suspendFn = jest.fn();
			const tracker = {
				isHostAllowed: jest.fn().mockReturnValue(false),
				approveDomain: jest.fn(),
				approveAllDomains: jest.fn(),
				approveOnce: jest.fn(),
			};
			const context = createMockContext({
				domainAccessTracker: tracker as never,
				permissions: {},
			});

			const tool = createResearchTool(context);
			await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://unknown-site.com/page' },
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(suspendFn).toHaveBeenCalled();
			const suspendPayload = suspendFn.mock.calls[0][0] as Record<string, unknown>;
			expect(suspendPayload).toEqual(
				expect.objectContaining({
					message: expect.stringContaining('unknown-site.com'),
					severity: 'info',
					domainAccess: expect.objectContaining({
						url: 'https://unknown-site.com/page',
						host: 'unknown-site.com',
					}),
				}),
			);
		});

		it('should return blocked message when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { fetchUrl: 'blocked' },
			});

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx() as never,
			);

			expect(result).toEqual(
				expect.objectContaining({
					content: 'Action blocked by admin.',
				}),
			);
		});

		it('should skip domain gating when permission is always_allow', async () => {
			const fetchedPage = {
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: 'Example',
				content: 'The content',
				truncated: false,
				contentLength: 11,
			};
			const context = createMockContext({
				permissions: { fetchUrl: 'always_allow' },
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx() as never,
			);

			expect(context.webResearchService!.fetchUrl).toHaveBeenCalled();
			expect((result as { content: string }).content).toContain('The content');
		});

		it('should proceed when resumed with approval', async () => {
			const fetchedPage = {
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: 'Example',
				content: 'Fetched content',
				truncated: false,
				contentLength: 15,
			};
			const tracker = {
				isHostAllowed: jest.fn().mockReturnValue(false),
				approveDomain: jest.fn(),
				approveAllDomains: jest.fn(),
				approveOnce: jest.fn(),
			};
			const context = createMockContext({
				domainAccessTracker: tracker as never,
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx({
					resumeData: { approved: true, domainAccessAction: 'allow_once' },
				}) as never,
			);

			expect(tracker.approveOnce).toHaveBeenCalledWith('test-run', 'example.com');
			expect(context.webResearchService!.fetchUrl).toHaveBeenCalled();
			expect((result as { content: string }).content).toContain('Fetched content');
		});

		it('should deny access when resumed with denial', async () => {
			const tracker = {
				isHostAllowed: jest.fn().mockReturnValue(false),
				approveDomain: jest.fn(),
				approveAllDomains: jest.fn(),
				approveOnce: jest.fn(),
			};
			const context = createMockContext({
				domainAccessTracker: tracker as never,
			});

			const tool = createResearchTool(context);
			const result = await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx({
					resumeData: { approved: false },
				}) as never,
			);

			expect(result).toEqual(
				expect.objectContaining({
					content: 'User denied access to this URL.',
				}),
			);
		});

		it('should approve domain permanently via allow_domain resume action', async () => {
			const fetchedPage = {
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: 'Example',
				content: 'Content',
				truncated: false,
				contentLength: 7,
			};
			const tracker = {
				isHostAllowed: jest.fn().mockReturnValue(false),
				approveDomain: jest.fn(),
				approveAllDomains: jest.fn(),
				approveOnce: jest.fn(),
			};
			const context = createMockContext({
				domainAccessTracker: tracker as never,
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const tool = createResearchTool(context);
			await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx({
					resumeData: { approved: true, domainAccessAction: 'allow_domain' },
				}) as never,
			);

			expect(tracker.approveDomain).toHaveBeenCalledWith('example.com');
		});

		it('should approve all domains via allow_all resume action', async () => {
			const fetchedPage = {
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: 'Example',
				content: 'Content',
				truncated: false,
				contentLength: 7,
			};
			const tracker = {
				isHostAllowed: jest.fn().mockReturnValue(false),
				approveDomain: jest.fn(),
				approveAllDomains: jest.fn(),
				approveOnce: jest.fn(),
			};
			const context = createMockContext({
				domainAccessTracker: tracker as never,
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const tool = createResearchTool(context);
			await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://example.com' },
				createAgentCtx({
					resumeData: { approved: true, domainAccessAction: 'allow_all' },
				}) as never,
			);

			expect(tracker.approveAllDomains).toHaveBeenCalled();
		});

		it('should skip domain check when host is already allowed in tracker', async () => {
			const fetchedPage = {
				url: 'https://trusted.com',
				finalUrl: 'https://trusted.com',
				title: 'Trusted',
				content: 'Trusted content',
				truncated: false,
				contentLength: 15,
			};
			const tracker = {
				isHostAllowed: jest.fn().mockReturnValue(true),
				approveDomain: jest.fn(),
				approveAllDomains: jest.fn(),
				approveOnce: jest.fn(),
			};
			const context = createMockContext({
				domainAccessTracker: tracker as never,
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const suspendFn = jest.fn();
			const tool = createResearchTool(context);
			await tool.execute!(
				{ action: 'fetch-url' as const, url: 'https://trusted.com' },
				createAgentCtx({ suspend: suspendFn }) as never,
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(context.webResearchService!.fetchUrl).toHaveBeenCalled();
		});

		it('should pass maxContentLength to fetchUrl', async () => {
			const fetchedPage = {
				url: 'https://example.com',
				finalUrl: 'https://example.com',
				title: 'Example',
				content: 'Short content',
				truncated: false,
				contentLength: 13,
			};
			const context = createMockContext({
				permissions: { fetchUrl: 'always_allow' },
			});
			context.webResearchService!.fetchUrl = jest.fn().mockResolvedValue(fetchedPage);

			const tool = createResearchTool(context);
			await tool.execute!(
				{
					action: 'fetch-url' as const,
					url: 'https://example.com',
					maxContentLength: 5000,
				},
				createAgentCtx() as never,
			);

			expect(context.webResearchService!.fetchUrl).toHaveBeenCalledWith(
				'https://example.com',
				expect.objectContaining({ maxContentLength: 5000 }),
			);
		});
	});
});
