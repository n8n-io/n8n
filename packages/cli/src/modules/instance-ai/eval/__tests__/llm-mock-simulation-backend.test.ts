import type { SimulatedAgent } from '@/modules/agents/simulation/tool-simulation.contracts';

import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { LlmMockSimulationBackend } from '../llm-mock-simulation-backend';
import { createLlmMockHandler } from '../mock-handler';

vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));

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
		{ toolName: 'linear', kind: 'mcp' },
		{ toolName: 'web_search', kind: 'web_search' },
		{ toolName: 'my_code', kind: 'custom' },
	],
};

function setup() {
	const httpMock = vi.fn();
	vi.mocked(createLlmMockHandler).mockReturnValue(httpMock);
	vi.mocked(generateAgentScenarioSeed).mockResolvedValue(seed);
	return { backend: new LlmMockSimulationBackend(), httpMock };
}

describe('LlmMockSimulationBackend', () => {
	beforeEach(() => vi.clearAllMocks());

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
				tools: [expect.objectContaining({ name: 'Send_Slack', kind: 'node' })],
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
});
