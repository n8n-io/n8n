import { describe, expect, it } from 'vitest';

import type { ModelStep } from '../schema';
import { MODEL_TIME_KEY, TEXT_ANSWER_KEY } from '../schema';
import { rowsOfIteration, scenarioRunOf, toolStatsOf, turnsOf } from './extract';
import { firstBuildOf, scenarioPassesByWorkflow } from './first-build';
import type { EvalRow, TestCase, TranscriptTurn } from './inputs';

const row = (
	testCaseFile: string,
	scenarioName: string,
	iteration: number,
	outputs: Partial<EvalRow['outputs']> = {},
): EvalRow => ({
	inputs: { testCaseFile, scenarioName, scenarioDescription: '', _iteration: iteration },
	outputs: { workflowJson: undefined, ...outputs },
});

const step = (overrides: Partial<ModelStep>): ModelStep => ({
	index: 0,
	startMs: 0,
	modelMs: 1000,
	toolWindowMs: null,
	finishReason: null,
	modelId: null,
	usage: null,
	toolCalls: [],
	...overrides,
});

describe('rowsOfIteration', () => {
	const rows = [
		row('case-a', 'happy-path', 0, { threadId: 't1' }),
		row('case-a', 'large-pdf', 0, { threadId: 't1' }),
		row('case-a', 'happy-path', 1, { threadId: 't2' }),
		row('case-b', 'happy-path', 0, { threadId: 't3' }),
		row('case-c', 'happy-path', 2),
	];

	it('matches the rows of a build by thread id', () => {
		expect(
			rowsOfIteration(rows, 'case-a', 't1', 5).map((entry) => entry.inputs.scenarioName),
		).toEqual(['happy-path', 'large-pdf']);
	});

	it('does not take rows of another case with the same thread', () => {
		expect(rowsOfIteration(rows, 'case-b', 't1', 0)).toEqual([]);
	});

	it('falls back to the iteration index when rows carry no thread id', () => {
		expect(rowsOfIteration(rows, 'case-c', 't9', 2)).toHaveLength(1);
		expect(rowsOfIteration(rows, 'case-c', null, 1)).toHaveLength(0);
	});
});

describe('scenarioRunOf', () => {
	it('gives the run a readable title and keeps the judge verdict', () => {
		const run = scenarioRunOf(
			row('case-a', 'three-orders-three-runs', 0, {
				passed: false,
				failureCategory: 'builder_issue',
				rootCause: 'The Code node drops items.',
				execErrors: [{ message: 'boom' }],
			}),
		);
		expect(run).toMatchObject({
			slug: 'three-orders-three-runs',
			title: 'Three orders, three runs',
			passed: false,
			failureCategory: 'builder_issue',
			rootCause: 'The Code node drops items.',
			execErrors: [{ message: 'boom' }],
		});
	});
});

describe('firstBuildOf', () => {
	const testCase: TestCase = {
		name: 'case',
		scenarios: [
			{
				name: 'a',
				runs: [
					{ workflowId: 'wf1', passed: true },
					{ workflowId: 'wf2', passed: false },
					{ workflowId: 'wf1', passed: false, failureCategory: 'framework_issue' },
				],
			},
			{ name: 'b', runs: [{ workflowId: 'wf1', passed: true }] },
		],
	};
	const build = (result: unknown) => ({
		kind: 'tool-call' as const,
		toolName: 'build-workflow',
		args: {},
		result,
	});
	const transcript = (...results: unknown[]): TranscriptTurn[] => [
		{
			userMessage: 'Build it',
			steps: [
				...results.map(build),
				{ kind: 'tool-call', toolName: 'verify-built-workflow', args: {}, result: {} },
			],
		},
	];

	it('links scenario runs to the build by workflow id and skips excluded runs', () => {
		const passes = scenarioPassesByWorkflow(testCase);
		expect(firstBuildOf(transcript({ success: true, workflowId: 'wf1' }), passes)).toEqual({
			firstOk: true,
			oneShot: true,
			callsToFirstSave: 1,
			rebuilds: 0,
			verifies: 1,
			scenarioPasses: [true, true],
		});
	});

	it('counts calls until the first save and rebuilds after it', () => {
		const passes = scenarioPassesByWorkflow(testCase);
		const result = firstBuildOf(
			transcript(
				{ success: false },
				{ success: true, workflowId: 'wf2' },
				{ success: true, workflowId: 'wf2' },
			),
			passes,
		);
		expect(result).toMatchObject({
			firstOk: false,
			oneShot: false,
			callsToFirstSave: 2,
			rebuilds: 1,
		});
		expect(result.scenarioPasses).toEqual([false]);
	});
});

describe('turnsOf and toolStatsOf', () => {
	const transcript: TranscriptTurn[] = [
		{
			userMessage: 'first',
			runIds: ['run_1'],
			steps: [
				{ kind: 'agent-text', text: 'Looking' },
				{ kind: 'tool-call', toolName: 'nodes', toolCallId: 'c1', args: {}, result: { ok: true } },
				{
					kind: 'tool-call',
					toolName: 'build-workflow',
					toolCallId: 'c2',
					args: {},
					result: { success: false },
				},
			],
		},
		{
			userMessage: 'second',
			runIds: ['run_2'],
			steps: [{ kind: 'setup-card', outcome: 'skipped' }],
		},
	];
	const debug = {
		thread: 't1',
		runs: [
			{
				label: 'first',
				steps: [
					step({
						toolWindowMs: 4000,
						usage: { input: 100, output: 20, noCache: 0, cacheRead: 0, cacheWrite: 0 },
						toolCalls: [
							{ id: 'c1', tool: 'nodes' },
							{ id: 'c2', tool: 'build-workflow' },
						],
					}),
				],
			},
			{
				label: 'second',
				steps: [
					step({ usage: { input: 50, output: 10, noCache: 0, cacheRead: 0, cacheWrite: 0 } }),
				],
			},
		],
	};

	it('puts each debug run under its turn and keeps transcript items', () => {
		const turns = turnsOf(transcript, debug);
		expect(turns.map((turn) => turn.steps.length)).toEqual([1, 1]);
		expect(turns[0].items.map((item) => item.kind)).toEqual(['text', 'tool', 'tool']);
		expect(turns[0].items[2]).toMatchObject({
			kind: 'tool',
			id: 'c2',
			failed: true,
			hasResult: true,
		});
		expect(turns[1].items[0]).toEqual({
			kind: 'event',
			type: 'setup-card',
			data: { outcome: 'skipped' },
		});
	});

	it('splits the derived tool window and step tokens between the calls of a step', () => {
		const stats = new Map(toolStatsOf(turnsOf(transcript, debug)).map((stat) => [stat.tool, stat]));
		expect(stats.get('nodes')).toEqual({
			tool: 'nodes',
			calls: 1,
			failed: 0,
			timeMs: 2000,
			tokens: 60,
		});
		expect(stats.get('build-workflow')).toEqual({
			tool: 'build-workflow',
			calls: 1,
			failed: 1,
			timeMs: 2000,
			tokens: 60,
		});
		expect(stats.get(MODEL_TIME_KEY)?.timeMs).toBe(2000);
		expect(stats.get(TEXT_ANSWER_KEY)?.tokens).toBe(60);
	});
});
