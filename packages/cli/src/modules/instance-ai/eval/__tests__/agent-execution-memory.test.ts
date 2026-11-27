import type { GenerateResult } from '@n8n/agents';
import type { AgentJsonConfig, InstanceAiEvalAgentExecutionRequest } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AgentEvaluationService } from '@/modules/agents/evaluation/agent-evaluation.service';
import type { AgentEvaluationPreparation } from '@/modules/agents/evaluation/agent-evaluation.contracts';

import { EvalAgentExecutionService } from '../agent-execution.service';
import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { createLlmMockHandler } from '../mock-handler';

vi.mock('@/modules/agents/evaluation/agent-evaluation.service', () => ({
	AgentEvaluationService: class AgentEvaluationService {},
}));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));
vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mcp-mock-fetch', () => ({ createMcpMockFetch: vi.fn(() => vi.fn()) }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));

const agentEvaluation = mock<AgentEvaluationService>();
const user = mock<User>({ id: 'user-1' });
const buildRuntime = vi.fn();

const memory = {
	enabled: true,
	storage: 'n8n',
	episodicMemory: { enabled: true, credential: 'cred-embed' },
} as AgentJsonConfig['memory'];

const config = {
	name: 'Order agent',
	model: 'openai/gpt-5',
	credential: 'cred-1',
	instructions: 'Help with orders.',
	memory,
} as unknown as AgentJsonConfig;

const seed = {
	openingMessage: 'Where is order #123?',
	globalContext: 'Customer jane@example.com',
	toolHints: {},
	warnings: [],
};

const THREAD_A = '6f1c1d2e-0000-4000-8000-00000000000a';

function reply(text: string, overrides: Partial<GenerateResult> = {}): GenerateResult {
	return {
		runId: `run-${text}`,
		messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
		toolCalls: [],
		finishReason: 'stop',
		getState: vi.fn(),
		...overrides,
	} as unknown as GenerateResult;
}

function buildService() {
	const executionsConfig = mock<ExecutionsConfig>();
	Object.defineProperty(executionsConfig, 'mode', { get: () => 'regular' });
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(true);
	return new EvalAgentExecutionService(
		mock<Logger>(),
		executionsConfig,
		moduleRegistry,
		mock<OutboundHttp>(),
	);
}

function turn(
	threadId: string,
	resourceId: string,
	message?: string,
	expectedTurn = 1,
): InstanceAiEvalAgentExecutionRequest {
	return {
		projectId: 'proj-1',
		scenarioHints: 'Customer asks about an order',
		thread: { threadId, resourceId, expectedTurn, ...(message !== undefined ? { message } : {}) },
	};
}

describe('EvalAgentExecutionService with memory (AGENT-1666)', () => {
	let generate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(AgentEvaluationService, agentEvaluation);
		vi.mocked(generateAgentScenarioSeed).mockResolvedValue(seed);
		vi.mocked(createLlmMockHandler).mockReturnValue(vi.fn());
		const preparation: AgentEvaluationPreparation = {
			config,
			tools: [],
			skippedFeatures: [],
			buildRuntime,
		};
		agentEvaluation.prepare.mockResolvedValue({ preparation });
		generate = vi.fn();
		buildRuntime.mockImplementation(async () => ({ generate, close: vi.fn() }));
	});

	afterEach(() => {
		Container.reset();
	});

	it('prepares the Agent with the request agentRun and reports the memory config it ran with', async () => {
		generate.mockResolvedValueOnce(reply('Noted.'));
		const agentRun = {
			keepMemory: true,
			configOverrides: { memory: { episodicMemory: { topK: 3 } } },
		};

		const result = await buildService().executeWithLlmMock('agent-1', user, {
			...turn(THREAD_A, 'user-a'),
			agentRun,
		});

		expect(agentEvaluation.prepare).toHaveBeenCalledWith(user, 'proj-1', 'agent-1', agentRun);
		expect(result.memoryConfig).toEqual(memory);
	});

	it('reports no memory config when the prepared Agent has memory off', async () => {
		agentEvaluation.prepare.mockResolvedValue({
			preparation: {
				config: { ...config, memory: undefined },
				tools: [],
				skippedFeatures: [],
				buildRuntime,
			},
		});
		generate.mockResolvedValueOnce(reply('Hi.'));

		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a'),
		);

		expect(result.memoryConfig).toBeUndefined();
	});
});
