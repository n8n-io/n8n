import { isZodSchema, zodToJsonSchema } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiMcpService, McpRegistryServerSummary } from '../types';
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

function makeServers(count: number): McpRegistryServerSummary[] {
	return Array.from({ length: count }, (_, index) => ({
		slug: `server-${index}`,
		title: `Server ${index}`,
		description: 'An API service',
		credentialType: `server${index}McpOAuth2Api`,
		tools: [`tool_${index}`],
	}));
}

function makeContext(mcpService?: InstanceAiMcpService): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.mcpService = mcpService;
	return context;
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
		listConnectedSlugs: vi.fn().mockResolvedValue(new Set<string>()),
		...overrides,
	};
}

interface SearchOutput {
	results: McpRegistryServerSummary[];
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

describe('mcp-servers tool', () => {
	describe('input schema', () => {
		it('is a top-level object rather than a bare union', () => {
			const schema = inputJsonSchema();

			expect(schema.type).toBe('object');
			expect(schema.anyOf).toBeUndefined();
			expect(schema.oneOf).toBeUndefined();
		});

		it('offers both actions and every per-action field', () => {
			const schema = inputJsonSchema();

			expect(property(schema, 'action').enum).toEqual(['search', 'connect']);
			expect(Object.keys(schema.properties ?? {})).toEqual(
				expect.arrayContaining(['action', 'queries', 'serverSlugs', 'reason']),
			);
		});

		it('requires only the action, leaving the rest to the handler', () => {
			expect(inputJsonSchema().required).toEqual(['action']);
		});

		it('tells the model to introduce the card in the same turn as the call', () => {
			const { description } = createMcpServersTool(makeContext(makeService([])));

			expect(description).toContain('In the same turn as a `connect` call');
		});

		// The model parrots UI nouns back: this once printed "opening the connection
		// card now" above the card itself.
		it('does not name the UI', () => {
			const { description } = createMcpServersTool(makeContext(makeService([])));

			expect(description).not.toContain('card');
		});

		// Never deferred, so this description always sits beside the system prompt.
		it('leaves when to reach for it to the system prompt', () => {
			const { description } = createMcpServersTool(makeContext(makeService([])));

			expect(description).not.toContain('unavailable');
		});

		it('separates itself from the credentials a workflow node runs with', () => {
			const { description } = createMcpServersTool(makeContext(makeService([])));

			expect(description).toContain('`credentials`');
			expect(description).toContain('when a workflow runs');
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

	describe('search', () => {
		it('passes the queries through and returns the matching servers', async () => {
			const mcpService = makeService([notion, linear]);
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				queries: ['notion', 'linear'],
			});

			expect(mcpService.search).toHaveBeenCalledWith(['notion', 'linear']);
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

		it('returns no results when nothing matches', async () => {
			const tool = createMcpServersTool(makeContext(makeService([])));

			const output = await executeTool<SearchOutput>(tool, {
				action: 'search',
				queries: ['nothing-like-this'],
			});

			expect(output.results).toEqual([]);
		});

		it('points at the connect action whenever something was found', async () => {
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

		// The flattened provider schema marks every per-action field optional, so the
		// handler is the only thing still enforcing them.
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

		it('only offers the servers that are not connected yet', async () => {
			const mcpService = makeService([notion, linear], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['linear'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));
			const { ctx, suspend } = suspendingContext();

			await executeTool(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'linear'], reason: 'Because' },
				ctx,
			);

			const payload = suspend.mock.calls[0][0] as SuspendPayload;
			expect(payload.mcpConnectRequest.servers.map((s) => s.serverSlug)).toEqual(['notion']);
		});

		it('is a no-op when every requested server is already connected', async () => {
			const mcpService = makeService([linear], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['linear'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));
			const { ctx, suspend } = suspendingContext();

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['linear'], reason: 'Because' },
				ctx,
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(output.connectedSlugs).toEqual(['linear']);
			expect(output.message).toContain('Already connected');
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

		it('reports a connected server the registry no longer resolves as connected', async () => {
			const mcpService = makeService([], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['notion'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));
			const { ctx, suspend } = suspendingContext();

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'Because' },
				ctx,
			);

			expect(suspend).not.toHaveBeenCalled();
			expect(output.connectedSlugs).toEqual(['notion']);
			expect(output.message).toContain('Already connected');
		});

		it('does not call a connected server the registry dropped an invented slug', async () => {
			const mcpService = makeService([linear], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['notion', 'linear'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'linear'], reason: 'Because' },
				{ resumeData: { approved: true, connectedSlugs: ['linear'] } },
			);

			expect(output.connectedSlugs).toEqual(['linear']);
			expect(output.message).not.toContain('No tool matches');
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

		it('names an invented slug alongside the servers it did resolve', async () => {
			const tool = createMcpServersTool(makeContext(makeService([notion])));
			const { ctx, suspend } = suspendingContext();

			await executeTool(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'made-up'], reason: 'Because' },
				ctx,
			);

			const payload = suspend.mock.calls[0][0] as SuspendPayload;
			expect(payload.mcpConnectRequest.servers.map((s) => s.serverSlug)).toEqual(['notion']);
		});

		it('corrects an invented slug in the result the model reads', async () => {
			const mcpService = makeService([notion], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['notion'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'made-up'], reason: 'Because' },
				{ resumeData: { approved: true, connectedSlugs: ['notion'] } },
			);

			expect(output.connectedSlugs).toEqual(['notion']);
			expect(output.message).toContain('made-up');
		});

		it('reports only the slugs the server confirms are connected', async () => {
			const mcpService = makeService([notion], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['notion'])),
			});
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
			const mcpService = makeService([notion], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set<string>()),
			});
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
			const mcpService = makeService([notion], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set<string>()),
			});
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
			const mcpService = makeService([notion], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['notion'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion'], reason: 'Because' },
				{ resumeData: { approved: false, connectedSlugs: ['notion'] } },
			);

			expect(output.connectedSlugs).toEqual(['notion']);
		});

		it('does not credit the card for a server connected before it appeared', async () => {
			const mcpService = makeService([notion, linear], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['linear'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'linear'], reason: 'Because' },
				{ resumeData: { approved: false, connectedSlugs: [] } },
			);

			expect(output.connectedSlugs).toEqual([]);
		});

		it('credits nothing when the client sends no connection report at all', async () => {
			const mcpService = makeService([notion, linear], {
				listConnectedSlugs: vi.fn().mockResolvedValue(new Set(['linear'])),
			});
			const tool = createMcpServersTool(makeContext(mcpService));

			const output = await executeTool<ConnectOutput>(
				tool,
				{ action: 'connect', serverSlugs: ['notion', 'linear'], reason: 'Because' },
				{ resumeData: { approved: true } },
			);

			expect(output.connectedSlugs).toEqual([]);
		});
	});
});
