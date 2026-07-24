// ---------------------------------------------------------------------------
// Direct driver — keyless eval runs over the shared session/pipeline
// (TRUST-261). This is what the LangTracer dispatcher invokes: it deletes
// LANGSMITH_API_KEY and reads eval-results.json, so this driver must stay a
// thin row loop with no LangSmith imports. Rows are expanded exactly like the
// LangSmith dataset (round-robin scenarios across cases, build-only sentinel
// rows for scenario-less cases, iteration-interleaved) and run through the
// same case pipeline, so the two drivers produce the same result shapes.
// ---------------------------------------------------------------------------

import { aggregateResults } from './aggregator';
import type { ScenarioRowInputs } from './case-pipeline';
import { createEvalSession, type EvalSessionConfig } from './eval-session';
import { expandWithIterations } from './iterations';
import { type RowSink } from './persist';
import { reshapeLangSmithRuns, type ReshapeRunRow } from './reshape';
import { BUILD_ONLY_SCENARIO_NAME, roundRobinCaseRows } from './rows';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { runWithConcurrency } from '../harness/runner';
import type { MultiRunEvaluation, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

export interface DirectRunConfig extends Omit<EvalSessionConfig, 'wrap'> {
	/** Sink for per-iteration results as reshape produces them, so an abort in
	 *  aggregation/persistence still leaves runEvalAndPersist the completed rows. */
	partialResults?: WorkflowTestCaseResult[][];
	/** Journal of completed rows for crash recovery (see run/persist.ts). */
	rowSink?: RowSink;
}

/** Same flattening as the LangSmith dataset sync (run/rows.ts), projected to
 *  the per-row input shape the pipeline consumes. */
function roundRobinRows(testCasesWithFiles: WorkflowTestCaseWithFile[]): ScenarioRowInputs[] {
	return roundRobinCaseRows(testCasesWithFiles).map(({ testCaseFile, scenario }) => ({
		testCaseFile,
		scenarioName: scenario?.name ?? BUILD_ONLY_SCENARIO_NAME,
		scenarioDescription: scenario?.description ?? '',
		dataSetup: scenario?.dataSetup ?? '',
		successCriteria: scenario?.successCriteria ?? '',
	}));
}

export async function runDirect(config: DirectRunConfig): Promise<{
	evaluation: MultiRunEvaluation;
	slugByTestCase: Map<WorkflowTestCase, string>;
}> {
	const { args, lanes, logger, testCasesWithFiles, partialResults, rowSink } = config;

	if (testCasesWithFiles.length === 0) {
		console.log('No workflow test cases selected (check --source / --filter / --exclude / --tier)');
		return { evaluation: { totalRuns: 0, testCases: [] }, slugByTestCase: new Map() };
	}

	const totalScenarios = testCasesWithFiles.reduce(
		(sum, { testCase }) => sum + (testCase.executionScenarios ?? []).length,
		0,
	);
	logger.info(
		`Running ${String(testCasesWithFiles.length)} test case(s) with ${String(totalScenarios)} scenario(s) × ${String(args.iterations)} iteration(s) across ${String(lanes.length)} lane(s)`,
	);

	const session = createEvalSession({ ...config, wrap: (_name, _laneNum, fn) => fn });

	const rows = [
		...expandWithIterations(
			roundRobinRows(testCasesWithFiles),
			(row) => row.testCaseFile,
			args.iterations,
			(row, iteration) => ({ ...row, _iteration: iteration }),
		),
	];

	try {
		// Row concurrency mirrors the LangSmith driver: `--concurrency` rows in
		// flight, builds capped per lane by the allocator (MAX_CONCURRENT_BUILDS).
		const completed: ReshapeRunRow[] = await runWithConcurrency(
			rows,
			async (row) => {
				const outputs = await session.pipeline.runRow(row);
				const completedRow = { run: { inputs: row, outputs } };
				rowSink?.append(completedRow);
				return completedRow;
			},
			args.concurrency,
		);

		const sideBand = await session.resolveSideBand();
		const allRunResults = reshapeLangSmithRuns(
			completed,
			testCasesWithFiles,
			args.iterations,
			sideBand.transcriptByThreadId,
			sideBand.buildExpectations,
			lanes[0]?.baseUrl,
			sideBand.runDebug,
		);
		for (const iterationResults of allRunResults) {
			partialResults?.push(iterationResults);
		}
		return {
			evaluation: aggregateResults(allRunResults, args.iterations),
			slugByTestCase: session.slugByTestCase,
		};
	} finally {
		await session.drainBuilds();
	}
}
