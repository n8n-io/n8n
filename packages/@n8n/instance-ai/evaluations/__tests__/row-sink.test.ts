import { appendFileSync, mkdtempSync, readFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { tmpdir } from 'os';
import { join } from 'path';

import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import type { ScenarioRowInputs } from '../run/case-pipeline';
import { createRowSink, runEvalAndPersist } from '../run/persist';
import type { TargetOutput } from '../run/reshape';
import type { WorkflowTestCase } from '../types';

// The row sink is the crash-recovery journal both drivers feed: one JSON line
// per completed row. On the crash path runEvalAndPersist reshapes COMPLETE
// iterations back into eval-results.json — never-run rows must not surface as
// fabricated failures in the artifact.

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const testCase: WorkflowTestCase = {
	conversation: [{ role: 'user', text: 'build it' }],
	complexity: 'simple',
	tags: [],
	datasets: ['full'],
	executionScenarios: [
		{ name: 'happy-path', description: 'd', dataSetup: 's', successCriteria: 'c' },
	],
};
const testCasesWithFiles: WorkflowTestCaseWithFile[] = [{ testCase, fileSlug: 'case-a' }];

function rowInputs(iteration: number): ScenarioRowInputs {
	return {
		testCaseFile: 'case-a',
		scenarioName: 'happy-path',
		scenarioDescription: 'd',
		dataSetup: 's',
		successCriteria: 'c',
		_iteration: iteration,
	};
}

function rowOutputs(passed: boolean): TargetOutput {
	return {
		buildSuccess: true,
		workflowId: 'wf-1',
		passed,
		score: passed ? 1 : 0,
		reasoning: passed ? 'ok' : 'nope',
		execErrors: [],
		buildDurationMs: 1,
		execDurationMs: 1,
		nodeCount: 0,
	};
}

describe('createRowSink', () => {
	it('round-trips appended rows and truncates the previous run', () => {
		const dir = mkdtempSync(join(tmpdir(), 'row-sink-'));
		const first = createRowSink(dir);
		first.append({ run: { inputs: rowInputs(0), outputs: rowOutputs(true) } });
		expect(first.readRows()).toHaveLength(1);

		// A new sink for the same dir starts empty — recovery never mixes runs.
		const second = createRowSink(dir);
		expect(second.readRows()).toHaveLength(0);
	});

	it('tolerates a torn final line from a hard crash', () => {
		const dir = mkdtempSync(join(tmpdir(), 'row-sink-'));
		const sink = createRowSink(dir);
		sink.append({ run: { inputs: rowInputs(0), outputs: rowOutputs(true) } });
		appendFileSync(sink.path, '{"run":{"inputs":{"trunc');

		expect(sink.readRows()).toHaveLength(1);
	});
});

describe('runEvalAndPersist crash recovery from the sink', () => {
	interface WrittenReport {
		testCases: Array<{
			testCaseFile?: string;
			scenarios: Array<{ runs: unknown[] }>;
			buildExpectationResultsPerRun?: unknown[];
		}>;
	}

	async function crashWith(
		rows: Array<{ iteration: number }>,
		outputs: TargetOutput = rowOutputs(true),
	): Promise<WrittenReport> {
		const dir = mkdtempSync(join(tmpdir(), 'row-sink-recovery-'));
		const rowSink = createRowSink(dir);
		await expect(
			runEvalAndPersist(
				{
					logger: silentLogger,
					outputDir: dir,
					startTime: 1,
					iterations: 3,
					tier: undefined,
					commitSha: undefined,
					rerun: undefined,
					mcpBuildSpend: [],
					rowSink,
					testCasesWithFiles,
				},
				async () => {
					for (const { iteration } of rows) {
						rowSink.append({ run: { inputs: rowInputs(iteration), outputs } });
					}
					return await Promise.reject(new Error('lane meltdown'));
				},
			),
		).rejects.toThrow('lane meltdown');
		return jsonParse<WrittenReport>(readFileSync(join(dir, 'eval-results.json'), 'utf8'));
	}

	it('recovers completed iterations into the crash artifact', async () => {
		const report = await crashWith([{ iteration: 0 }, { iteration: 1 }]);

		expect(report.testCases).toHaveLength(1);
		expect(report.testCases[0].testCaseFile).toBe('case-a');
		expect(report.testCases[0].scenarios[0].runs).toHaveLength(2);
	});

	it('writes an empty artifact when no iteration completed — no fabricated failures', async () => {
		// The single-scenario case needs one row per iteration; an empty sink means
		// nothing finished, so nothing may be reported.
		const report = await crashWith([]);

		expect(report.testCases).toHaveLength(0);
	});

	it('recovers embedded expectation verdicts — reshape reads only the side-band map', async () => {
		const verdicts = [{ expectation: 'sends a digest', pass: true, reason: 'ok' }];
		const report = await crashWith([{ iteration: 0 }], {
			...rowOutputs(true),
			expectationResults: verdicts,
		});

		expect(report.testCases[0].buildExpectationResultsPerRun).toEqual([verdicts]);
	});
});
