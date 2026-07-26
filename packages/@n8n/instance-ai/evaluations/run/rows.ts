// ---------------------------------------------------------------------------
// Row flattening — the single source of truth for which rows a run evaluates
// and in what order. The LangSmith dataset sync and the direct driver both
// flatten cases through here, so keyless (dispatcher) and CI runs can never
// drift to different row sets or orders.
// ---------------------------------------------------------------------------

import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { ExecutionScenario, WorkflowTestCase } from '../types';

/** Scenario name for the single "build-only" row a 0-scenario case emits, so
 *  the workflow still builds and its process/outcome expectations get judged.
 *  Shared by the dataset sync, both drivers and reshape so all agree on the
 *  sentinel. */
export const BUILD_ONLY_SCENARIO_NAME = '__build_only__';

export interface CaseRow {
	testCase: WorkflowTestCase;
	testCaseFile: string;
	/** null = the build-only sentinel row of a scenario-less case. */
	scenario: ExecutionScenario | null;
}

/**
 * Flatten test cases into rows ordered round-robin across cases: scenario #1
 * of every case, then scenario #2, …, then one build-only sentinel row per
 * scenario-less case — so builds diversify early instead of burning all
 * concurrency slots on one test case.
 *
 * Input:  [tc1(s1,s2,s3), tc2(s1,s2), tc3()]
 * Output: [tc1/s1, tc2/s1, tc1/s2, tc2/s2, tc1/s3, tc3/sentinel]
 */
export function roundRobinCaseRows(testCasesWithFiles: WorkflowTestCaseWithFile[]): CaseRow[] {
	const rows: CaseRow[] = [];
	const maxScenarios = Math.max(
		...testCasesWithFiles.map(({ testCase }) => (testCase.executionScenarios ?? []).length),
		0,
	);
	for (let i = 0; i < maxScenarios; i++) {
		for (const { testCase, fileSlug } of testCasesWithFiles) {
			const scenario = testCase.executionScenarios?.[i];
			if (scenario) rows.push({ testCase, testCaseFile: fileSlug, scenario });
		}
	}
	for (const { testCase, fileSlug } of testCasesWithFiles) {
		if ((testCase.executionScenarios?.length ?? 0) === 0) {
			rows.push({ testCase, testCaseFile: fileSlug, scenario: null });
		}
	}
	return rows;
}
