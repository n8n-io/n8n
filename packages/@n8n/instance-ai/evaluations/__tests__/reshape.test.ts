import type { Run } from 'langsmith/schemas';

import {
	parseTargetOutput,
	reshapeLangSmithRuns,
	sentinelOutcomeFromVerdicts,
} from '../cli/reshape';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { BUILD_ONLY_SCENARIO_NAME } from '../langsmith/dataset-sync';
import type {
	BuildExpectationResult,
	ExecutionScenario,
	TranscriptTurn,
	WorkflowTestCase,
} from '../types';

// ---------------------------------------------------------------------------
// Fixtures — reshape only reads `run.inputs` and `run.outputs`, so a minimal
// Run is enough. `as Run` is fine in test code.
// ---------------------------------------------------------------------------

function scenario(name: string): ExecutionScenario {
	return { name, description: '', dataSetup: '', successCriteria: '' };
}

function testCase(scenarios: ExecutionScenario[]): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build it' }],
		complexity: 'simple',
		tags: [],
		executionScenarios: scenarios,
		datasets: ['full'],
	};
}

function withFile(fileSlug: string, scenarios: ExecutionScenario[]): WorkflowTestCaseWithFile {
	return { testCase: testCase(scenarios), fileSlug };
}

function row(inputs: Record<string, unknown>, outputs: Record<string, unknown>): { run: Run } {
	return { run: { inputs, outputs } as Run };
}

const turn: TranscriptTurn = { steps: [{ kind: 'agent-text', text: 'building...' }] };
const verdict: BuildExpectationResult = { expectation: 'asked first', pass: true, reason: 'did' };

describe('reshapeLangSmithRuns', () => {
	it('reattaches transcript by threadId and build-expectation verdicts by iteration:fileSlug', () => {
		const cases = [withFile('airtable', [scenario('s1'), scenario('s2')])];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{ buildSuccess: true, passed: true, score: 1, reasoning: 'ok', threadId: 'tid-1' },
			),
			row(
				{ testCaseFile: 'airtable', scenarioName: 's2', _iteration: 0 },
				{ buildSuccess: true, passed: true, score: 1, reasoning: 'ok', threadId: 'tid-1' },
			),
		];

		const result = reshapeLangSmithRuns(
			rows,
			cases,
			1,
			new Map([['tid-1', [turn]]]),
			new Map([['0:airtable', [verdict]]]),
			'http://localhost:5678',
		);

		expect(result).toHaveLength(1);
		const tc = result[0][0];
		expect(tc.threadId).toBe('tid-1');
		expect(tc.transcript).toEqual([turn]);
		expect(tc.buildExpectationResults).toEqual([verdict]);
		expect(tc.workflowBuildSuccess).toBe(true);
		expect(tc.n8nBaseUrl).toBe('http://localhost:5678');
		expect(tc.executionScenarioResults.map((r) => r.success)).toEqual([true, true]);
	});

	it('grades a build-only case (0 scenarios) from the sentinel row without a scenario unit', () => {
		const cases = [withFile('build-only', [])];
		const rows = [
			row(
				{ testCaseFile: 'build-only', scenarioName: BUILD_ONLY_SCENARIO_NAME, _iteration: 0 },
				{
					buildSuccess: true,
					passed: false,
					score: 0,
					reasoning: 'Build-only case — graded by process/outcome expectations',
					workflowId: 'wf-1',
					threadId: 'tid-1',
				},
			),
		];

		const result = reshapeLangSmithRuns(
			rows,
			cases,
			1,
			new Map([['tid-1', [turn]]]),
			new Map([['0:build-only', [verdict]]]),
			undefined,
		);

		const tc = result[0][0];
		expect(tc.executionScenarioResults).toEqual([]); // no phantom scenario unit
		expect(tc.workflowBuildSuccess).toBe(true);
		expect(tc.workflowId).toBe('wf-1');
		expect(tc.threadId).toBe('tid-1');
		expect(tc.transcript).toEqual([turn]);
		expect(tc.buildExpectationResults).toEqual([verdict]);
	});

	it('reports a build-only case whose build failed as not built, surfacing the build error', () => {
		const cases = [withFile('build-only', [])];
		// The sentinel row carries the build-failure output the target returns before the
		// build-only branch — reshape must report it as not built, not mask it as success.
		const rows = [
			row(
				{ testCaseFile: 'build-only', scenarioName: BUILD_ONLY_SCENARIO_NAME, _iteration: 0 },
				{
					buildSuccess: false,
					passed: false,
					score: 0,
					reasoning: 'Build failed: agent produced no workflow',
				},
			),
		];

		const result = reshapeLangSmithRuns(rows, cases, 1, new Map(), new Map(), undefined);

		const tc = result[0][0];
		expect(tc.executionScenarioResults).toEqual([]); // no phantom scenario unit
		expect(tc.workflowBuildSuccess).toBe(false);
		expect(tc.buildError).toBe('Build failed: agent produced no workflow');
	});

	it('attaches build-expectation verdicts by iteration:fileSlug even with no threadId (prebuilt/MCP path)', () => {
		// Prebuilt/MCP builds have no threadId. Transcript stays threadId-gated (so it
		// remains undefined here), but outcome-expectation verdicts must still attach via
		// the build-cache key, so LangSmith prebuilt runs match the direct-loop path.
		const cases = [withFile('airtable', [scenario('s1')])];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{ buildSuccess: true, passed: true, score: 1, reasoning: 'ok' },
			),
		];

		const result = reshapeLangSmithRuns(
			rows,
			cases,
			1,
			new Map([['tid-real', [turn]]]),
			new Map([['0:airtable', [verdict]]]),
			undefined,
		);

		const tc = result[0][0];
		expect(tc.workflowBuildSuccess).toBe(true);
		expect(tc.threadId).toBeUndefined();
		expect(tc.transcript).toBeUndefined();
		expect(tc.buildExpectationResults).toEqual([verdict]);
	});

	it('stubs a build_failure for a scenario with no matching run', () => {
		const cases = [withFile('airtable', [scenario('s1'), scenario('s2')])];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{ buildSuccess: true, passed: true, score: 1, reasoning: 'ok', threadId: 'tid-1' },
			),
		];

		const result = reshapeLangSmithRuns(rows, cases, 1, new Map(), new Map(), undefined);

		const [s1, s2] = result[0][0].executionScenarioResults;
		expect(s1.success).toBe(true);
		expect(s2.success).toBe(false);
		expect(s2.reasoning).toBe('No run result for this scenario');
		expect(s2.score).toBe(0);
	});

	it('skips a malformed run output rather than scoring it as a failure', () => {
		const cases = [withFile('airtable', [scenario('s1')])];
		const rows = [row({ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 }, {})];

		const result = reshapeLangSmithRuns(rows, cases, 1, new Map(), new Map(), undefined);

		const s1 = result[0][0].executionScenarioResults[0];
		expect(s1.success).toBe(false);
		expect(s1.reasoning).toBe('Malformed run output — skipped');
	});

	it('groups runs into separate iterations by the injected _iteration index', () => {
		const cases = [withFile('airtable', [scenario('s1')])];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{ buildSuccess: true, passed: true, score: 1, reasoning: 'ok', threadId: 'tid-0' },
			),
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 1 },
				{ buildSuccess: true, passed: false, score: 0, reasoning: 'flaked', threadId: 'tid-1' },
			),
		];

		const result = reshapeLangSmithRuns(rows, cases, 2, new Map(), new Map(), undefined);

		expect(result).toHaveLength(2);
		expect(result[0][0].threadId).toBe('tid-0');
		expect(result[0][0].executionScenarioResults[0].success).toBe(true);
		expect(result[1][0].threadId).toBe('tid-1');
		expect(result[1][0].executionScenarioResults[0].success).toBe(false);
	});

	it('captures buildError and workflowChecks from the build scenario', () => {
		const cases = [withFile('airtable', [scenario('s1')])];
		const checks = [
			{
				name: 'has_trigger',
				description: 'has a trigger',
				kind: 'deterministic' as const,
				dimension: 'structure' as const,
				status: 'pass' as const,
			},
		];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{
					buildSuccess: false,
					passed: false,
					score: 0,
					reasoning: 'build blew up',
					workflowChecks: checks,
				},
			),
		];

		const result = reshapeLangSmithRuns(rows, cases, 1, new Map(), new Map(), undefined);

		const tc = result[0][0];
		expect(tc.workflowBuildSuccess).toBe(false);
		expect(tc.buildError).toBe('build blew up');
		expect(tc.workflowChecks).toEqual(checks);
	});

	it('preserves workflow JSON and build trace from LangSmith outputs', () => {
		const cases = [withFile('airtable', [scenario('s1')])];
		const workflowJson = {
			id: 'wf-1',
			name: 'Workflow',
			active: false,
			versionId: 'v1',
			nodes: [],
			connections: {},
		};
		const buildTrace = { finalText: 'done', toolCalls: [], agentActivities: [] };
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{
					buildSuccess: true,
					passed: true,
					score: 1,
					reasoning: 'ok',
					workflowJson,
					buildTrace,
				},
			),
		];

		const result = reshapeLangSmithRuns(rows, cases, 1, new Map(), new Map(), undefined);

		const tc = result[0][0];
		expect(tc.workflowJson).toEqual(workflowJson);
		expect(tc.buildTrace).toEqual(buildTrace);
	});

	it('merges stashed run debug by thread id', () => {
		const cases = [withFile('airtable', [scenario('s1')])];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{
					buildSuccess: true,
					passed: true,
					score: 1,
					reasoning: 'ok',
					threadId: 'thread-1',
				},
			),
		];
		const runDebugByThreadId = new Map([
			[
				'thread-1',
				[
					{
						threadId: 'thread-1',
						runId: 'run-1',
						startedAt: 1,
						steps: [{ stepNumber: 0 }],
						workflowCode: [],
					},
				],
			],
		]);

		const result = reshapeLangSmithRuns(
			rows,
			cases,
			1,
			new Map(),
			new Map(),
			undefined,
			runDebugByThreadId,
		);

		expect(result[0][0]?.runDebug).toHaveLength(1);
		expect(result[0][0]?.runDebug?.[0]?.runId).toBe('run-1');
	});
});

describe('sentinelOutcomeFromVerdicts', () => {
	const pass = (expectation: string): BuildExpectationResult => ({
		expectation,
		pass: true,
		reason: 'ok',
	});
	const fail = (expectation: string): BuildExpectationResult => ({
		expectation,
		pass: false,
		reason: 'nope',
	});
	const noVerdict = (expectation: string): BuildExpectationResult => ({
		expectation,
		pass: false,
		reason: 'no verdict returned',
		incomplete: true,
	});

	it('passes when every evaluated expectation passes', () => {
		const out = sentinelOutcomeFromVerdicts([pass('a'), pass('b')]);
		expect(out).toMatchObject({ passed: true, score: 1 });
		expect(out.incomplete).toBeUndefined();
		expect(out.failureCategory).toBeUndefined();
		expect(out.reasoning).toContain('all 2 expectations passed');
	});

	it('fails with a fractional score and names the failed expectations', () => {
		const out = sentinelOutcomeFromVerdicts([
			pass('a'),
			fail('sends a Slack alert'),
			pass('c'),
			fail('uses the IF node'),
		]);
		expect(out.passed).toBe(false);
		expect(out.score).toBeCloseTo(0.5);
		expect(out.reasoning).toContain('sends a Slack alert');
		expect(out.reasoning).toContain('uses the IF node');
	});

	it('excludes incomplete verdicts from the denominator', () => {
		const out = sentinelOutcomeFromVerdicts([pass('a'), noVerdict('b')]);
		expect(out).toMatchObject({ passed: true, score: 1 });
		expect(out.incomplete).toBeUndefined();
	});

	it('is incomplete when the judge produced no evaluated verdicts', () => {
		for (const verdicts of [undefined, [], [noVerdict('a')]]) {
			expect(sentinelOutcomeFromVerdicts(verdicts)).toMatchObject({
				passed: false,
				score: 0,
				incomplete: true,
			});
		}
	});

	// Non-passing sentinels need an explicit category — target() forwards it, and
	// without one the feedback extractor labels the LangSmith row 'unknown'.
	it('categorizes failed expectations as expectations_failed', () => {
		const out = sentinelOutcomeFromVerdicts([pass('a'), fail('b')]);
		expect(out.failureCategory).toBe('expectations_failed');
	});

	it('categorizes judge-dead outcomes as verification_failure', () => {
		for (const verdicts of [undefined, [], [noVerdict('a')]]) {
			expect(sentinelOutcomeFromVerdicts(verdicts).failureCategory).toBe('verification_failure');
		}
	});
});

describe('parseTargetOutput expectationResults', () => {
	const base = { buildSuccess: true, passed: true, score: 1, reasoning: 'ok' };

	it('parses embedded expectation verdicts', () => {
		const out = parseTargetOutput({
			...base,
			expectationResults: [
				{ expectation: 'a', pass: true, reason: 'did' },
				{ expectation: 'b', pass: false, reason: 'no verdict', incomplete: true },
			],
		});
		expect(out?.expectationResults).toEqual([
			{ expectation: 'a', pass: true, reason: 'did' },
			{ expectation: 'b', pass: false, reason: 'no verdict', incomplete: true },
		]);
	});

	it('leaves the field undefined when absent', () => {
		const out = parseTargetOutput(base);
		expect(out).toBeDefined();
		expect(out?.expectationResults).toBeUndefined();
	});

	it('drops a malformed field without voiding the row', () => {
		const out = parseTargetOutput({ ...base, expectationResults: 'garbage' });
		expect(out?.passed).toBe(true);
		expect(out?.expectationResults).toBeUndefined();
	});
});
