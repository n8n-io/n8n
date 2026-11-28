import type {
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalAgentMemoryState,
	InstanceAiEvalAgentRunOptions,
	InstanceAiEvalAgentThreadTurn,
} from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyBuildExpectations } from '../build-expectations/verifier';
import type { N8nClient } from '../clients/n8n-client';
import { executeAgentScenario } from '../harness/agent-execution';
import type { EvalLogger } from '../harness/logger';
import type { ExecutionScenario } from '../types';
import { createAgentUserProxy, type AgentUserProxy } from '../utils/user-proxy/agent-user';

vi.mock('../harness/scenario-execution', async (importOriginal) => ({
	...(await importOriginal<typeof import('../harness/scenario-execution')>()),
	writeScenarioVerificationSnapshot: vi.fn(),
}));
vi.mock('../checklist/verifier', () => ({
	verifyChecklist: vi.fn().mockResolvedValue({
		results: [{ id: 1, pass: true, reasoning: 'ok' }],
		attempts: [],
	}),
}));
vi.mock('../build-expectations/verifier', () => ({ verifyBuildExpectations: vi.fn() }));
vi.mock('../utils/user-proxy/agent-user', () => ({ createAgentUserProxy: vi.fn() }));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

type ExecuteCall = {
	thread?: InstanceAiEvalAgentThreadTurn;
	options?: { agentRun?: InstanceAiEvalAgentRunOptions; awaitMemory?: boolean };
};

function agentReply(text: string, thread?: InstanceAiEvalAgentThreadTurn) {
	return {
		runId: `run-${text}`,
		success: true,
		errors: [],
		finalText: text,
		toolCalls: [
			{
				tool: 'lookup_order',
				kind: 'node',
				input: { id: 1 },
				mocked: true,
				interceptedRequests: [],
			},
		],
		modelTurns: [],
		seed: { openingMessage: 'Where is my order?', globalContext: '', toolHints: {}, warnings: [] },
		skippedFeatures: [],
		mockedCredentials: [],
		...(thread
			? {
					thread: {
						threadId: thread.threadId,
						resourceId: thread.resourceId,
						turn: thread.expectedTurn,
						userMessage: thread.message ?? 'Where is my order?',
					},
				}
			: {}),
	} as unknown as InstanceAiEvalAgentExecutionResult;
}

function memoryAfter(turn: number): InstanceAiEvalAgentMemoryState {
	return {
		observations: [
			{ threadId: 't', marker: 'important', text: `observation after turn ${String(turn)}` },
		],
		episodicEntries: [
			{ content: `entry after turn ${String(turn)}`, createdAt: '2026-11-27T00:00:00.000Z' },
		],
		pendingCandidates: 0,
		tasks: [
			{
				taskKind: 'episodic',
				outcome: turn === 1 ? 'failed' : 'completed',
				...(turn === 1 ? { error: 'embedding down' } : {}),
			},
		],
	};
}

/** A client whose every turn reports memory and one title side call.
 *  `memoryOf(turn)` overrides a turn's memory; undefined = the read failed. */
function memoryClient(
	calls: ExecuteCall[],
	memoryOf: (turn: number) => InstanceAiEvalAgentMemoryState | undefined = memoryAfter,
): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		executeAgentWithLlmMock: vi
			.fn()
			.mockImplementation(
				async (
					_agentId: string,
					_projectId: string,
					_hints?: string,
					_timeoutMs?: number,
					thread?: InstanceAiEvalAgentThreadTurn,
					options?: ExecuteCall['options'],
				) => {
					calls.push({ thread, options });
					return {
						...agentReply(`reply ${String(calls.length)}`, thread),
						memoryConfig: { enabled: true, storage: 'n8n' },
						...(memoryOf(calls.length) ? { memory: memoryOf(calls.length) } : {}),
						sideCallUsage: [{ task: 'title', model: 'm', inputTokens: 10, outputTokens: 2 }],
					};
				},
			),
	} as unknown as N8nClient;
}

function scriptedUser(messages: string[]): AgentUserProxy {
	const queue = [...messages];
	return {
		nextMessage: vi.fn().mockImplementation(async () => {
			const message = queue.shift();
			return message === undefined ? { kind: 'done' } : { kind: 'message', message };
		}),
	};
}

const agentRun: InstanceAiEvalAgentRunOptions = { keepMemory: true };

const twoSessions: ExecutionScenario = {
	name: 'allergy',
	description: 'The agent remembers an allergy.',
	dataSetup: 'A food delivery user.',
	successCriteria: '',
	sessions: [
		{ goal: 'Tell the agent about a nut allergy', maxTurns: 2 },
		{ goal: 'Order dinner', maxTurns: 1, expectations: ['Avoids nuts without being told again'] },
	],
};

async function run(
	scenario: ExecutionScenario,
	calls: ExecuteCall[],
	options = agentRun,
	memoryOf?: (turn: number) => InstanceAiEvalAgentMemoryState | undefined,
) {
	return await executeAgentScenario(
		memoryClient(calls, memoryOf),
		'agent-1',
		scenario,
		'(agent context)',
		silentLogger,
		60_000,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		options,
	);
}

describe('executeAgentScenario with memory (AGENT-1666)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(verifyBuildExpectations).mockImplementation(async (expectations) =>
			expectations.map((expectation) => ({ expectation, pass: true, reason: 'held' })),
		);
		vi.mocked(createAgentUserProxy).mockReturnValue(
			scriptedUser(['I am allergic to nuts', 'Thanks', 'Dinner please']),
		);
	});

	it("sends the case's agentRun options on every turn", async () => {
		const calls: ExecuteCall[] = [];

		await run(twoSessions, calls);

		expect(calls.map((call) => call.options?.agentRun)).toEqual([agentRun, agentRun, agentRun]);
	});

	it('waits for memory on every turn of a session that another session follows, not on the last session', async () => {
		const calls: ExecuteCall[] = [];

		await run(twoSessions, calls);

		expect(calls.map((call) => call.options?.awaitMemory === true)).toEqual([true, true, false]);
	});

	it('does not wait for memory in a single-session conversation', async () => {
		const calls: ExecuteCall[] = [];

		await run(
			{
				...twoSessions,
				sessions: undefined,
				userTurns: { goal: 'g', maxTurns: 2 },
				expectations: ['e'],
			},
			calls,
		);

		expect(calls.some((call) => call.options?.awaitMemory)).toBe(false);
	});

	it('gives the judge the stored memory after the last turn and the memory tasks of every turn', async () => {
		const calls: ExecuteCall[] = [];

		await run(twoSessions, calls);

		const context = vi.mocked(verifyBuildExpectations).mock.calls[0]?.[1].artifactContext ?? '';
		expect(context).toContain('entry after turn 3');
		expect(context).toContain('observation after turn 3');
		expect(context).not.toContain('entry after turn 1');
		expect(context).toContain('embedding down');
	});

	it('records the memory and side-call usage of the whole conversation on the run', async () => {
		const calls: ExecuteCall[] = [];

		const result = await run(twoSessions, calls);

		expect(result.agentEvalResult?.sideCallUsage).toHaveLength(3);
		expect(result.agentEvalResult?.memory).toMatchObject({
			episodicEntries: [expect.objectContaining({ content: 'entry after turn 3' })],
			tasks: [
				expect.objectContaining({ outcome: 'failed' }),
				expect.objectContaining({ outcome: 'completed' }),
				expect.objectContaining({ outcome: 'completed' }),
			],
		});
	});

	it('runs a single-shot scenario as a one-turn thread when memory is kept, so memory is used', async () => {
		const calls: ExecuteCall[] = [];

		const result = await run(
			{ ...twoSessions, sessions: undefined, expectations: ['Answers'] },
			calls,
		);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.thread).toMatchObject({ expectedTurn: 1, final: true });
		expect(calls[0]?.thread?.message).toBeUndefined();
		expect(calls[0]?.options?.awaitMemory).toBe(false);
		expect(createAgentUserProxy).not.toHaveBeenCalled();
		expect(result.agentTurnCount).toBe(1);
	});

	it('keeps a single-shot scenario single-shot without keepMemory', async () => {
		const calls: ExecuteCall[] = [];

		await run({ ...twoSessions, sessions: undefined, expectations: ['Answers'] }, calls, {});

		expect(calls).toEqual([{ thread: undefined, options: { agentRun: {}, awaitMemory: false } }]);
	});

	it('does not retry a turn aborted by a transient error when memory is kept: it fails as a framework issue', async () => {
		const calls: ExecuteCall[] = [];
		const client = memoryClient(calls);
		vi.mocked(client.executeAgentWithLlmMock).mockResolvedValueOnce({
			...agentReply('', undefined),
			success: false,
			errors: ['SQLITE_CONSTRAINT: UNIQUE constraint failed'],
		});

		await expect(
			executeAgentScenario(
				client,
				'agent-1',
				twoSessions,
				'(agent context)',
				silentLogger,
				60_000,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				agentRun,
			),
		).rejects.toThrow(/FRAMEWORK ISSUE: .*not retried/);
		expect(client.executeAgentWithLlmMock).toHaveBeenCalledTimes(1);
	});

	function judgeContext(): string {
		return vi.mocked(verifyBuildExpectations).mock.calls[0]?.[1].artifactContext ?? '';
	}

	it('caps the stored entries the judge reads, by count and by length', async () => {
		const many = (turn: number): InstanceAiEvalAgentMemoryState => ({
			...memoryAfter(turn),
			episodicEntries: [
				{ content: `long entry ${'x'.repeat(2_000)}`, createdAt: '2026-11-27T00:00:00.000Z' },
				...Array.from({ length: 29 }, (_, index) => ({
					content: `entry number ${String(index + 2)}`,
					createdAt: '2026-11-27T00:00:00.000Z',
				})),
			],
		});

		await run(twoSessions, [], agentRun, many);

		const context = judgeContext();
		expect(context).toContain('entry number 20');
		expect(context).not.toContain('entry number 21');
		expect(context).toContain('10 more');
		expect(context).not.toContain('x'.repeat(1_000));
	});

	it('gives the judge task counts per kind and outcome, not one line per task', async () => {
		await run(twoSessions, []);

		const context = judgeContext();
		expect(context).toMatch(/episodic:(?=[^\n]*2 completed)(?=[^\n]*1 failed)/);
		expect(context.match(/episodic: completed/g)).toBeNull();
	});

	it('marks the stored memory as stale when the last turn could not read it', async () => {
		const result = await run(twoSessions, [], agentRun, (turn) =>
			turn === 3 ? undefined : memoryAfter(turn),
		);

		expect(result.agentEvalResult?.memory).toMatchObject({
			stale: true,
			episodicEntries: [expect.objectContaining({ content: 'entry after turn 2' })],
		});
		expect(judgeContext()).toContain('entry after turn 2');
	});
});
