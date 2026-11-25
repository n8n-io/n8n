import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { SimulatedAgent } from '@/modules/agents/simulation/tool-simulation.contracts';

import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { LlmMockSimulationBackend } from '../llm-mock-simulation-backend';
import { createMcpMockFetch, MCP_MOCK_GENERATION_FAILURE_PREFIX } from '../mcp-mock-fetch';
import { createLlmMockHandler } from '../mock-handler';
import { createWebSearchMock, WEB_SEARCH_MOCK_FAILURE_NOTE } from '../web-search-mock';

vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mcp-mock-fetch', async (importOriginal) => ({
	...(await importOriginal<typeof import('../mcp-mock-fetch')>()),
	createMcpMockFetch: vi.fn(),
}));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));
vi.mock('../web-search-mock', async (importOriginal) => ({
	...(await importOriginal<typeof import('../web-search-mock')>()),
	createWebSearchMock: vi.fn(),
}));

const seed = {
	openingMessage: 'Post the release note',
	globalContext: 'Workspace acme, channel #releases',
	toolHints: { Send_Slack: 'Channel #releases exists' },
	warnings: [],
};

const agent: SimulatedAgent = {
	agentId: 'agent-1',
	projectId: 'project-1',
	name: 'Release bot',
	instructions: 'Post release notes',
	tools: [
		{ toolName: 'Send_Slack', kind: 'node', nodeType: 'n8n-nodes-base.slack' },
		{ toolName: 'linear', kind: 'mcp', origin: 'https://mcp.linear.app' },
		{ toolName: 'web_search', kind: 'web_search' },
		{ toolName: 'my_code', kind: 'custom' },
	],
};

function setup() {
	const httpMock = vi.fn();
	const mcpFetch = vi.fn();
	const webSearch = vi.fn();
	vi.mocked(createLlmMockHandler).mockReturnValue(httpMock);
	vi.mocked(createMcpMockFetch).mockReturnValue(mcpFetch);
	vi.mocked(createWebSearchMock).mockReturnValue(webSearch);
	vi.mocked(generateAgentScenarioSeed).mockResolvedValue(seed);
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(false);
	const backend = new LlmMockSimulationBackend(mock<Logger>(), moduleRegistry);
	return { backend, httpMock, mcpFetch, webSearch };
}

describe('LlmMockSimulationBackend', () => {
	// The backend loads the mocks when a world opens. Load them once here, so the first test
	// does not pay the import time.
	beforeAll(async () => {
		await import('../agent-execution.service.js');
	}, 60_000);

	beforeEach(() => vi.clearAllMocks());

	it('serves node, workflow, MCP and web search tools, and nothing else', async () => {
		const { backend } = setup();
		const withWorkflow: SimulatedAgent = {
			...agent,
			tools: [...agent.tools, { toolName: 'Lookup_workflow', kind: 'workflow' }],
		};

		await expect(backend.describeTools(withWorkflow)).resolves.toEqual([
			{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' },
			{ toolName: 'linear', kind: 'mcp', testability: 'simulated' },
			{ toolName: 'web_search', kind: 'web_search', testability: 'simulated' },
			expect.objectContaining({
				toolName: 'my_code',
				testability: 'blocked',
				reason: 'unsupported_by_simulator',
			}),
			{ toolName: 'Lookup_workflow', kind: 'workflow', testability: 'simulated' },
		]);
	});

	it('seeds a new world from the first message and answers HTTP with made-up replies', async () => {
		const { backend, httpMock } = setup();
		httpMock.mockResolvedValue({ statusCode: 200, headers: {}, body: { ok: true, ts: '1.2' } });

		const world = await backend.openWorld({
			testChatId: 'chat-1',
			agent,
			firstMessage: 'Post the release note',
		});
		const reply = await world.handleRequest(
			{
				protocol: 'http',
				method: 'POST',
				url: 'https://slack.com/api/chat.postMessage',
				body: { text: 'v2' },
			},
			{ toolCallId: 'tc-1', toolName: 'Send_Slack', nodeType: 'n8n-nodes-base.slack' },
		);

		expect(generateAgentScenarioSeed).toHaveBeenCalledWith(
			expect.objectContaining({
				agentName: 'Release bot',
				scenarioHints: 'Post the release note',
				tools: [
					expect.objectContaining({ name: 'Send_Slack', kind: 'node' }),
					expect.objectContaining({ name: 'linear', kind: 'mcp' }),
					expect.objectContaining({ name: 'web_search', kind: 'other' }),
				],
			}),
		);
		expect(httpMock).toHaveBeenCalledWith(
			expect.objectContaining({ url: 'https://slack.com/api/chat.postMessage', method: 'POST' }),
			expect.objectContaining({ type: 'n8n-nodes-base.slack', name: 'Send_Slack' }),
		);
		expect(reply).toEqual({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			headers: {},
			body: { ok: true, ts: '1.2' },
		});
	});

	it('says unavailable when the mock failed to generate a reply, so the call is blocked', async () => {
		const { backend, httpMock } = setup();
		httpMock.mockResolvedValue({
			statusCode: 200,
			headers: {},
			body: { _evalMockError: true, message: 'Mock generation failed: timeout' },
		});
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		await expect(
			world.handleRequest(
				{ protocol: 'http', method: 'GET', url: 'https://slack.com/api/conversations.list' },
				{ toolName: 'Send_Slack', nodeType: 'n8n-nodes-base.slack' },
			),
		).resolves.toMatchObject({ outcome: 'unavailable' });
	});

	it('says unsupported when the mock has no answer, so the call is blocked', async () => {
		const { backend, httpMock } = setup();
		httpMock.mockResolvedValue(undefined);
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		await expect(
			world.handleRequest(
				{ protocol: 'http', method: 'GET', url: 'https://example.com' },
				{ toolName: 'Send_Slack' },
			),
		).resolves.toMatchObject({ outcome: 'unsupported' });
	});

	it('says unavailable when the MCP or web search mock failed to generate a reply', async () => {
		const { backend, mcpFetch, webSearch } = setup();
		mcpFetch.mockResolvedValue(
			new Response('{"jsonrpc":"2.0","id":1,"error":{"code":-32603,"message":"timeout"}}', {
				status: 200,
			}),
		);
		webSearch.mockResolvedValue({ query: 'n8n', results: [], note: WEB_SEARCH_MOCK_FAILURE_NOTE });
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		const mcpReply = await world.handleRequest(
			{ protocol: 'mcp', server: 'linear', method: 'POST', body: {} },
			{ toolName: 'linear_create_issue' },
		);
		const searchReply = await world.handleRequest(
			{ protocol: 'web_search', args: { query: 'n8n' } },
			{ toolName: 'web_search' },
		);

		expect(mcpReply).toMatchObject({ outcome: 'unavailable' });
		expect(searchReply).toMatchObject({ outcome: 'unavailable' });
	});

	it('says unavailable when the MCP mock failed to generate a tool result', async () => {
		const { backend, mcpFetch } = setup();
		mcpFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					result: {
						content: [
							{ type: 'text', text: `${MCP_MOCK_GENERATION_FAILURE_PREFIX} "create_issue"` },
						],
						isError: true,
					},
				}),
				{ status: 200 },
			),
		);
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		const reply = await world.handleRequest(
			{ protocol: 'mcp', server: 'linear', method: 'POST', body: { method: 'tools/call' } },
			{ toolName: 'linear_create_issue' },
		);

		expect(reply).toMatchObject({ outcome: 'unavailable' });
	});

	it('serves an error that the mock made up as a tool result', async () => {
		const { backend, mcpFetch } = setup();
		mcpFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					jsonrpc: '2.0',
					id: 1,
					result: { content: [{ type: 'text', text: 'Issue FIN-9 not found' }], isError: true },
				}),
				{ status: 200 },
			),
		);
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		const reply = await world.handleRequest(
			{ protocol: 'mcp', server: 'linear', method: 'POST', body: { method: 'tools/call' } },
			{ toolName: 'linear_get_issue' },
		);

		expect(reply).toMatchObject({ outcome: 'served', source: 'made_up' });
	});

	it('does not ask the mock when the run is already stopped', async () => {
		const { backend, httpMock, mcpFetch, webSearch } = setup();
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });
		const controller = new AbortController();
		controller.abort();

		for (const request of [
			{ protocol: 'http' as const, method: 'POST', url: 'https://slack.com/api/x', headers: {} },
			{ protocol: 'mcp' as const, server: 'linear', method: 'POST', body: {} },
			{ protocol: 'web_search' as const, args: { query: 'n8n' } },
		]) {
			await expect(
				world.handleRequest(request as never, { toolName: 't', signal: controller.signal }),
			).rejects.toThrow('The test run was stopped.');
		}
		expect(httpMock).not.toHaveBeenCalled();
		expect(mcpFetch).not.toHaveBeenCalled();
		expect(webSearch).not.toHaveBeenCalled();
	});

	it('stops waiting for a generation when the run stops', async () => {
		const { backend, httpMock } = setup();
		httpMock.mockReturnValue(new Promise(() => {}));
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });
		const controller = new AbortController();

		const reply = world.handleRequest(
			{ protocol: 'http', method: 'POST', url: 'https://slack.com/api/x', headers: {} },
			{ toolName: 'Send_Slack', signal: controller.signal },
		);
		controller.abort();

		await expect(reply).rejects.toThrow('The test run was stopped.');
		expect(httpMock).toHaveBeenCalledWith(
			expect.objectContaining({ abortSignal: controller.signal }),
			expect.anything(),
		);
	});

	it('gives the stop signal to the web search mock', async () => {
		const { backend, webSearch } = setup();
		webSearch.mockReturnValue(new Promise(() => {}));
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });
		const controller = new AbortController();

		const reply = world.handleRequest(
			{ protocol: 'web_search', args: { query: 'n8n' } },
			{ toolName: 'web_search', signal: controller.signal },
		);
		controller.abort();

		await expect(reply).rejects.toThrow('The test run was stopped.');
		expect(webSearch).toHaveBeenCalledWith({ query: 'n8n' }, { signal: controller.signal });
	});

	it('answers MCP and web search through their mocks', async () => {
		const { backend, mcpFetch, webSearch } = setup();
		mcpFetch.mockResolvedValue(
			new Response('{"jsonrpc":"2.0","id":1,"result":{}}', {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
		webSearch.mockResolvedValue({ results: [] });
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		const mcpReply = await world.handleRequest(
			{ protocol: 'mcp', server: 'linear', method: 'POST', body: { method: 'tools/call' } },
			{ toolName: 'linear_create_issue' },
		);
		const searchReply = await world.handleRequest(
			{ protocol: 'web_search', args: { query: 'n8n' } },
			{ toolName: 'web_search' },
		);

		// Known to the mock by a URL made from its name, under its origin.
		expect(mcpFetch).toHaveBeenCalledWith(
			'https://mcp.linear.app/n8n-mcp-server/linear',
			expect.objectContaining({ method: 'POST', body: '{"method":"tools/call"}' }),
		);
		expect(mcpReply).toMatchObject({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: '{"jsonrpc":"2.0","id":1,"result":{}}',
		});
		expect(webSearch).toHaveBeenCalledWith({ query: 'n8n' }, { signal: undefined });
		expect(searchReply).toMatchObject({ outcome: 'served', body: { results: [] } });
	});

	it.each([
		['https://user:secret@mcp.acme.io/mcp/key-123?token=abc', 'https://mcp.acme.io'],
		['ftp://mcp.acme.io/key-123', 'https://mcp.invalid'],
		['not a url', 'https://mcp.invalid'],
	])('gives the mock only the origin of the MCP URL %s', async (origin, expected) => {
		const { backend } = setup();
		await backend.openWorld({
			testChatId: 'chat-1',
			agent: { ...agent, tools: [{ toolName: 'acme', kind: 'mcp', origin }] },
			firstMessage: 'hi',
		});

		const { servers } = vi.mocked(createMcpMockFetch).mock.calls[0][0];
		expect(servers).toEqual([
			expect.objectContaining({ url: `${expected}/n8n-mcp-server/acme`, origin: expected }),
		]);
	});

	it('answers an MCP server it does not know with unsupported', async () => {
		const { backend, mcpFetch } = setup();
		const world = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });

		const reply = await world.handleRequest(
			{ protocol: 'mcp', server: 'other', method: 'POST', body: {} },
			{ toolName: 'other_tool' },
		);

		expect(reply).toMatchObject({ outcome: 'unsupported' });
		expect(mcpFetch).not.toHaveBeenCalled();
	});
});
