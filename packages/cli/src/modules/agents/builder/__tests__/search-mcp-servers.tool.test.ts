import { mock } from 'vitest-mock-extended';

import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { linearMockServer, notionMockServer } from '@/modules/mcp-registry/registry/mock-servers';

import { buildSearchMcpServersTool } from '../search-mcp-servers.tool';

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

describe('buildSearchMcpServersTool', () => {
	it('returns MCP config-shaped registry results', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		mcpRegistryService.getAll.mockResolvedValue([notionMockServer]);

		const tool = buildSearchMcpServersTool({ mcpRegistryService });
		const result = await tool.handler!({ queries: ['notion'] }, ctx);

		expect(result).toEqual({
			results: [
				{
					name: 'notion',
					title: 'Notion',
					description: 'Connect to the Notion MCP Server',
					url: 'https://mcp.notion.com/mcp',
					transport: 'streamableHttp',
					authentication: 'notionMcpOAuth2Api',
					credentialType: 'notionMcpOAuth2Api',
					tools: [
						{
							name: 'notion-search',
							title: 'Search Notion and connected sources',
						},
						{
							name: 'notion-fetch',
							title: 'Fetch Notion entities',
						},
						{
							name: 'notion-create-pages',
							title: 'Create pages in Markdown',
						},
					],
					metadata: {
						nodeTypeName: '@n8n/mcp-registry.notion',
					},
				},
			],
		});
	});

	it('filters by case-insensitive query across title and tags', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		mcpRegistryService.getAll.mockResolvedValue([notionMockServer, linearMockServer]);

		const tool = buildSearchMcpServersTool({ mcpRegistryService });
		const result = await tool.handler!({ queries: ['PROJECT'] }, ctx);

		expect(result).toEqual({
			results: [
				expect.objectContaining({
					name: 'linear',
					title: 'Linear',
				}),
			],
		});
	});

	it('returns empty results when no servers match', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		mcpRegistryService.getAll.mockResolvedValue([notionMockServer, linearMockServer]);

		const tool = buildSearchMcpServersTool({ mcpRegistryService });
		const result = await tool.handler!({ queries: ['snowflake'] }, ctx);

		expect(result).toEqual({ results: [] });
	});
});
