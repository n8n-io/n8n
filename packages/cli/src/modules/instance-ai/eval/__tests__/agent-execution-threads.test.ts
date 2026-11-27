import type { AgentMessage, GenerateResult } from '@n8n/agents';
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
import { createMcpMockFetch } from '../mcp-mock-fetch';
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

const config = {
	name: 'Order agent',
	model: 'openai/gpt-5',
	credential: 'cred-1',
	instructions: 'Help with orders.',
} as unknown as AgentJsonConfig;

const seed = {
	openingMessage: 'Where is order #123?',
	globalContext: 'Customer jane@example.com',
	toolHints: {},
	warnings: [],
};

const THREAD_A = '6f1c1d2e-0000-4000-8000-00000000000a';
const THREAD_B = '6f1c1d2e-0000-4000-8000-00000000000b';

function userText(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

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

/** The messages the agent saw on each `generate` call. */
function generateInputs(generate: ReturnType<typeof vi.fn>): unknown[] {
	return generate.mock.calls.map((call: unknown[]) => call[0]);
}

function turn(
	threadId: string,
	resourceId: string,
	message?: string,
): InstanceAiEvalAgentExecutionRequest {
	return {
		projectId: 'proj-1',
		scenarioHints: 'Customer asks about an order',
		thread: { threadId, resourceId, ...(message !== undefined ? { message } : {}) },
	};
}

describe('EvalAgentExecutionService multi-turn threads', () => {
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

	it('opens a thread with the seeded opening message and echoes the thread', async () => {
		generate.mockResolvedValueOnce(reply('It ships tomorrow.'));

		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a'),
		);

		expect(result.success).toBe(true);
		expect(result.finalText).toBe('It ships tomorrow.');
		expect(result.thread).toEqual({
			threadId: THREAD_A,
			resourceId: 'user-a',
			turn: 1,
			userMessage: seed.openingMessage,
		});
		expect(generateInputs(generate)).toEqual([[userText(seed.openingMessage)]]);
	});

	it('keeps one thread across three turns: each turn sees the earlier ones', async () => {
		const service = buildService();
		generate
			.mockResolvedValueOnce(reply('It ships tomorrow.'))
			.mockResolvedValueOnce(reply('Changed to express.'))
			.mockResolvedValueOnce(reply('You are welcome.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a', 'Make it express'));
		const third = await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Thanks'),
		);

		expect(third.thread?.turn).toBe(3);
		expect(generateInputs(generate)[2]).toEqual([
			userText(seed.openingMessage),
			{ role: 'assistant', content: [{ type: 'text', text: 'It ships tomorrow.' }] },
			userText('Make it express'),
			{ role: 'assistant', content: [{ type: 'text', text: 'Changed to express.' }] },
			userText('Thanks'),
		]);
		// One world per simulated user: the seed (and the mocks it steers) is made once.
		expect(generateAgentScenarioSeed).toHaveBeenCalledTimes(1);
		expect(createMcpMockFetch).toHaveBeenCalledTimes(1);
	});

	it('reports only the tool calls of the current turn', async () => {
		const service = buildService();
		generate
			.mockResolvedValueOnce(
				reply('Found it.', { toolCalls: [{ tool: 'lookup', input: {}, output: {} }] }),
			)
			.mockResolvedValueOnce(reply('Done.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		const second = await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Cancel it'),
		);

		expect(second.toolCalls).toEqual([]);
	});

	it('starts a new thread for the same user with no earlier messages but the same world', async () => {
		const service = buildService();
		generate
			.mockResolvedValueOnce(reply('Noted your nut allergy.'))
			.mockResolvedValueOnce(reply('Here is a nut-free menu.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		const second = await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_B, 'user-a', 'What can I order tonight?'),
		);

		expect(second.thread).toMatchObject({ threadId: THREAD_B, resourceId: 'user-a', turn: 1 });
		expect(generateInputs(generate)[1]).toEqual([userText('What can I order tonight?')]);
		expect(second.seed).toEqual(seed);
		expect(generateAgentScenarioSeed).toHaveBeenCalledTimes(1);
	});

	it('gives each simulated user its own world', async () => {
		const service = buildService();
		generate.mockResolvedValue(reply('Hi.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		await service.executeWithLlmMock('agent-1', user, turn(THREAD_B, 'user-b'));

		expect(generateAgentScenarioSeed).toHaveBeenCalledTimes(2);
	});

	it('refuses to continue a thread without a message', async () => {
		const service = buildService();
		generate.mockResolvedValue(reply('Hi.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		const result = await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/needs a message/);
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it('refuses a thread that belongs to another simulated user', async () => {
		const service = buildService();
		generate.mockResolvedValue(reply('Hi.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		const result = await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-b', 'Hello'),
		);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/belongs to another resource/);
	});

	it('refuses a simulated user that was made for another Agent', async () => {
		const service = buildService();
		generate.mockResolvedValue(reply('Hi.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		const result = await service.executeWithLlmMock(
			'agent-2',
			user,
			turn(THREAD_B, 'user-a', 'Hello'),
		);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/another Agent/);
	});

	it('does not add a failed turn to the thread', async () => {
		const service = buildService();
		generate
			.mockResolvedValueOnce(reply('It ships tomorrow.'))
			.mockRejectedValueOnce(new Error('provider down'))
			.mockResolvedValueOnce(reply('Express it is.'));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		const failed = await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Make it express'),
		);
		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a', 'Make it express'));

		expect(failed.success).toBe(false);
		expect(generateInputs(generate)[2]).toEqual([
			userText(seed.openingMessage),
			{ role: 'assistant', content: [{ type: 'text', text: 'It ships tomorrow.' }] },
			userText('Make it express'),
		]);
	});

	it('keeps only the text of a turn that needed approvals', async () => {
		const service = buildService();
		const suspended = reply('', {
			messages: [
				{
					role: 'assistant',
					content: [{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'refund', input: {} }],
				},
			] as unknown as GenerateResult['messages'],
			pendingSuspend: [
				{ runId: 'run-1', toolCallId: 'tc-1', toolName: 'refund', input: {}, suspendPayload: {} },
			],
		});
		generate.mockResolvedValueOnce(suspended).mockResolvedValueOnce(reply('Anything else?'));
		const approve = vi.fn().mockResolvedValue(reply('Refunded.'));
		buildRuntime.mockImplementation(async () => ({ generate, approve, close: vi.fn() }));

		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a'));
		await service.executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a', 'Thanks'));

		expect(generateInputs(generate)[1]).toEqual([
			userText(seed.openingMessage),
			{ role: 'assistant', content: [{ type: 'text', text: 'Refunded.' }] },
			userText('Thanks'),
		]);
	});

	it('keeps the single-shot request unchanged: a string input and no thread', async () => {
		generate.mockResolvedValueOnce(reply('It ships tomorrow.'));

		const result = await buildService().executeWithLlmMock('agent-1', user, {
			projectId: 'proj-1',
		});

		expect(generate).toHaveBeenCalledWith(seed.openingMessage, expect.anything());
		expect(result.thread).toBeUndefined();
	});
});
