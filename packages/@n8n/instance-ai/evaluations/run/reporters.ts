// ---------------------------------------------------------------------------
// Reporters — human-facing output after a run persists (TRUST-261): console
// paths, HTML reports, the terminal comparison summary, and the baseline
// noise advisory. Data artifacts (eval-results.json, PR comment) are written
// by run/persist.ts; everything here is presentation.
// ---------------------------------------------------------------------------

import type { ComparisonOutcome } from '../comparison/compare';
import { formatComparisonTerminal } from '../comparison/format';
import type { GateResult } from '../comparison/gate';
import { writeRunDebugReport } from '../report/run-debug-report';
import { writeWorkflowReport } from '../report/workflow-report';
import type { MultiRunEvaluation, WorkflowTestCase, WorkflowTestCaseResult } from '../types';
import { caseDisplayPrompt } from '../utils/conversation-text';

/** Framework-noise share above which a baseline capture gets a quality warning. */
const BASELINE_MAX_FRAMEWORK_NOISE_RATE = 0.05;

/** Count framework-noise trials and cases that failed on nothing but noise. */
function assessFrameworkNoise(
	evaluation: MultiRunEvaluation,
	slugByTestCase?: Map<WorkflowTestCase, string>,
): { frameworkTrials: number; totalTrials: number; fullyNoisyCases: string[] } {
	let frameworkTrials = 0;
	let totalTrials = 0;
	const fullyNoisyCases: string[] = [];
	for (const tc of evaluation.testCases) {
		let caseFramework = 0;
		let caseTotal = 0;
		for (const sa of tc.executionScenarios) {
			for (const run of sa.runs) {
				if (run.incomplete) continue;
				caseTotal++;
				if (!run.success && run.failureCategory === 'framework_issue') caseFramework++;
			}
		}
		frameworkTrials += caseFramework;
		totalTrials += caseTotal;
		if (caseTotal > 0 && caseFramework === caseTotal) {
			fullyNoisyCases.push(slugByTestCase?.get(tc.testCase) ?? caseDisplayPrompt(tc.testCase));
		}
	}
	return { frameworkTrials, totalTrials, fullyNoisyCases };
}

/**
 * Flatten per-iteration runs into a single list of test-case results for the
 * HTML report. Previously we rendered only `tc.runs[0]`, which silently hid
 * iterations 2..N — a flaky scenario that passed once and failed twice would
 * appear clean in the uploaded artifact. For multi-iteration runs we prefix
 * the opening user turn with its iteration number so the cards are
 * distinguishable at a glance.
 */
function flattenRunsForReport(evaluation: MultiRunEvaluation): WorkflowTestCaseResult[] {
	if (evaluation.totalRuns <= 1) {
		return evaluation.testCases.map((tc) => tc.runs[0]);
	}
	return evaluation.testCases.flatMap((tc) =>
		tc.runs.map((run, iter) => {
			// seedThread cases carry no authored conversation (the live turn comes
			// from the trace) — nothing to relabel.
			if (!run.testCase.conversation?.length) return run;
			const [opening, ...rest] = run.testCase.conversation;
			return {
				...run,
				testCase: {
					...run.testCase,
					conversation: [
						{
							...opening,
							text: `[iter ${String(iter + 1)}/${String(evaluation.totalRuns)}] ${opening.text}`,
						},
						...rest,
					],
				},
			};
		}),
	);
}

export function emitRunReports(config: {
	evaluation: MultiRunEvaluation;
	outcome: ComparisonOutcome | undefined;
	gate: GateResult | undefined;
	slugByTestCase: Map<WorkflowTestCase, string> | undefined;
	commitSha: string | undefined;
	jsonPath: string;
	prCommentPath: string;
	/** --experiment-name; baseline-prefixed names trigger the noise advisory. */
	experimentName?: string;
}): void {
	const { evaluation, outcome, gate, slugByTestCase, commitSha, jsonPath, prCommentPath } = config;
	console.log(`Results:    ${jsonPath}`);
	console.log(`PR comment: ${prCommentPath}`);
	const reportResults = flattenRunsForReport(evaluation);
	const htmlPath = writeWorkflowReport(reportResults);
	console.log(`Report:     ${htmlPath}`);
	const debugHtmlPath = writeRunDebugReport(reportResults);
	console.log(`LLM debug:  ${debugHtmlPath}`);
	console.log(
		'\n' + formatComparisonTerminal(evaluation, outcome, { commitSha, slugByTestCase, gate }),
	);

	// Advisory only: findLatestBaseline trusts the newest experiment by
	// prefix, so surface elevated harness noise for the humans reading the log.
	if (config.experimentName?.startsWith('instance-ai-baseline')) {
		const { frameworkTrials, totalTrials, fullyNoisyCases } = assessFrameworkNoise(
			evaluation,
			slugByTestCase,
		);
		const noiseRate = totalTrials > 0 ? frameworkTrials / totalTrials : 0;
		if (noiseRate > BASELINE_MAX_FRAMEWORK_NOISE_RATE || fullyNoisyCases.length > 0) {
			console.warn(
				`Baseline quality warning: ${String(frameworkTrials)}/${String(totalTrials)} trials (${(noiseRate * 100).toFixed(1)}%) failed for harness reasons` +
					' (lane transport, seeding, timeouts) rather than agent behavior' +
					(fullyNoisyCases.length > 0
						? `; cases with only framework failures: ${fullyNoisyCases.join(', ')}`
						: '') +
					'. This experiment becomes the comparison target for future runs, but those scenarios will' +
					' under-count the agent — deltas against them may reflect harness noise, not regressions or' +
					' improvements. Consider fixing the noise and re-capturing.',
			);
		}
	}
}
