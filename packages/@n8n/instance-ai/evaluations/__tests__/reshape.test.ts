import type { Run } from 'langsmith/schemas';

import { reshapeLangSmithRuns } from '../cli/reshape';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
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
	it('reattaches transcript + build-expectation verdicts to the test case by threadId', () => {
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
			new Map([['tid-1', [verdict]]]),
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

	it('leaves transcript + verdicts undefined when the run output carries no threadId (regression: dropped threadId)', () => {
		// Models the exec-error return that omitted threadId: build succeeded, but
		// with no threadId on the output the join can't find the maps' entries.
		const cases = [withFile('airtable', [scenario('s1')])];
		const rows = [
			row(
				{ testCaseFile: 'airtable', scenarioName: 's1', _iteration: 0 },
				{ buildSuccess: true, passed: false, score: 0, reasoning: 'exec error' },
			),
		];

		// Maps DO hold data under a real threadId — proving we don't misattach it.
		const result = reshapeLangSmithRuns(
			rows,
			cases,
			1,
			new Map([['tid-real', [turn]]]),
			new Map([['tid-real', [verdict]]]),
			undefined,
		);

		const tc = result[0][0];
		expect(tc.workflowBuildSuccess).toBe(true);
		expect(tc.threadId).toBeUndefined();
		expect(tc.transcript).toBeUndefined();
		expect(tc.buildExpectationResults).toBeUndefined();
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
});
