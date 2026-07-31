import { mock } from 'vitest-mock-extended';

import { executeTool } from '../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiMcpService, McpRegistryServerSummary } from '../types';
import { createMcpServersTool } from './mcp-servers.tool';

const notion: McpRegistryServerSummary = {
	slug: 'notion',
	title: 'Notion',
	description: 'Work with Notion pages and databases',
	tools: [{ name: 'create_page', title: 'Create page' }],
	isConnected: false,
};

const linear: McpRegistryServerSummary = {
	slug: 'linear',
	title: 'Linear',
	description: 'Track issues in Linear',
	tools: [{ name: 'create_issue' }],
	isConnected: true,
};

function makeContext(mcpService?: InstanceAiMcpService): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.mcpService = mcpService;
	return context;
}

function makeService(servers: McpRegistryServerSummary[]): InstanceAiMcpService {
	return { search: vi.fn().mockResolvedValue(servers) };
}

interface SearchOutput {
	results: McpRegistryServerSummary[];
	hint?: string;
}

describe('mcp-servers tool', () => {
	it('passes the queries through and returns the host-annotated results', async () => {
		const mcpService = makeService([notion, linear]);
		const tool = createMcpServersTool(makeContext(mcpService));

		const output = await executeTool<SearchOutput>(tool, {
			action: 'search',
			queries: ['notion', 'linear'],
		});

		expect(mcpService.search).toHaveBeenCalledWith(['notion', 'linear']);
		expect(output.results).toEqual([notion, linear]);
	});

	it('returns no results when nothing matches', async () => {
		const tool = createMcpServersTool(makeContext(makeService([])));

		const output = await executeTool<SearchOutput>(tool, {
			action: 'search',
			queries: ['nothing-like-this'],
		});

		expect(output.results).toEqual([]);
	});

	it('hints how to connect while any result is unconnected', async () => {
		const tool = createMcpServersTool(makeContext(makeService([notion, linear])));

		const output = await executeTool<SearchOutput>(tool, {
			action: 'search',
			queries: ['notion'],
		});

		expect(output.hint).toContain('"Connections"');
	});

	it('omits the hint when everything found is already connected', async () => {
		const tool = createMcpServersTool(makeContext(makeService([linear])));

		const output = await executeTool<SearchOutput>(tool, {
			action: 'search',
			queries: ['linear'],
		});

		expect(output.hint).toBeUndefined();
	});

	it('rejects an empty query list', async () => {
		const tool = createMcpServersTool(makeContext(makeService([notion])));

		await expect(executeTool(tool, { action: 'search', queries: [] })).rejects.toThrow();
	});

	it('fails loudly when the host did not wire the MCP service', async () => {
		const tool = createMcpServersTool(makeContext(undefined));

		await expect(executeTool(tool, { action: 'search', queries: ['notion'] })).rejects.toThrow(
			'MCP registry search is not available on this instance.',
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
