// ---------------------------------------------------------------------------
// PR-side comparison bucket: project the in-memory MultiRunEvaluation onto
// the ExperimentBucket shape used by fetchBaselineBucket.
// ---------------------------------------------------------------------------

import {
	expectationUnitKey,
	scenarioUnitKey,
	type EvaluationUnitCounts,
	type ExperimentBucket,
} from './compare';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { MultiRunEvaluation } from '../types';
import { caseDisplayPrompt } from '../utils/conversation-text';

/**
 * Units are execution scenarios plus evaluated build expectations, keyed the
 * same way as the baseline bucket. Expectations with no evaluated verdict are
 * unmeasured — they don't become units. Failure-category totals and
 * `trialTotal` stay scenario-only (expectation verdicts carry no category).
 *
 * Looks up `fileSlug` by test case reference rather than array index — the
 * comparison key depends on getting the right slug, and zipping by index
 * silently miscompares if anything ever reorders the aggregate.
 */
export function bucketFromEvaluation(
	evaluation: MultiRunEvaluation,
	testCasesWithFiles: WorkflowTestCaseWithFile[],
	experimentName: string,
): ExperimentBucket {
	const slugByTestCase = new Map(
		testCasesWithFiles.map(({ testCase, fileSlug }) => [testCase, fileSlug]),
	);
	const evaluationUnits = new Map<string, EvaluationUnitCounts>();
	const failureCategoryTotals: Record<string, number> = {};
	let trialTotal = 0;
	for (const tc of evaluation.testCases) {
		const fileSlug = slugByTestCase.get(tc.testCase);
		if (!fileSlug) {
			throw new Error(
				`bucketFromEvaluation: no fileSlug for test case "${caseDisplayPrompt(tc.testCase, tc.runs[0]?.transcript).slice(0, 60)}"`,
			);
		}
		for (const sa of tc.executionScenarios) {
			const failureCategories: Record<string, number> = {};
			for (const sr of sa.runs) {
				// Verifier-incomplete runs carry no verdict — not a trial.
				if (sr.incomplete) continue;
				trialTotal++;
				if (!sr.success && sr.failureCategory) {
					failureCategories[sr.failureCategory] = (failureCategories[sr.failureCategory] ?? 0) + 1;
					failureCategoryTotals[sr.failureCategory] =
						(failureCategoryTotals[sr.failureCategory] ?? 0) + 1;
				}
			}
			evaluationUnits.set(scenarioUnitKey(fileSlug, sa.scenario.name), {
				kind: 'scenario',
				testCaseFile: fileSlug,
				name: sa.scenario.name,
				passed: sa.passCount,
				total: sa.evaluatedCount,
				failureCategories,
			});
		}
		for (const ea of tc.buildExpectations) {
			if (ea.evaluatedCount === 0) continue;
			evaluationUnits.set(expectationUnitKey(fileSlug, ea.expectation), {
				kind: 'expectation',
				testCaseFile: fileSlug,
				name: ea.expectation,
				passed: ea.passCount,
				total: ea.evaluatedCount,
			});
		}
	}
	return { experimentName, evaluationUnits, failureCategoryTotals, trialTotal };
}
