import { jsonParse } from 'n8n-workflow';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { EvalLogger } from '../harness/logger';
import { abortedWorkflowTestCaseResult } from '../harness/runner';
import { runEvalAndPersist } from '../run/persist';
import type { ExecutionScenario, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

// ---------------------------------------------------------------------------
// TRUST-310: the CLI must WRITE a partial eval-results.json when the run throws
// mid-flight (a per-iteration budget / timeout abort). Without a file the
// lang-tracer dispatcher discards the whole run — including scenarios that had
// already passed. This drives the actual write-on-abort seam to a real temp
// --output-dir and pins the JSON shape the dispatcher parses against a golden
// fixture (the cross-repo contract anchor).
// ---------------------------------------------------------------------------

/** Minimal shape of the emitted eval-results.json — only the fields these tests read. */
interface ParsedEvalResults {
	timestamp?: string;
	duration?: number;
	testCases: Array<{
		buildSuccessCount: number;
		totalRuns: number;
		scenarios: Array<{
			passCount: number;
			evaluatedCount: number;
			totalRuns: number;
			passAtK: number;
			runs: Array<{
				passed: boolean;
				score: number;
				failureCategory?: string;
				rootCause?: string;
			}>;
		}>;
	}>;
	[key: string]: unknown;
}

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const scenarioA: ExecutionScenario = {
	name: 'happy path',
	description: 'a',
	dataSetup: 'setup a',
	successCriteria: 'criteria a',
};
const scenarioB: ExecutionScenario = {
	name: 'edge case',
	description: 'b',
	dataSetup: 'setup b',
	successCriteria: 'criteria b',
};

function makeTestCase(scenarios: ExecutionScenario[]): WorkflowTestCase {
	return {
		conversation: [{ role: 'user', text: 'build me something' }],
		complexity: 'complex',
		tags: ['test'],
		datasets: ['full'],
		executionScenarios: scenarios,
	};
}

/** One iteration's results: case A completed + passed before the abort, case B
 *  was aborted by the budget/timeout. */
function partialIteration(): WorkflowTestCaseResult[] {
	const completed: WorkflowTestCaseResult = {
		testCase: makeTestCase([scenarioA]),
		workflowBuildSuccess: true,
		workflowId: 'Wa',
		executionScenarioResults: [
			{ scenario: scenarioA, success: true, score: 1, reasoning: 'passed' },
		],
	};
	const aborted = abortedWorkflowTestCaseResult(
		makeTestCase([scenarioB]),
		'http://localhost:5678',
		'TimeoutError: The operation was aborted due to timeout',
	);
	return [completed, aborted];
}

describe('runEvalAndPersist write-on-abort', () => {
	let outputDir: string;

	beforeEach(() => {
		outputDir = mkdtempSync(join(tmpdir(), 'eval-310-'));
	});
	afterEach(() => {
		rmSync(outputDir, { recursive: true, force: true });
	});

	it('writes eval-results.json with completed + aborted scenarios when the run throws', async () => {
		// The run captures one completed iteration into the sink, then throws — the
		// exact shape of a budget abort after some scenarios already passed.
		const runEval = async (partialResults: WorkflowTestCaseResult[][]) => {
			partialResults.push(partialIteration());
			await Promise.resolve();
			throw new Error('operation aborted due to timeout');
		};

		await expect(
			runEvalAndPersist(
				{
					logger: silentLogger,
					outputDir,
					startTime: Date.now(),
					iterations: 1,
					tier: undefined,
					commitSha: undefined,
					rerun: undefined,
					mcpBuildSpend: [],
				},
				runEval,
			),
		).rejects.toThrow(/aborted/);

		const file = join(outputDir, 'eval-results.json');
		expect(existsSync(file)).toBe(true);
		const parsed = jsonParse<ParsedEvalResults>(readFileSync(file, 'utf8'));

		// (a) the passing scenario that completed before the abort survives. The
		// emitted per-scenario key is `scenarios`, and pass state is carried as
		// passCount/evaluatedCount + passAtK/passHatK (NOT a `passRate` field).
		const completedCase = parsed.testCases[0];
		expect(completedCase.buildSuccessCount).toBe(1);
		expect(completedCase.totalRuns).toBe(1);
		expect(completedCase.scenarios[0].passCount).toBe(1);
		expect(completedCase.scenarios[0].evaluatedCount).toBe(1);
		expect(completedCase.scenarios[0].totalRuns).toBe(1);
		expect(completedCase.scenarios[0].passAtK).toBe(1);
		expect(completedCase.scenarios[0].runs[0].passed).toBe(true);

		// (b) the aborted scenario carries the pinned cross-repo contract.
		const abortedCase = parsed.testCases[1];
		expect(abortedCase.buildSuccessCount).toBe(0);
		expect(abortedCase.scenarios[0].passCount).toBe(0);
		expect(abortedCase.scenarios[0].evaluatedCount).toBe(1);
		const abortedRun = abortedCase.scenarios[0].runs[0];
		expect(abortedRun.passed).toBe(false);
		expect(abortedRun.score).toBe(0);
		expect(abortedRun.failureCategory).toBe('framework_issue');
		expect(abortedRun.rootCause).toContain('time budget');
	});

	it('matches the cross-repo golden fixture (minus the volatile timestamp/duration)', async () => {
		const runEval = async (partialResults: WorkflowTestCaseResult[][]) => {
			partialResults.push(partialIteration());
			await Promise.resolve();
			throw new Error('operation aborted due to timeout');
		};

		await expect(
			runEvalAndPersist(
				{
					logger: silentLogger,
					outputDir,
					startTime: Date.now(),
					iterations: 1,
					tier: undefined,
					commitSha: undefined,
					rerun: undefined,
					mcpBuildSpend: [],
				},
				runEval,
			),
		).rejects.toThrow(/aborted/);

		const parsed = jsonParse<ParsedEvalResults>(
			readFileSync(join(outputDir, 'eval-results.json'), 'utf8'),
		);
		// timestamp + duration are wall-clock and can't be pinned; the rest is the
		// contract the dispatcher parses.
		delete parsed.timestamp;
		delete parsed.duration;

		const golden = jsonParse<ParsedEvalResults>(
			readFileSync(join(__dirname, 'fixtures', 'eval-results.partial-abort.json'), 'utf8'),
		);
		expect(parsed).toEqual(golden);
	});
});
