jest.mock('../checklist/verifier', () => ({
	verifyChecklist: jest.fn(),
}));

jest.mock('../binaryChecks/index', () => ({
	runBinaryChecks: jest.fn(),
}));

import { SONNET_MODEL } from '../../src/utils/eval-agents';
import { runBinaryChecks } from '../binaryChecks/index';
import { verifyChecklist } from '../checklist/verifier';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { executeScenario } from '../harness/runner';
import type { TestScenario } from '../types';

const mockedRunBinaryChecks = jest.mocked(runBinaryChecks);
const mockedVerifyChecklist = jest.mocked(verifyChecklist);

const silentLogger: EvalLogger = {
	info: jest.fn(),
	verbose: jest.fn(),
	success: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	isVerbose: false,
};

function makeClient(): N8nClient {
	return {
		executeWithLlmMock: jest.fn().mockResolvedValue({
			success: true,
			errors: [],
			hints: { warnings: [], triggerContent: { foo: 'bar' }, globalContext: '', nodeHints: {} },
			nodeResults: {},
		}),
	} as unknown as N8nClient;
}

function makeScenario(overrides: Partial<TestScenario> = {}): TestScenario {
	return {
		name: 'happy-path',
		description: 'normal',
		dataSetup: 'webhook gets a submission',
		successCriteria: 'all good',
		...overrides,
	};
}

const fakeWorkflow = {
	id: 'W1',
	name: 'Test Workflow',
	nodes: [],
	connections: {},
} as unknown as WorkflowResponse;

beforeEach(() => {
	jest.clearAllMocks();
});

describe('executeScenario binary check integration', () => {
	it('does not call runBinaryChecks when scenario.binaryChecks is undefined', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'ok', strategy: 'llm' },
		]);

		const result = await executeScenario(
			makeClient(),
			'W1',
			makeScenario(),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(mockedRunBinaryChecks).not.toHaveBeenCalled();
		expect(result.success).toBe(true);
		expect(result.binaryCheckResults).toBeUndefined();
	});

	it('does not call runBinaryChecks when binaryChecks is empty', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'ok', strategy: 'llm' },
		]);

		await executeScenario(
			makeClient(),
			'W1',
			makeScenario({ binaryChecks: [] }),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(mockedRunBinaryChecks).not.toHaveBeenCalled();
	});

	it('calls runBinaryChecks with the user prompt, model, requested checks, and annotations', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'ok', strategy: 'llm' },
		]);
		mockedRunBinaryChecks.mockResolvedValue([
			{ evaluator: 'binary-checks', metric: 'has_nodes', kind: 'metric', score: 1 },
			{ evaluator: 'binary-checks', metric: 'pass_rate', kind: 'score', score: 1 },
		]);

		await executeScenario(
			makeClient(),
			'W1',
			makeScenario({
				binaryChecks: ['has_nodes'],
				annotations: { code_necessary: true },
			}),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(mockedRunBinaryChecks).toHaveBeenCalledTimes(1);
		const [workflow, ctx, options] = mockedRunBinaryChecks.mock.calls[0];
		expect(workflow).toBe(fakeWorkflow);
		expect(ctx).toEqual({
			prompt: 'user prompt',
			modelId: SONNET_MODEL,
			annotations: { code_necessary: true },
		});
		expect(options).toEqual({ only: ['has_nodes'] });
	});

	it('strips the pass_rate aggregate from binaryCheckResults', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'ok', strategy: 'llm' },
		]);
		mockedRunBinaryChecks.mockResolvedValue([
			{ evaluator: 'binary-checks', metric: 'has_nodes', kind: 'metric', score: 1 },
			{
				evaluator: 'binary-checks',
				metric: 'has_trigger',
				kind: 'metric',
				score: 0,
				comment: 'no trigger',
			},
			{ evaluator: 'binary-checks', metric: 'pass_rate', kind: 'score', score: 0.5 },
		]);

		const result = await executeScenario(
			makeClient(),
			'W1',
			makeScenario({ binaryChecks: ['has_nodes', 'has_trigger'] }),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(result.binaryCheckResults).toEqual([
			{ name: 'has_nodes', pass: true },
			{ name: 'has_trigger', pass: false, comment: 'no trigger' },
		]);
	});

	it('flips a verifier-passing scenario to failure when a binary check fails', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'verifier said ok', strategy: 'llm' },
		]);
		mockedRunBinaryChecks.mockResolvedValue([
			{
				evaluator: 'binary-checks',
				metric: 'all_nodes_connected',
				kind: 'metric',
				score: 0,
				comment: 'Disconnected: Set',
			},
		]);

		const result = await executeScenario(
			makeClient(),
			'W1',
			makeScenario({ binaryChecks: ['all_nodes_connected'] }),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(result.success).toBe(false);
		expect(result.score).toBe(0);
		expect(result.failureCategory).toBe('binary_check_failure');
		expect(result.reasoning).toContain('all_nodes_connected');
		expect(result.reasoning).toContain('verifier said ok');
	});

	it('marks every requested check failed when runBinaryChecks throws', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'ok', strategy: 'llm' },
		]);
		mockedRunBinaryChecks.mockRejectedValue(new Error('registry exploded'));

		const result = await executeScenario(
			makeClient(),
			'W1',
			makeScenario({ binaryChecks: ['has_nodes', 'has_trigger'] }),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(result.binaryCheckResults).toEqual([
			{ name: 'has_nodes', pass: false, comment: 'Runner error: registry exploded' },
			{ name: 'has_trigger', pass: false, comment: 'Runner error: registry exploded' },
		]);
		expect(result.success).toBe(false);
		expect(result.failureCategory).toBe('binary_check_failure');
	});

	it('preserves verifier success when all binary checks pass', async () => {
		mockedVerifyChecklist.mockResolvedValue([
			{ id: 1, pass: true, reasoning: 'ok', strategy: 'llm' },
		]);
		mockedRunBinaryChecks.mockResolvedValue([
			{ evaluator: 'binary-checks', metric: 'has_nodes', kind: 'metric', score: 1 },
		]);

		const result = await executeScenario(
			makeClient(),
			'W1',
			makeScenario({ binaryChecks: ['has_nodes'] }),
			[fakeWorkflow],
			'user prompt',
			silentLogger,
		);

		expect(result.success).toBe(true);
		expect(result.score).toBe(1);
		expect(result.failureCategory).toBeUndefined();
		expect(result.binaryCheckResults).toEqual([{ name: 'has_nodes', pass: true }]);
	});
});
