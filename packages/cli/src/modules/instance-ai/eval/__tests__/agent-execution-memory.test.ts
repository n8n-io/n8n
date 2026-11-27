import type { GenerateResult, MemoryTaskEvent, SideCallUsageReport } from '@n8n/agents';
import type { AgentJsonConfig, InstanceAiEvalAgentExecutionRequest } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { AgentEvaluationService } from '@/modules/agents/evaluation/agent-evaluation.service';
import type { AgentEvaluationPreparation } from '@/modules/agents/evaluation/agent-evaluation.contracts';

import { EvalAgentMemoryReader } from '../agent-eval-memory-reader';
import { EvalAgentExecutionService } from '../agent-execution.service';
import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { createLlmMockHandler } from '../mock-handler';

vi.mock('@/modules/agents/evaluation/agent-evaluation.service', () => ({
	AgentEvaluationService: class AgentEvaluationService {},
}));
vi.mock('../agent-eval-memory-reader', () => ({
	EvalAgentMemoryReader: class EvalAgentMemoryReader {},
}));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));
vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mcp-mock-fetch', () => ({ createMcpMockFetch: vi.fn(() => vi.fn()) }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));

const agentEvaluation = mock<AgentEvaluationService>();
const memoryReader = mock<EvalAgentMemoryReader>();
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

function userText(text: string) {
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
	let approve: ReturnType<typeof vi.fn>;
	let close: ReturnType<typeof vi.fn>;
	let waitForBackgroundTasks: ReturnType<typeof vi.fn>;
	let observers: Array<(event: MemoryTaskEvent) => void>;

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
		approve = vi.fn();
		close = vi.fn();
		waitForBackgroundTasks = vi.fn().mockResolvedValue(undefined);
		observers = [];
		buildRuntime.mockImplementation(async () => ({
			generate,
			approve,
			close,
			waitForBackgroundTasks,
			memoryTaskObserver: (observer: (event: MemoryTaskEvent) => void) => observers.push(observer),
		}));
		Container.set(EvalAgentMemoryReader, memoryReader);
		memoryReader.pendingCandidateCount.mockResolvedValue(0);
		memoryReader.read.mockResolvedValue({ observations: [], episodicEntries: [] });
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
	it('sends only the new message with persistence and keeps no replay when memory is on', async () => {
		const service = buildService();
		generate.mockResolvedValueOnce(reply('Noted.')).mockResolvedValueOnce(reply('Peanuts.'));

		await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'I am allergic to peanuts'),
		);
		await service.executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'What am I allergic to?', 2),
		);

		expect(generate.mock.calls.map((call: unknown[]) => call[0])).toEqual([
			[userText('I am allergic to peanuts')],
			[userText('What am I allergic to?')],
		]);
		for (const call of generate.mock.calls) {
			expect(call[1]).toMatchObject({ persistence: { threadId: THREAD_A, resourceId: 'user-a' } });
		}
	});

	it('passes persistence to tool approvals too', async () => {
		generate.mockResolvedValueOnce(
			reply('', {
				pendingSuspend: [{ runId: 'run-1', toolCallId: 'tc-1', toolName: 'send_email', input: {} }],
			} as Partial<GenerateResult>),
		);
		approve.mockResolvedValueOnce(reply('Sent.'));

		await buildService().executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a', 'Email me'));

		expect(approve.mock.calls[0][1]).toMatchObject({
			runId: 'run-1',
			persistence: { threadId: THREAD_A, resourceId: 'user-a' },
		});
	});

	it('responds only after the background memory tasks of the turn settle with awaitMemory', async () => {
		let settle!: () => void;
		waitForBackgroundTasks.mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
		generate.mockResolvedValueOnce(reply('Noted.'));
		let responded = false;

		const response = buildService()
			.executeWithLlmMock('agent-1', user, { ...turn(THREAD_A, 'user-a', 'Hi'), awaitMemory: true })
			.then((result) => {
				responded = true;
				return result;
			});
		await vi.waitFor(() => expect(waitForBackgroundTasks).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(responded).toBe(false);
		expect(close).not.toHaveBeenCalled();

		settle();
		const result = await response;
		expect(result.success).toBe(true);
		expect(close).toHaveBeenCalled();
	});

	it('without awaitMemory, waits for side-call reports but never fails the turn on memory', async () => {
		generate.mockResolvedValueOnce(reply('Noted.'));
		waitForBackgroundTasks.mockRejectedValue(new Error('Background tasks still running: episodic'));
		memoryReader.pendingCandidateCount.mockResolvedValue(2);

		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Hi'),
		);

		expect(waitForBackgroundTasks).toHaveBeenCalled();
		expect(result.success).toBe(true);
	});

	it('does not wait for background tasks when memory is off', async () => {
		agentEvaluation.prepare.mockResolvedValue({
			preparation: {
				config: { ...config, memory: undefined },
				tools: [],
				skippedFeatures: [],
				buildRuntime,
			},
		});
		generate.mockResolvedValueOnce(reply('Hi.'));

		await buildService().executeWithLlmMock('agent-1', user, turn(THREAD_A, 'user-a', 'Hi'));

		expect(waitForBackgroundTasks).not.toHaveBeenCalled();
	});

	it('fails the turn with "memory not settled" when flagged memories are still pending', async () => {
		generate.mockResolvedValueOnce(reply('Noted.'));
		memoryReader.pendingCandidateCount.mockResolvedValue(2);

		const result = await buildService().executeWithLlmMock('agent-1', user, {
			...turn(THREAD_A, 'user-a', 'Hi'),
			awaitMemory: true,
		});

		expect(memoryReader.pendingCandidateCount).toHaveBeenCalledWith('agent-1', 'user-a');
		expect(result.success).toBe(false);
		expect(result.errors.join(' ')).toContain('memory not settled');
	});

	it('fails the turn with "memory not settled" when the memory tasks time out', async () => {
		generate.mockResolvedValueOnce(reply('Noted.'));
		waitForBackgroundTasks.mockRejectedValue(new Error('Background tasks still running: episodic'));

		const result = await buildService().executeWithLlmMock('agent-1', user, {
			...turn(THREAD_A, 'user-a', 'Hi'),
			awaitMemory: true,
		});

		expect(result.success).toBe(false);
		expect(result.errors.join(' ')).toContain('memory not settled');
	});

	it('reports the stored memory and the memory tasks that ended during the turn', async () => {
		generate.mockImplementationOnce(async () => {
			const task = {
				id: 't1',
				taskKind: 'episodic' as const,
				observationScopeId: 'user-a',
				status: 'running' as const,
				queuedAt: new Date(),
			};
			for (const observer of observers) observer({ type: 'completed', task, value: undefined });
			return reply('Noted.');
		});
		const stored = {
			observations: [{ threadId: THREAD_A, marker: 'important', text: 'Allergic to peanuts' }],
			episodicEntries: [
				{ content: 'The user is allergic to peanuts', createdAt: '2026-11-27T00:00:00.000Z' },
			],
		};
		memoryReader.read.mockResolvedValue(stored);

		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Hi'),
		);

		expect(memoryReader.read).toHaveBeenCalledWith('agent-1', 'user-a', [THREAD_A]);
		expect(result.memory).toEqual({
			...stored,
			pendingCandidates: 0,
			tasks: [{ taskKind: 'episodic', outcome: 'completed' }],
		});
	});

	it('records side-call usage reported during the turn', async () => {
		generate.mockImplementationOnce(
			async (_input: unknown, options: { onSideCallUsage: (r: SideCallUsageReport) => void }) => {
				options.onSideCallUsage({
					task: 'title',
					model: 'anthropic/claude-haiku-5-5',
					usage: { promptTokens: 40, completionTokens: 6, totalTokens: 46 },
					cost: 0.0001,
					reportId: 'r1',
				});
				return reply('Noted.');
			},
		);

		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Hi'),
		);

		expect(result.sideCallUsage).toEqual([
			{
				task: 'title',
				model: 'anthropic/claude-haiku-5-5',
				inputTokens: 40,
				outputTokens: 6,
				cost: 0.0001,
			},
		]);
	});

	it('does not mock the memory tools: recall_memory and flag_memory run for real and are reported', async () => {
		generate.mockResolvedValueOnce(
			reply('Noted.', {
				toolCalls: [
					{ tool: 'flag_memory', input: { content: 'Allergic to peanuts' }, output: { ok: true } },
					{ tool: 'recall_memory', input: { query: 'allergy' }, output: { entries: [] } },
				],
			} as Partial<GenerateResult>),
		);

		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			turn(THREAD_A, 'user-a', 'Hi'),
		);

		expect(result.toolCalls).toEqual([
			expect.objectContaining({ tool: 'flag_memory', mocked: false, interceptedRequests: [] }),
			expect.objectContaining({ tool: 'recall_memory', mocked: false, interceptedRequests: [] }),
		]);
	});
});
