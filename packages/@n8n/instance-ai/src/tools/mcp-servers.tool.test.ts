import { mock } from 'vitest-mock-extended';

import { executeTool } from '../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiMcpService, McpRegistryServerSummary } from '../types';
import { createMcpServersTool } from './mcp-servers.tool';

const notion: McpRegistryServerSummary = {
	slug: 'notion',
	title: 'Notion',
	description: 'Work with Notion pages and databases',
	tools: ['create_page', 'search_pages'],
};

const linear: McpRegistryServerSummary = {
	slug: 'linear',
	title: 'Linear',
	description: 'Track issues in Linear',
	tools: ['create_issue'],
};

function makeContext(mcpService?: InstanceAiMcpService): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.mcpService = mcpService;
	return context;
}

function makeService(servers: McpRegistryServerSummary[]): InstanceAiMcpService {
	return { search: vi.fn().mockResolvedValue(servers) };
}

function makeServers(count: number): McpRegistryServerSummary[] {
	return Array.from({ length: count }, (_, index) => ({
		slug: `server-${index}`,
		title: `Server ${index}`,
		description: 'An API service',
		tools: [`tool_${index}`],
	}));
}

interface SearchOutput {
	results: McpRegistryServerSummary[];
	hint?: string;
}

async function search(
	servers: McpRegistryServerSummary[],
	queries: string[] = ['anything'],
): Promise<SearchOutput> {
	const tool = createMcpServersTool(makeContext(makeService(servers)));
	return await executeTool<SearchOutput>(tool, { action: 'search', queries });
}

describe('mcp-servers tool', () => {
	it('passes the queries through and returns the matching servers', async () => {
		const mcpService = makeService([notion, linear]);
		const tool = createMcpServersTool(makeContext(mcpService));

		const output = await executeTool<SearchOutput>(tool, {
			action: 'search',
			queries: ['notion', 'linear'],
		});

		expect(mcpService.search).toHaveBeenCalledWith(['notion', 'linear']);
		expect(output.results.map((result) => result.slug)).toEqual(['notion', 'linear']);
	});

	it('returns no results when nothing matches', async () => {
		const output = await search([]);

		expect(output.results).toEqual([]);
	});

	it('passes each server through with its tool names', async () => {
		const output = await search([notion, linear]);

		expect(output.results).toEqual([notion, linear]);
	});

	it('caps the results and says it truncated', async () => {
		const output = await search(makeServers(8), ['api']);

		expect(output.results).toHaveLength(5);
		expect(output.hint).toContain('narrower query');
	});

	it('does not claim truncation when everything fits', async () => {
		const output = await search(makeServers(5), ['api']);

		expect(output.hint).not.toContain('narrower query');
	});

	it('hints how to connect whenever something was found', async () => {
		const output = await search([notion]);

		expect(output.hint).toContain('"Connections"');
	});

	it('omits the hint when nothing was found', async () => {
		const output = await search([]);

		expect(output.hint).toBeUndefined();
	});

	it('rejects an empty query list', async () => {
		const tool = createMcpServersTool(makeContext(makeService([notion])));

		await expect(executeTool(tool, { action: 'search', queries: [] })).rejects.toThrow();
	});

	it('fails loudly when the host did not wire the MCP service', async () => {
		const tool = createMcpServersTool(makeContext(undefined));

		await expect(executeTool(tool, { action: 'search', queries: ['notion'] })).rejects.toThrow(
			'MCP server search is not available on this instance.',
		);
	});

	it('propagates registry failures', async () => {
		const mcpService: InstanceAiMcpService = {
			search: vi.fn().mockRejectedValue(new Error('registry unavailable')),
		};
		const tool = createMcpServersTool(makeContext(mcpService));

		await expect(executeTool(tool, { action: 'search', queries: ['notion'] })).rejects.toThrow(
			'registry unavailable',
		);
	});
});
