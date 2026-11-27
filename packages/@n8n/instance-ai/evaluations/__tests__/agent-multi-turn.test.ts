import type {
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalAgentThreadTurn,
} from '@n8n/api-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { verifyBuildExpectations } from '../build-expectations/verifier';
import { verifyChecklist } from '../checklist/verifier';
import type { N8nClient } from '../clients/n8n-client';
import { executeAgentScenario } from '../harness/agent-execution';
import type { EvalLogger } from '../harness/logger';
import type { BuildExpectationResult, ExecutionScenario, TranscriptTurn } from '../types';
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

type ExecuteCall = { thread?: InstanceAiEvalAgentThreadTurn };

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
						turn: 1,
						userMessage: thread.message ?? 'Where is my order?',
					},
				}
			: {}),
	} as unknown as InstanceAiEvalAgentExecutionResult;
}

/** A client that answers every turn and records what it was sent. */
function recordingClient(calls: ExecuteCall[]): N8nClient {
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
				) => {
					calls.push({ thread });
					return agentReply(`reply ${String(calls.length)}`, thread);
				},
			),
	} as unknown as N8nClient;
}

/** A simulated user that sends the given messages, then declares done. */
function scriptedUser(messages: string[]): AgentUserProxy {
	const queue = [...messages];
	return { nextMessage: vi.fn().mockImplementation(async () => queue.shift()) };
}

const base: ExecutionScenario = {
	name: 'track-order',
	description: 'A customer tracks an order.',
	dataSetup: 'Order #123 ships tomorrow.',
	successCriteria: '',
	expectations: ['Gives the ship date'],
};

async function run(scenario: ExecutionScenario, calls: ExecuteCall[]) {
	return await executeAgentScenario(
		recordingClient(calls),
		'agent-1',
		scenario,
		'(agent context)',
		silentLogger,
		60_000,
	);
}

function verdicts(...passes: boolean[]): BuildExpectationResult[] {
	return passes.map((pass, index) => ({
		expectation: `e${String(index)}`,
		pass,
		reason: pass ? 'held' : 'missed',
	}));
}

describe('executeAgentScenario: multi-turn runs', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(verifyBuildExpectations).mockImplementation(async (expectations) =>
			expectations.map((expectation) => ({ expectation, pass: true, reason: 'held' })),
		);
	});

	it('keeps one thread for a 3-turn scenario, opening with the seeded message', async () => {
		vi.mocked(createAgentUserProxy).mockReturnValue(scriptedUser(['Make it express', 'Thanks']));
		const calls: ExecuteCall[] = [];

		await run({ ...base, userTurns: { goal: 'Get the order sent express', maxTurns: 6 } }, calls);

		expect(calls).toHaveLength(3);
		const threadIds = new Set(calls.map((call) => call.thread?.threadId));
		expect(threadIds.size).toBe(1);
		expect(calls.map((call) => call.thread?.message)).toEqual([
			undefined,
			'Make it express',
			'Thanks',
		]);
	});

	it('stops at maxTurns even when the simulated user has more to say', async () => {
		vi.mocked(createAgentUserProxy).mockReturnValue(scriptedUser(['one', 'two', 'three']));
		const calls: ExecuteCall[] = [];

		await run({ ...base, userTurns: { goal: 'Keep talking', maxTurns: 2 } }, calls);

		expect(calls).toHaveLength(2);
	});

	it('runs each session in a new thread for one resource id', async () => {
		vi.mocked(createAgentUserProxy).mockReturnValue(
			scriptedUser(['I am allergic to nuts', 'Hi again']),
		);
		const calls: ExecuteCall[] = [];

		await run(
			{
				...base,
				expectations: undefined,
				sessions: [
					{ goal: 'Tell the agent about the allergy', maxTurns: 2 },
					{ goal: 'Order dinner', maxTurns: 1, expectations: ['Avoids nuts'] },
				],
			},
			calls,
		);

		expect(calls).toHaveLength(3);
		const [first, second, third] = calls.map((call) => call.thread);
		expect(first?.threadId).toBe(second?.threadId);
		expect(third?.threadId).not.toBe(first?.threadId);
		expect(new Set(calls.map((call) => call.thread?.resourceId)).size).toBe(1);
		// A later session opens with the simulated user's own message.
		expect(third?.message).toBe('Hi again');
	});

	it('uses a fresh, plain resource id per scenario run', async () => {
		vi.mocked(createAgentUserProxy).mockReturnValue(scriptedUser([]));
		const calls: ExecuteCall[] = [];
		const scenario = { ...base, userTurns: { goal: 'Track it', maxTurns: 3 } };

		await run(scenario, calls);
		await run(scenario, calls);

		const [first, second] = calls.map((call) => call.thread?.resourceId);
		expect(first).not.toBe(second);
		expect(first).toMatch(/^eval-user-[0-9a-f-]{36}$/);
	});

	it('judges the whole transcript, with every session marked', async () => {
		vi.mocked(createAgentUserProxy).mockReturnValue(
			scriptedUser(['I am allergic to nuts', 'Hi again']),
		);
		const calls: ExecuteCall[] = [];

		await run(
			{
				...base,
				sessions: [
					{ goal: 'Tell the agent about the allergy', maxTurns: 2 },
					{ goal: 'Order dinner', maxTurns: 1 },
				],
			},
			calls,
		);

		const input = vi.mocked(verifyBuildExpectations).mock.calls[0]?.[1];
		const transcript: TranscriptTurn[] = input?.transcript ?? [];
		expect(transcript.map((turn) => turn.userMessage)).toEqual([
			'Where is my order?',
			'I am allergic to nuts',
			'Hi again',
		]);
		expect(transcript.map((turn) => turn.heading)).toEqual([
			expect.stringContaining('Session 1'),
			undefined,
			expect.stringContaining('Session 2'),
		]);
		expect(transcript[0]?.steps).toEqual([
			expect.objectContaining({ kind: 'tool-call', toolName: 'lookup_order' }),
			{ kind: 'agent-text', text: 'reply 1' },
		]);
	});

	it('keeps the single-shot request unchanged when the scenario has no turns or sessions', async () => {
		const calls: ExecuteCall[] = [];

		await run(base, calls);

		expect(calls).toEqual([{ thread: undefined }]);
		expect(createAgentUserProxy).not.toHaveBeenCalled();
	});
});

describe('executeAgentScenario: per-expectation grading', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createAgentUserProxy).mockReturnValue(scriptedUser([]));
	});

	const graded: ExecutionScenario = {
		...base,
		expectations: ['Gives the ship date', 'Offers express shipping'],
		sessions: undefined,
		userTurns: { goal: 'Track it', maxTurns: 2 },
	};

	it('gives each expectation its own verdict, keyed by scenario and expectation', async () => {
		vi.mocked(verifyBuildExpectations).mockResolvedValue(verdicts(true, true));

		const result = await run(graded, []);

		expect(result.expectationResults).toEqual([
			expect.objectContaining({ expectation: 'track-order › Gives the ship date', pass: true }),
			expect.objectContaining({ expectation: 'track-order › Offers express shipping', pass: true }),
		]);
		expect(result.success).toBe(true);
		expect(verifyChecklist).not.toHaveBeenCalled();
	});

	it('fails the scenario when any expectation fails', async () => {
		vi.mocked(verifyBuildExpectations).mockResolvedValue(verdicts(true, false));

		const result = await run(graded, []);

		expect(result.success).toBe(false);
		expect(result.expectationResults?.[1]).toMatchObject({
			pass: false,
			attribution: 'builder_issue',
		});
		expect(result.reasoning).toContain('Offers express shipping');
	});

	it('keys a session expectation by its session too', async () => {
		vi.mocked(verifyBuildExpectations).mockResolvedValue(verdicts(true, true));

		const result = await run(
			{
				...graded,
				userTurns: undefined,
				expectations: ['Is polite'],
				sessions: [
					{ goal: 'Say hi', maxTurns: 1 },
					{ goal: 'Order', maxTurns: 1, expectations: ['Avoids nuts'] },
				],
			},
			[],
		);

		expect(result.expectationResults?.map((verdict) => verdict.expectation)).toEqual([
			'track-order › Is polite',
			'track-order › session 2 › Avoids nuts',
		]);
	});

	it('leaves the scenario ungraded when the judge gives no verdict', async () => {
		vi.mocked(verifyBuildExpectations).mockResolvedValue([
			{ expectation: 'e0', pass: false, reason: 'no verdict', incomplete: true },
			{ expectation: 'e1', pass: true, reason: 'held' },
		]);

		const result = await run(graded, []);

		expect(result.incomplete).toBe(true);
		expect(result.success).toBe(false);
	});

	it('grades a single-shot scenario that has expectations the same way', async () => {
		vi.mocked(verifyBuildExpectations).mockResolvedValue(verdicts(false));
		const calls: ExecuteCall[] = [];

		const result = await run({ ...base, userTurns: undefined }, calls);

		expect(calls).toEqual([{ thread: undefined }]);
		expect(result.success).toBe(false);
		expect(result.expectationResults).toHaveLength(1);
	});
});
