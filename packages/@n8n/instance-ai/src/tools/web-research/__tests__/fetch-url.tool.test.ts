import type { InstanceAiContext, FetchedPage, InstanceAiWebResearchService } from '../../../types';
import { createFetchUrlTool } from '../fetch-url.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockWebResearchService(url = 'https://example.com'): InstanceAiWebResearchService {
	const mockPage: FetchedPage = {
		url,
		finalUrl: url,
		title: 'Test Page',
		content: '# Test Content',
		truncated: false,
		contentLength: 14,
	};

	return {
		fetchUrl: jest.fn().mockResolvedValue(mockPage),
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

describe('fetch-url tool', () => {
	describe('schema validation', () => {
		it('accepts a valid URL', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ url: 'https://example.com' });
			expect(result.success).toBe(true);
		});

		it('rejects an invalid URL', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ url: 'not-a-url' });
			expect(result.success).toBe(false);
		});

		it('accepts optional maxContentLength', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				url: 'https://example.com',
				maxContentLength: 5000,
			});
			expect(result.success).toBe(true);
		});

		it('rejects maxContentLength over 100000', () => {
			const tool = createFetchUrlTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				url: 'https://example.com',
				maxContentLength: 200_000,
			});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('delegates to webResearchService.fetchUrl', async () => {
			const service = createMockWebResearchService('https://example.com/docs');
			const context = createMockContext(service);
			const tool = createFetchUrlTool(context);

			const result = await tool.execute!(
				{
					url: 'https://example.com/docs',
					maxContentLength: 10_000,
				},
				{} as never,
			);

			expect(service.fetchUrl).toHaveBeenCalledWith('https://example.com/docs', {
				maxContentLength: 10_000,
			});
			expect(result).toMatchObject({
				title: 'Test Page',
				content: '# Test Content',
				truncated: false,
			});
		});

		it('returns graceful error when webResearchService is not configured', async () => {
			const context = createMockContext(undefined);
			const tool = createFetchUrlTool(context);

			const result = await tool.execute!(
				{
					url: 'https://example.com',
				},
				{} as never,
			);

			expect(result).toMatchObject({
				url: 'https://example.com',
				content: 'Web research is not available in this environment.',
				truncated: false,
			});
		});
	});
});
