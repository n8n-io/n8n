import type { BuildExpectationResult } from '../types';

/**
 * Which of four situations a case landed in, from crossing the context verdict with
 * the build verdict.
 *
 * A pass rate collapses these into one number, and two of them have opposite fixes:
 * `context-ignored` is a prompting problem, `retrieval-gap` is a retrieval problem.
 * Building a context system to fix the former would be wasted work.
 */
export type ContextOutcome =
	/** Context carried what was needed and the build used it. */
	| 'working'
	/** Context lacked it, but the build was right anyway — re-derived from live state,
	 *  or the task was easy enough not to need it. A context system contributed
	 *  nothing here, so this is the cell that flatters a useless one. */
	| 'unattributed-success'
	/** Context carried it and the build still got it wrong. Not a retrieval problem. */
	| 'context-ignored'
	/** Context never carried it and the build was wrong. The retrieval problem. */
	| 'retrieval-gap'
	/** No gradable context claim, or none of them could be graded — the cross is
	 *  undefined rather than any particular cell. */
	| 'unclassified';

export interface ContextOutcomeSummary {
	outcome: ContextOutcome;
	/** Graded context claims that passed / were graded at all. */
	contextPassed: number;
	contextGraded: number;
	/** Graded build claims (process + outcome) that passed / were graded at all. */
	buildPassed: number;
	buildGraded: number;
}

/**
 * Classify one iteration's verdicts.
 *
 * **Strictest reading on both axes**: context counts as present only if *every*
 * graded context claim passed, and the build counts as correct only if *every*
 * graded build claim passed. A case usually carries several of each, and averaging
 * them would turn the interesting cells into a shrug — the point is to name a
 * situation, and "some context arrived and some of the build was right" names
 * nothing actionable. Documented here because the alternative (per-pairing, where a
 * case declares which context claim backs which build claim) needs case-authoring
 * support that does not exist yet.
 *
 * `incomplete` verdicts are excluded from both axes: they mean "not graded", so
 * counting them either way would invent a finding out of a missing capture.
 */
export function classifyContextOutcome(
	verdicts: BuildExpectationResult[] | undefined,
): ContextOutcomeSummary {
	const graded = (verdicts ?? []).filter((v) => !v.incomplete);
	const context = graded.filter((v) => v.kind === 'memory');
	const build = graded.filter((v) => v.kind !== 'memory');

	const contextPassed = context.filter((v) => v.pass).length;
	const buildPassed = build.filter((v) => v.pass).length;
	const summary = {
		contextPassed,
		contextGraded: context.length,
		buildPassed,
		buildGraded: build.length,
	};

	// Without a graded claim on both axes there is no cross to report. Saying
	// `working` here would let a case with no context claim at all look like
	// evidence that the context layer worked.
	if (context.length === 0 || build.length === 0) {
		return { outcome: 'unclassified', ...summary };
	}

	const contextPresent = contextPassed === context.length;
	const buildCorrect = buildPassed === build.length;

	if (contextPresent) return { outcome: buildCorrect ? 'working' : 'context-ignored', ...summary };
	return { outcome: buildCorrect ? 'unattributed-success' : 'retrieval-gap', ...summary };
}

/** Short human label for the report. */
export const CONTEXT_OUTCOME_LABEL: Record<ContextOutcome, string> = {
	working: 'context used',
	'unattributed-success': 'passed without the context',
	'context-ignored': 'context present but unused',
	'retrieval-gap': 'context never retrieved',
	unclassified: 'not classified',
};
