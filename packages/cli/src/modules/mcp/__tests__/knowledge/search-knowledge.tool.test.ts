import type {
	KnowledgeSearchResult,
	KnowledgeSearchService,
} from '@/modules/knowledge/knowledge-search.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import { createSearchKnowledgeTool } from '../../tools/knowledge/search-knowledge.tool';
import { createTelemetry, user } from '../data-table/test-utils';

const hit = (overrides: Partial<KnowledgeSearchResult> = {}): KnowledgeSearchResult => ({
	text: 'Deployments are described in the runbook.',
	score: 0.82,
	title: '#12 How do I deploy?',
	url: 'https://github.com/n8n-io/n8n/issues/12',
	sourceId: 'source-1',
	sourceName: 'n8n repo',
	externalId: 'issue:12',
	metadata: { kind: 'issue' },
	...overrides,
});

const createMocks = (result: KnowledgeSearchResult[] | Error) => {
	const search =
		result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
	const searchService = { search } as unknown as KnowledgeSearchService;

	return { searchService, telemetry: createTelemetry() };
};

describe('search_knowledge MCP tool', () => {
	test('creates the tool as read-only', () => {
		const { searchService, telemetry } = createMocks([]);
		const tool = createSearchKnowledgeTool(user, () => searchService, telemetry);

		expect(tool.name).toBe('search_knowledge');
		expect(tool.config.annotations?.readOnlyHint).toBe(true);
		expect(tool.config.inputSchema).toBeDefined();
		expect(tool.config.outputSchema).toBeDefined();
	});

	test('resolves the search service lazily, only when called', async () => {
		const { searchService, telemetry } = createMocks([]);
		const getSearchService = vi.fn(() => searchService);
		const tool = createSearchKnowledgeTool(user, getSearchService, telemetry);

		expect(getSearchService).not.toHaveBeenCalled();

		await tool.handler({ query: 'deploy' }, {} as never);

		expect(getSearchService).toHaveBeenCalledTimes(1);
	});

	test('returns the hits and tracks the call', async () => {
		const { searchService, telemetry } = createMocks([hit()]);
		const tool = createSearchKnowledgeTool(user, () => searchService, telemetry);

		const result = await tool.handler({ query: 'deploy', sourceIds: ['source-1'] }, {} as never);

		expect(searchService.search).toHaveBeenCalledWith('deploy', {
			sourceIds: ['source-1'],
			topK: 25,
		});
		expect(result.structuredContent).toEqual({
			results: [
				{
					text: 'Deployments are described in the runbook.',
					title: '#12 How do I deploy?',
					url: 'https://github.com/n8n-io/n8n/issues/12',
					sourceName: 'n8n repo',
					externalId: 'issue:12',
					score: 0.82,
				},
			],
			total: 1,
		});
		expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: user.id,
			tool_name: 'search_knowledge',
			// the query itself is never tracked
			parameters: { sourceIds: ['source-1'], topK: undefined },
			results: { success: true, data: { count: 1 } },
		});
	});

	test('truncates long passages', async () => {
		const { searchService, telemetry } = createMocks([hit({ text: 'x'.repeat(5000) })]);
		const tool = createSearchKnowledgeTool(user, () => searchService, telemetry);

		const result = await tool.handler({ query: 'deploy' }, {} as never);
		const [first] = (result.structuredContent as { results: Array<{ text: string }> }).results;

		expect(first.text).toHaveLength(1201);
		expect(first.text.endsWith('…')).toBe(true);
	});

	test('clamps topK to the tool maximum', async () => {
		const { searchService, telemetry } = createMocks([]);
		const tool = createSearchKnowledgeTool(user, () => searchService, telemetry);

		await tool.handler({ query: 'deploy', topK: 999 }, {} as never);

		expect(searchService.search).toHaveBeenCalledWith('deploy', {
			sourceIds: undefined,
			topK: 25,
		});
	});

	test('reports a failed search as a tool error', async () => {
		const { searchService, telemetry } = createMocks(
			new Error('Knowledge connectors are not configured.'),
		);
		const tool = createSearchKnowledgeTool(user, () => searchService, telemetry);

		const result = await tool.handler({ query: 'deploy' }, {} as never);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			results: [],
			total: 0,
			error: 'Knowledge connectors are not configured.',
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				results: { success: false, error: 'Knowledge connectors are not configured.' },
			}),
		);
	});
});
