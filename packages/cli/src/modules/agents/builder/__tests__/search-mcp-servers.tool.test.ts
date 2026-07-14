import { mock } from 'vitest-mock-extended';

import type { McpRegistrySearchResult } from '@/modules/mcp-registry/registry/mcp-registry-search';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

import { buildSearchMcpServersTool } from '../search-mcp-servers.tool';

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

// The tool is a thin wrapper: matching and config-shape mapping live in
// `mcp-registry-search.ts` and are covered by its own test. Here we only assert
// the tool delegates to `mcpRegistryService.search` and returns its results.
const notionResult: McpRegistrySearchResult = {
	name: 'notion',
	title: 'Notion',
	description: 'Connect to the Notion MCP Server',
	url: 'https://mcp.notion.com/mcp',
	transport: 'streamableHttp',
	authentication: 'notionMcpOAuth2Api',
	credentialType: 'notionMcpOAuth2Api',
	tools: [
		{ name: 'notion-search', title: 'Search Notion and connected sources' },
		{ name: 'notion-fetch', title: 'Fetch Notion entities' },
		{ name: 'notion-create-pages', title: 'Create pages in Markdown' },
	],
	metadata: { nodeTypeName: '@n8n/mcp-registry.notion' },
};

describe('buildSearchMcpServersTool', () => {
	it('delegates to mcpRegistryService.search and returns its results', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		mcpRegistryService.search.mockResolvedValue([notionResult]);

		const tool = buildSearchMcpServersTool({ mcpRegistryService });
		const result = await tool.handler!({ queries: ['notion'] }, ctx);

		expect(mcpRegistryService.search).toHaveBeenCalledWith(['notion']);
		expect(result).toEqual({ results: [notionResult] });
	});

	it('returns empty results when the registry search finds nothing', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		mcpRegistryService.search.mockResolvedValue([]);

		const tool = buildSearchMcpServersTool({ mcpRegistryService });
		const result = await tool.handler!({ queries: ['snowflake'] }, ctx);

		expect(result).toEqual({ results: [] });
	});
});
