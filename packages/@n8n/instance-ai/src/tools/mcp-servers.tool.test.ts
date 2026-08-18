import { isZodSchema, zodToJsonSchema } from '@n8n/agents';
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
	credentialType: 'notionMcpOAuth2Api',
	tools: ['create_page', 'search_pages'],
};

const linear: McpRegistryServerSummary = {
	slug: 'linear',
	title: 'Linear',
	description: 'Track issues in Linear',
	credentialType: 'linearMcpOAuth2Api',
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

function withConnections(...slugs: string[]): Partial<InstanceAiMcpService> {
	return { listConnections: vi.fn().mockResolvedValue(slugs.map((slug) => ({ slug }))) };
}

function makeServers(count: number): McpRegistryServerSummary[] {
	return Array.from({ length: count }, (_, index) => ({
		slug: `server-${index}`,
		title: `Server ${index}`,
		description: 'An API service',
		credentialType: `server${index}McpOAuth2Api`,
		tools: [`tool_${index}`],
	}));
}

function makeService(
	servers: McpRegistryServerSummary[],
	overrides: Partial<InstanceAiMcpService> = {},
): InstanceAiMcpService {
	return {
		search: vi.fn().mockResolvedValue(servers),
		getServers: vi
			.fn()
			.mockImplementation((slugs: string[]) =>
				servers.filter((server) => slugs.includes(server.slug)),
			),
		listConnections: vi.fn().mockResolvedValue([]),
		...overrides,
	};
}

interface SearchOutput {
	results: Array<Omit<McpRegistryServerSummary, 'credentialType'>>;
	hint?: string;
}

interface ConnectOutput {
	connectedSlugs: string[];
	message: string;
}

interface SuspendPayload {
	requestId: string;
	message: string;
	mcpConnectRequest: { servers: Array<{ serverSlug: string; title: string; tagline?: string }> };
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

function suspendingContext() {
	const suspend = vi.fn().mockResolvedValue(undefined);
	return { ctx: { resumeData: undefined, suspend }, suspend };
}

type JsonSchema = NonNullable<ReturnType<typeof zodToJsonSchema>>;

function inputJsonSchema(): JsonSchema {
	const { inputSchema } = createMcpServersTool(makeContext(makeService([])));
	if (!isZodSchema(inputSchema)) throw new Error('expected a Zod input schema');
	const jsonSchema = zodToJsonSchema(inputSchema);
	if (!jsonSchema) throw new Error('expected the input schema to convert');
	return jsonSchema;
}

function property(schema: JsonSchema, name: string): JsonSchema {
	const value = schema.properties?.[name];
	if (typeof value !== 'object') throw new Error(`expected an object schema for "${name}"`);
	return value;
}

function toolDescription(): string {
	return createMcpServersTool(makeContext(makeService([]))).description;
}

describe('mcp-servers tool', () => {
	describe('input schema', () => {
		it('is a top-level object rather than a bare union', () => {
			const schema = inputJsonSchema();

			expect(schema.type).toBe('object');
			expect(schema.anyOf).toBeUndefined();
			expect(schema.oneOf).toBeUndefined();
		});

		it('offers every action and every per-action field', () => {
			const schema = inputJsonSchema();

			expect(property(schema, 'action').enum).toEqual([
				'connected',
				'details',
				'search',
				'connect',
			]);
			expect(Object.keys(schema.properties ?? {})).toEqual(
				expect.arrayContaining(['action', 'slug', 'queries', 'serverSlugs', 'reason']),
			);
		});

		it('requires only the action, leaving the rest to the handler', () => {
			expect(inputJsonSchema().required).toEqual(['action']);
		});

		it('keeps the per-action guidance the model needs to pick an action', () => {
			const schema = inputJsonSchema();

			expect(property(schema, 'action').description).toContain('Search the available MCP servers');
			expect(property(schema, 'action').description).toContain(
				'connect a third party service returned by `search`',
			);
			expect(property(schema, 'queries').description).toContain('"search"');
			expect(property(schema, 'serverSlugs').description).toContain('at most 3');
		});
	});

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

	describe('search', () => {
		it('passes the queries through and returns the matching servers', async () => {
			const mcpService = makeService([notion, linear]);
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				queries: ['notion', 'linear'],
			});

			expect(mcpService.search).toHaveBeenCalledWith(['notion', 'linear']);
			expect(output.results).toEqual([
				{
					slug: 'notion',
					title: 'Notion',
					description: notion.description,
					tools: notion.tools,
				},
				{
					slug: 'linear',
					title: 'Linear',
					description: linear.description,
					tools: linear.tools,
				},
			]);
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

		it('returns no results when nothing matches', async () => {
			const tool = createMcpServersTool(makeContext(makeService([])));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				queries: ['nothing-like-this'],
			});

			expect(output.results).toEqual([]);
		});

		it('points at the connect action when something is not connected yet', async () => {
			const output = await search([notion]);

			expect(output.hint).toContain('action: "connect"');
		});

		it('omits the hint when nothing was found', async () => {
			const output = await search([]);

			expect(output.hint).toBeUndefined();
		});

		it('rejects an empty query list', async () => {
			const tool = createMcpServersTool(makeContext(makeService([notion])));

			await expect(executeTool(tool, { action: 'search', queries: [] })).rejects.toThrow();
		});

		it('rejects a search with no queries at all', async () => {
			const mcpService = makeService([notion]);
			const tool = createMcpServersTool(makeContext(mcpService));

			await expect(executeTool(tool, { action: 'search' })).rejects.toThrow();
			expect(mcpService.search).not.toHaveBeenCalled();
		});

		it('fails loudly when the host did not wire the MCP service', async () => {
			const tool = createMcpServersTool(makeContext(undefined));

			await expect(executeTool(tool, { action: 'search', queries: ['notion'] })).rejects.toThrow(
				'Tool connections are not available on this instance.',
			);
		});

		it('propagates registry failures', async () => {
			const mcpService = makeService([], {
				search: vi.fn().mockRejectedValue(new Error('registry unavailable')),
			});
			const tool = createMcpServersTool(makeContext(mcpService));

			await expect(executeTool(tool, { action: 'search', queries: ['notion'] })).rejects.toThrow(
				'registry unavailable',
			);
		});
	});

	describe('connect', () => {
		it('suspends with the unconnected servers and the reason', async () => {
			const tool = createMcpServersTool(makeContext(makeService([notion])));
			const { ctx, suspend } = suspendingContext();

			await executeTool(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'To read your Notion pages' },
				ctx,
			);

			const payload = suspend.mock.calls[0][0] as SuspendPayload;
			expect(payload.message).toBe('To read your Notion pages');
			expect(payload.requestId).toBeTruthy();
			expect(payload.mcpConnectRequest).toEqual({
				servers: [
					{
						serverSlug: 'notion',
						title: 'Notion',
						credentialType: 'notionMcpOAuth2Api',
						tagline: 'Work with Notion pages and databases',
					},
				],
			});
		});

		it('offers an already-connected server too, so its credential can be switched', async () => {
			const mcpService = makeService([notion, linear], withConnections('linear'));
			const tool = createMcpServersTool(makeContext(mcpService));
			const { ctx, suspend } = suspendingContext();

			await executeTool(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'linear'], reason: 'Because' },
				ctx,
			);

			const payload = suspend.mock.calls[0][0] as SuspendPayload;
			expect(payload.mcpConnectRequest.servers.map((s) => s.serverSlug)).toEqual([
				'notion',
				'linear',
			]);
		});

		it('tells the agent to search first when no slug resolves', async () => {
			const tool = createMcpServersTool(makeContext(makeService([notion])));
			const { ctx, suspend } = suspendingContext();

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['made-up'], reason: 'Because' },
				ctx,
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(output.connectedSlugs).toEqual([]);
			expect(output.message).toContain('made-up');
			expect(output.message).toContain('action: "search"');
		});

		it('rejects more than three suggestions', async () => {
			const tool = createMcpServersTool(makeContext(makeService([notion])));

			await expect(
				executeTool(
					tool,
					{ action: 'connect', serverSlugs: ['a', 'b', 'c', 'd'], reason: 'Because' },
					suspendingContext().ctx,
				),
			).rejects.toThrow();
		});

		it('rejects a connect that omits the slugs or the reason', async () => {
			const tool = createMcpServersTool(makeContext(makeService([notion])));
			const { ctx, suspend } = suspendingContext();

			await expect(
				executeTool(tool, { action: 'connect', reason: 'Because' }, ctx),
			).rejects.toThrow();
			await expect(
				executeTool(tool, { action: 'connect', serverSlugs: ['notion'] }, ctx),
			).rejects.toThrow();
			expect(suspend).not.toHaveBeenCalled();
		});

		it('reports only the slugs the server confirms are connected', async () => {
			const mcpService = makeService([notion], withConnections('notion'));
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'Because' },
				{ resumeData: { approved: true, connectedSlugs: ['notion'] } },
			);

			expect(output.connectedSlugs).toEqual(['notion']);
			expect(output.message).toContain('search_tools');
			expect(output.message).toContain('available now');
		});

		it('ignores a client claim the server cannot confirm', async () => {
			const mcpService = makeService([notion], withConnections());
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'Because' },
				{ resumeData: { approved: true, connectedSlugs: ['notion'] } },
			);

			expect(output.connectedSlugs).toEqual([]);
			expect(output.message).toContain('No connection was created');
		});

		it('reports a skip when the user declined to connect', async () => {
			const mcpService = makeService([notion], withConnections());
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'Because' },
				{ resumeData: { approved: false } },
			);

			expect(output.connectedSlugs).toEqual([]);
			expect(output.message).toContain('chose not to connect');
			expect(output.message).not.toContain('card');
			expect(output.message).toContain('for this request');
			expect(output.message).toContain('next turn');
		});

		it('still reports a connection made before the user skipped the rest', async () => {
			const mcpService = makeService([notion], withConnections('notion'));
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'Because' },
				{ resumeData: { approved: false, connectedSlugs: ['notion'] } },
			);

			expect(output.connectedSlugs).toEqual(['notion']);
		});

		it('does not credit the card for a server connected before it appeared', async () => {
			const mcpService = makeService([notion, linear], withConnections('linear'));
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'linear'], reason: 'Because' },
				{ resumeData: { approved: false, connectedSlugs: [] } },
			);

			expect(output.connectedSlugs).toEqual([]);
		});
	});
});
