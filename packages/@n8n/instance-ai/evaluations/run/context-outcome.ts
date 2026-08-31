import type { BuildExpectationResult } from '../types';

/**
 * Which of four situations a case landed in, from crossing the context verdict with
 * the build verdict.
 *
 * A single pass rate collapses these into one number, and two of them have opposite
 * fixes: `context-ignored` is a prompting problem, `retrieval-gap` is a retrieval
 * problem. Building a retrieval system to fix the former would be wasted work, and
 * the collapsed number cannot tell you which one you have.
 */
export type ContextOutcome =
	/** The context carried what was needed and the build used it. */
	| 'working'
	/** The context lacked it and the build was right anyway — re-derived from live
	 *  state, or the task did not really need it. A context feature contributed
	 *  nothing here, so this is the cell that flatters a useless one. */
	| 'unattributed-success'
	/** The context carried it and the build still got it wrong. Not a retrieval problem. */
	| 'context-ignored'
	/** The context never carried it and the build was wrong. The retrieval problem. */
	| 'retrieval-gap'
	/** One of the two axes had nothing gradable, so the cross is undefined. */
	| 'unclassified';

export interface ContextOutcomeSummary {
	outcome: ContextOutcome;
	contextPassed: number;
	contextGraded: number;
	buildPassed: number;
	buildGraded: number;
}

/**
 * Classify one iteration's verdicts.
 *
 * Strictest reading on both axes: context counts as present only if *every* graded
 * context claim passed, and the build counts as correct only if *every* graded build
 * claim passed. A case usually carries several of each, and averaging them would turn
 * the interesting cells into a shrug — "some context arrived and some of the build was
 * right" names nothing actionable. Per-claim pairing would be better, and needs
 * case-authoring support that does not exist yet.
 *
 * `incomplete` verdicts are excluded from both axes. They mean "not graded", so
 * counting them either way would invent a finding out of a missing capture.
 */
export function classifyContextOutcome(
	verdicts: BuildExpectationResult[] | undefined,
): ContextOutcomeSummary {
	const graded = (verdicts ?? []).filter((verdict) => !verdict.incomplete);
	const context = graded.filter((verdict) => verdict.kind === 'context');
	const build = graded.filter((verdict) => verdict.kind !== 'context');

	const summary = {
		contextPassed: context.filter((verdict) => verdict.pass).length,
		contextGraded: context.length,
		buildPassed: build.filter((verdict) => verdict.pass).length,
		buildGraded: build.length,
	};

	// Without a graded claim on both axes there is no cross to report. Returning
	// `working` here would let a case with no context claim at all read as evidence
	// that the context layer did something.
	if (context.length === 0 || build.length === 0) return { outcome: 'unclassified', ...summary };

	const contextPresent = summary.contextPassed === context.length;
	const buildCorrect = summary.buildPassed === build.length;

	if (contextPresent) return { outcome: buildCorrect ? 'working' : 'context-ignored', ...summary };
	return { outcome: buildCorrect ? 'unattributed-success' : 'retrieval-gap', ...summary };
}
