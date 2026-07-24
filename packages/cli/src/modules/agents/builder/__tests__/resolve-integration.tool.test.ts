import { mock } from 'vitest-mock-extended';

import type { McpRegistrySearchResult } from '@/modules/mcp-registry/registry/mcp-registry-search';
import type { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';

import type { AgentsToolsService } from '../../agents-tools.service';
import { buildResolveIntegrationTool } from '../resolve-integration.tool';

const ctx = {
	resumeData: undefined,
	suspend: vi.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

const notionResult: McpRegistrySearchResult = {
	name: 'notion',
	title: 'Notion',
	description: 'Connect to the Notion MCP Server',
	url: 'https://mcp.notion.com/mcp',
	transport: 'streamableHttp',
	authentication: 'notionMcpOAuth2Api',
	credentialType: 'notionMcpOAuth2Api',
	tools: [],
	metadata: { nodeTypeName: '@n8n/mcp-registry.notion' },
};

describe('buildResolveIntegrationTool', () => {
	it('returns kind: "mcp" when the registry has matches and does not search nodes', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		const agentsToolsService = mock<AgentsToolsService>();
		mcpRegistryService.search.mockResolvedValue([notionResult]);

		const tool = buildResolveIntegrationTool({ mcpRegistryService, agentsToolsService });
		const result = await tool.handler!({ queries: ['notion'] }, ctx);

		expect(mcpRegistryService.search).toHaveBeenCalledWith(['notion']);
		expect(agentsToolsService.searchAgentToolNodes).not.toHaveBeenCalled();
		expect(result).toEqual({ kind: 'mcp', results: [notionResult] });
	});

	it('returns kind: "node" with node search results when the registry has no matches', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		const agentsToolsService = mock<AgentsToolsService>();
		mcpRegistryService.search.mockResolvedValue([]);
		agentsToolsService.searchAgentToolNodes.mockResolvedValue({
			results: 'slack node results',
			queriesWithNoResults: ['unknown'],
		});

		const tool = buildResolveIntegrationTool({ mcpRegistryService, agentsToolsService });
		const result = await tool.handler!({ queries: ['slack'] }, ctx);

		expect(mcpRegistryService.search).toHaveBeenCalledWith(['slack']);
		expect(agentsToolsService.searchAgentToolNodes).toHaveBeenCalledWith(['slack']);
		expect(result).toEqual({
			kind: 'node',
			results: 'slack node results',
			queriesWithNoResults: ['unknown'],
		});
	});

	it('propagates registry search errors instead of falling back to nodes', async () => {
		const mcpRegistryService = mock<McpRegistryService>();
		const agentsToolsService = mock<AgentsToolsService>();
		mcpRegistryService.search.mockRejectedValue(new Error('registry unavailable'));

		const tool = buildResolveIntegrationTool({ mcpRegistryService, agentsToolsService });

		await expect(tool.handler!({ queries: ['slack'] }, ctx)).rejects.toThrow(
			'registry unavailable',
		);
		expect(agentsToolsService.searchAgentToolNodes).not.toHaveBeenCalled();
	});
});
