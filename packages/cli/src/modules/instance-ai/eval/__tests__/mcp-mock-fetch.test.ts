import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { createMcpMockFetch, type McpMockToolCall } from '../mcp-mock-fetch';

const generate = vi.fn();
const extractText = vi.fn();

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => ({ generate })),
	extractText: (result: unknown) => extractText(result) as string,
}));

const logger = mock<Logger>();

const toolsListJson = JSON.stringify({
	tools: [
		{
			name: 'search_articles',
			description: 'Search knowledge-base articles',
			inputSchema: {
				type: 'object',
				properties: { query: { type: 'string' } },
				required: ['query'],
			},
		},
	],
});

function buildFetch(overrides: { onToolCall?: (call: McpMockToolCall) => void } = {}) {
	return createMcpMockFetch({
		servers: [{ name: 'acme_kb', url: 'https://mcp.acme-kb.example/mcp' }],
		agentInstructions: 'Answer product questions from the acme knowledge base.',
		scenarioHints: 'The KB contains an article saying the export limit is 10k rows.',
		globalContext: 'Acme product docs',
		serverHints: { acme_kb: 'Articles about export limits' },
		onToolCall: overrides.onToolCall ?? vi.fn(),
		logger,
	});
}

function rpc(method: string, params?: unknown, id: number | null = 1) {
	return {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ jsonrpc: '2.0', ...(id === null ? {} : { id }), method, params }),
	};
}

describe('createMcpMockFetch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		generate.mockResolvedValue({ messages: [] });
	});

	it('answers the initialize handshake deterministically with a session id', async () => {
		const fetchFn = buildFetch();
		const res = await fetchFn('https://mcp.acme-kb.example/mcp', {
			...rpc('initialize', {
				protocolVersion: '2025-06-18',
				capabilities: {},
				clientInfo: { name: '@n8n/agents', version: '0.1.0' },
			}),
		});

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('application/json');
		expect(res.headers.get('mcp-session-id')).toBeTruthy();
		const body = (await res.json()) as {
			result: { protocolVersion: string; serverInfo: { name: string } };
		};
		expect(body.result.protocolVersion).toBe('2025-06-18');
		expect(body.result.serverInfo.name).toBe('acme_kb');
		expect(generate).not.toHaveBeenCalled();
	});

	it('accepts notifications with 202 and rejects GET with 405', async () => {
		const fetchFn = buildFetch();
		const notification = await fetchFn('https://mcp.acme-kb.example/mcp', {
			...rpc('notifications/initialized', {}, null),
		});
		expect(notification.status).toBe(202);

		const get = await fetchFn('https://mcp.acme-kb.example/mcp', { method: 'GET' });
		expect(get.status).toBe(405);
	});

	it('serves an LLM-designed tool catalog and caches it per server', async () => {
		extractText.mockReturnValue(toolsListJson);
		const fetchFn = buildFetch();

		const first = await fetchFn('https://mcp.acme-kb.example/mcp', { ...rpc('tools/list') });
		const body = (await first.json()) as { result: { tools: Array<{ name: string }> } };
		expect(body.result.tools.map((tool) => tool.name)).toEqual(['search_articles']);

		await fetchFn('https://mcp.acme-kb.example/mcp', { ...rpc('tools/list', undefined, 2) });
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it('generates tool-call results, records them, and caches identical calls', async () => {
		extractText
			.mockReturnValueOnce(toolsListJson)
			.mockReturnValue(JSON.stringify({ text: 'The export limit is 10k rows (article KB-42).' }));
		const calls: McpMockToolCall[] = [];
		const fetchFn = buildFetch({ onToolCall: (call) => calls.push(call) });

		const res = await fetchFn('https://mcp.acme-kb.example/mcp', {
			...rpc('tools/call', { name: 'search_articles', arguments: { query: 'export limit' } }),
		});
		const body = (await res.json()) as {
			result: { content: Array<{ type: string; text: string }>; isError?: boolean };
		};
		expect(body.result.content[0].text).toContain('10k rows');
		expect(body.result.isError).toBeUndefined();
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ serverName: 'acme_kb', toolName: 'search_articles' });

		// Identical call → cached generation, but still recorded per call.
		await fetchFn('https://mcp.acme-kb.example/mcp', {
			...rpc('tools/call', { name: 'search_articles', arguments: { query: 'export limit' } }, 3),
		});
		expect(calls).toHaveLength(2);
		expect(generate).toHaveBeenCalledTimes(2); // 1 list + 1 call
	});

	it('returns isError results when the scenario mandates a failure', async () => {
		extractText
			.mockReturnValueOnce(toolsListJson)
			.mockReturnValue(JSON.stringify({ isError: true, text: 'article not found' }));
		const fetchFn = buildFetch();

		const res = await fetchFn('https://mcp.acme-kb.example/mcp', {
			...rpc('tools/call', { name: 'search_articles', arguments: { query: 'missing' } }),
		});
		const body = (await res.json()) as { result: { isError?: boolean } };
		expect(body.result.isError).toBe(true);
	});

	it('degrades to a generic fallback tool when catalog generation fails twice', async () => {
		extractText.mockReturnValue('not json');
		const fetchFn = buildFetch();

		const res = await fetchFn('https://mcp.acme-kb.example/mcp', { ...rpc('tools/list') });
		const body = (await res.json()) as { result: { tools: Array<{ name: string }> } };
		expect(body.result.tools.map((tool) => tool.name)).toEqual(['query']);
	});

	it('pins the catalog to canonical registry tools regardless of what the generator returns', async () => {
		// Generator returns one matching name (schema kept) and one invented
		// name (dropped) — the served catalog must be exactly the canonical set.
		extractText.mockReturnValue(
			JSON.stringify({
				tools: [
					{
						name: 'notion-search',
						description: 'invented description',
						inputSchema: {
							type: 'object',
							properties: { query: { type: 'string' } },
							required: ['query'],
						},
					},
					{ name: 'made_up_tool', description: 'nope', inputSchema: { type: 'object' } },
				],
			}),
		);
		const fetchFn = createMcpMockFetch({
			servers: [{ name: 'notion', url: 'https://mcp.notion.com/mcp' }],
			agentInstructions: 'Save notes to Notion.',
			knownToolsByServer: {
				notion: [
					{ name: 'notion-search', description: 'Search Notion and connected sources' },
					{ name: 'notion-create-pages', description: 'Create pages in Markdown' },
				],
			},
			onToolCall: vi.fn(),
			logger,
		});

		const res = await fetchFn('https://mcp.notion.com/mcp', { ...rpc('tools/list') });
		const body = (await res.json()) as {
			result: { tools: Array<{ name: string; description: string; inputSchema: unknown }> };
		};

		expect(body.result.tools.map((tool) => tool.name)).toEqual([
			'notion-search',
			'notion-create-pages',
		]);
		// Canonical description wins; the matching generated schema is kept.
		expect(body.result.tools[0].description).toBe('Search Notion and connected sources');
		expect(body.result.tools[0].inputSchema).toMatchObject({ required: ['query'] });
		// The unmatched canonical tool gets a permissive fallback schema.
		expect(body.result.tools[1].inputSchema).toMatchObject({ type: 'object' });
	});

	it('resolves the server on a path boundary, not by bare prefix', async () => {
		extractText.mockReturnValue(toolsListJson);
		const fetchFn = createMcpMockFetch({
			servers: [
				{ name: 'kb', url: 'https://mcp.example.com/mcp' },
				{ name: 'kb_two', url: 'https://mcp.example.com/mcp-two' },
			],
			agentInstructions: 'irrelevant',
			onToolCall: vi.fn(),
			logger,
		});

		const res = await fetchFn('https://mcp.example.com/mcp-two', {
			...rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: {} }),
		});
		const body = (await res.json()) as { result: { serverInfo: { name: string } } };
		expect(body.result.serverInfo.name).toBe('kb_two');
	});

	it('answers an unparseable body with a JSON-RPC parse error', async () => {
		const fetchFn = buildFetch();
		const res = await fetchFn('https://mcp.acme-kb.example/mcp', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: 'not json {',
		});
		const body = (await res.json()) as { id: unknown; error: { code: number } };
		expect(body.error.code).toBe(-32700);
		expect(body.id).toBeNull();
	});

	it('answers unknown methods with a JSON-RPC method-not-found error', async () => {
		const fetchFn = buildFetch();
		const res = await fetchFn('https://mcp.acme-kb.example/mcp', { ...rpc('tasks/create') });
		const body = (await res.json()) as { error: { code: number } };
		expect(body.error.code).toBe(-32601);
	});
});
