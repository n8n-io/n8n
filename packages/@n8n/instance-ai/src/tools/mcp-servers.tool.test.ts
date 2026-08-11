import { mock } from 'vitest-mock-extended';

import { executeTool } from '../__tests__/tool-test-utils';
import type {
	ConnectedMcpService,
	InstanceAiContext,
	InstanceAiMcpService,
	McpRegistryServerSummary,
} from '../types';
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

function makeContext(
	mcpService?: InstanceAiMcpService,
	connectedMcpServices?: ConnectedMcpService[],
): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.mcpService = mcpService;
	context.connectedMcpServices = connectedMcpServices;
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

interface ConnectedOutput {
	servers: Array<{ slug: string; toolCount: number }>;
	hint?: string;
}

interface DetailsOutput {
	slug: string;
	tools: string[];
	hint?: string;
}

async function connected(services?: ConnectedMcpService[]): Promise<ConnectedOutput> {
	const tool = createMcpServersTool(makeContext(makeService([]), services));
	return await executeTool<ConnectedOutput>(tool, { action: 'connected' });
}

function toolDescription(): string {
	return createMcpServersTool(makeContext(makeService([]))).description;
}

describe('mcp-servers tool', () => {
	// This guidance used to live in the system prompt. `mcp-servers` is never
	// deferred, so its description reaches every request without a second copy.
	describe('description', () => {
		it('names who changes a connection, so a missing server is not read as expiry', () => {
			const description = toolDescription();

			expect(description).toContain('Only the user connects or disconnects');
			expect(description).toContain('never connected or disconnected');
		});

		it('places a connection on the account, not on the conversation', () => {
			expect(toolDescription()).toContain('persist across conversations');
		});

		it('sends the orchestrator to the tool instead of the transcript', () => {
			expect(toolDescription()).toContain('ask here instead of answering from the conversation');
		});

		// Distinct from a missing server: these are connections to third-party services.
		it('explains a connected server with no tools', () => {
			expect(toolDescription()).toContain('broken or expired connection');
		});

		it('says tool names come from `details` alone', () => {
			expect(toolDescription()).toContain('`connected` never returns them');
		});

		it('scopes the tool against workflow building and the credentials tool', () => {
			const description = toolDescription();

			expect(description).toContain('not for building');
			expect(description).toContain('`credentials`');
		});
	});

	describe('connected', () => {
		// Counts only: names are what `details` is for, and they dominate the tokens.
		it('reports each connected server with a tool count, not tool names', async () => {
			const output = await connected([
				{ slug: 'notion', toolNames: ['mcp_notion_search', 'mcp_notion_fetch'] },
				{ slug: 'linear', toolNames: ['mcp_linear_create_issue'] },
			]);

			expect(output.servers).toEqual([
				{ slug: 'notion', toolCount: 2 },
				{ slug: 'linear', toolCount: 1 },
			]);
			expect(output.hint).toBeUndefined();
		});

		it('says nothing is connected, and that only the user can fix it', async () => {
			const output = await connected([]);

			expect(output.servers).toEqual([]);
			expect(output.hint).toContain('Nothing connected');
			expect(output.hint).toContain('Only the user can connect');
		});

		// Same shape as an empty inventory: neither is something the agent can repair.
		it('says nothing is connected when the host established no inventory', async () => {
			const output = await connected(undefined);

			expect(output.servers).toEqual([]);
			expect(output.hint).toContain('Nothing connected');
		});

		it('keeps the orchestrator off the tools of a server that loaded none', async () => {
			const output = await connected([
				{ slug: 'notion', toolNames: ['mcp_notion_search'] },
				{ slug: 'linear', toolNames: [] },
			]);

			expect(output.hint).toContain('broken');
			expect(output.hint).toContain('never guess their names');
		});

		it('needs no MCP service, since the inventory rides on the context', async () => {
			const tool = createMcpServersTool(
				makeContext(undefined, [{ slug: 'notion', toolNames: ['mcp_notion_search'] }]),
			);

			const output = await executeTool<ConnectedOutput>(tool, { action: 'connected' });

			expect(output.servers.map((server) => server.slug)).toEqual(['notion']);
		});
	});

	describe('details', () => {
		it('returns the full tool list that `connected` truncated', async () => {
			const toolNames = Array.from({ length: 8 }, (_, i) => `mcp_notion_t${i}`);
			const tool = createMcpServersTool(
				makeContext(makeService([]), [{ slug: 'notion', toolNames }]),
			);

			const output = await executeTool<DetailsOutput>(tool, { action: 'details', slug: 'notion' });

			expect(output).toEqual({ slug: 'notion', tools: toolNames });
		});

		it('reports an unconnected slug as such rather than as an empty server', async () => {
			const tool = createMcpServersTool(
				makeContext(makeService([]), [{ slug: 'notion', toolNames: ['mcp_notion_search'] }]),
			);

			const output = await executeTool<DetailsOutput>(tool, { action: 'details', slug: 'slack' });

			expect(output.tools).toEqual([]);
			expect(output.hint).toContain('Not connected');
		});

		it('flags a connected server that loaded no tools', async () => {
			const tool = createMcpServersTool(
				makeContext(makeService([]), [{ slug: 'linear', toolNames: [] }]),
			);

			const output = await executeTool<DetailsOutput>(tool, { action: 'details', slug: 'linear' });

			expect(output.hint).toContain('broken');
		});

		it('rejects details without a slug', async () => {
			const tool = createMcpServersTool(makeContext(makeService([])));

			await expect(executeTool(tool, { action: 'details' })).rejects.toThrow();
		});
	});

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
