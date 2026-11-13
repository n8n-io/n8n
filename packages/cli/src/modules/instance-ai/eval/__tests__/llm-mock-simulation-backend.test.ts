import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { SimulatedAgent } from '@/modules/agents/simulation/tool-simulation.contracts';

import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { LlmMockSimulationBackend } from '../llm-mock-simulation-backend';
import { createMcpMockFetch } from '../mcp-mock-fetch';
import { createLlmMockHandler } from '../mock-handler';
import { createWebSearchMock } from '../web-search-mock';

vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mcp-mock-fetch', () => ({ createMcpMockFetch: vi.fn() }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));
vi.mock('../web-search-mock', () => ({ createWebSearchMock: vi.fn() }));

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
		{ toolName: 'linear', kind: 'mcp', url: 'https://mcp.linear.app/mcp' },
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

	it('continues a saved world without generating a new seed', async () => {
		const { backend } = setup();
		const first = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });
		vi.mocked(generateAgentScenarioSeed).mockClear();

		const second = await backend.openWorld({
			testChatId: 'chat-1',
			agent,
			firstMessage: 'a later turn',
			saved: first.save(),
		});

		expect(generateAgentScenarioSeed).not.toHaveBeenCalled();
		expect(second.worldId).toBe(first.worldId);
		expect(createLlmMockHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({ scenarioHints: 'hi', globalContext: seed.globalContext }),
		);
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
			{
				protocol: 'mcp',
				method: 'POST',
				url: 'https://mcp.linear.app/mcp',
				body: { method: 'tools/call' },
			},
			{ toolName: 'linear_create_issue', mcpServerName: 'linear' },
		);
		const searchReply = await world.handleRequest(
			{
				protocol: 'web_search',
				method: 'POST',
				url: 'simulation://web-search',
				body: { query: 'n8n' },
			},
			{ toolName: 'web_search' },
		);

		expect(mcpFetch).toHaveBeenCalledWith(
			'https://mcp.linear.app/mcp',
			expect.objectContaining({ method: 'POST', body: '{"method":"tools/call"}' }),
		);
		expect(mcpReply).toMatchObject({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: '{"jsonrpc":"2.0","id":1,"result":{}}',
		});
		expect(webSearch).toHaveBeenCalledWith({ query: 'n8n' });
		expect(searchReply).toMatchObject({ outcome: 'served', body: { results: [] } });
	});

	it('keeps the simulated writes of earlier turns in a saved world', async () => {
		const { backend } = setup();
		const first = await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'hi' });
		const firstOptions = vi.mocked(createLlmMockHandler).mock.calls[0][0];
		const write = {
			hostname: 'slack.com',
			method: 'POST',
			endpoint: '/api/chat.postMessage',
			nodeName: 'Send_Slack',
			body: '{"text":"v2"}',
		};
		firstOptions?.writeLedger?.push(write);

		const saved = structuredClone(first.save());
		await backend.openWorld({ testChatId: 'chat-1', agent, firstMessage: 'later', saved });

		expect(createLlmMockHandler).toHaveBeenLastCalledWith(
			expect.objectContaining({ writeLedger: [write] }),
		);
	});
});
