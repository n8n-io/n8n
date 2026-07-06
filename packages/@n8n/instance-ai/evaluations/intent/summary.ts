// ---------------------------------------------------------------------------
// Aggregate intent-resolution grades across a multi-run evaluation into a
// joint/per-field accuracy summary, diagnostic slices, and non-blocking
// monitoring bars. Pure — reads `intentGrade` off already-computed run
// results, no LLM calls.
// ---------------------------------------------------------------------------

import type { IntentPartGrade, MultiRunEvaluation } from '../types';

export interface IntentSliceStat {
	/** e.g. "tag:false-friend", "context:standalone", "complexity:simple", "source:synthetic", "anchor:wf". */
	key: string;
	total: number;
	passCount: number;
	accuracy: number;
}

export interface IntentMonitoringBar {
	bar: string;
	threshold: number;
	actual: number;
	met: boolean;
}

export interface IntentSummary {
	caseCount: number;
	runCount: number;
	/** Fraction of runs where every graded part's `jointPass` is true. */
	jointAccuracy: number;
	/** Fraction of graded parts (across all runs) where `anchorMatch` is true. */
	anchorAccuracy: number;
	/** Fraction of graded parts (across all runs) where `embedsMatch` is true. */
	embedsAccuracy: number;
	/** Mean LLM-judged rationale score (0-2) over parts with a verdict. `null` if none were judged. */
	meanRationaleScore: number | null;
	slices: IntentSliceStat[];
	/** Non-blocking — informational bars for eyeballing regressions, not a gate. */
	monitoringBars: IntentMonitoringBar[];
}

interface SliceAccumulator {
	total: number;
	passCount: number;
}

function bump(slices: Map<string, SliceAccumulator>, key: string, pass: boolean): void {
	const stat = slices.get(key) ?? { total: 0, passCount: 0 };
	stat.total += 1;
	if (pass) stat.passCount += 1;
	slices.set(key, stat);
}

function accuracyOf(stat: SliceAccumulator | undefined): number {
	return stat && stat.total > 0 ? stat.passCount / stat.total : 0;
}

function buildBar(
	label: string,
	threshold: number,
	stat: SliceAccumulator | undefined,
): IntentMonitoringBar | undefined {
	if (!stat || stat.total === 0) return undefined;
	const actual = accuracyOf(stat);
	return { bar: label, threshold, actual, met: actual >= threshold };
}

/**
 * Build the intent-resolution summary from a full evaluation run. Returns
 * `undefined` when no case in the run carries an `intentExpectation` — the
 * summary section is omitted entirely rather than shown empty.
 */
export function computeIntentSummary(evaluation: MultiRunEvaluation): IntentSummary | undefined {
	const intentCases = evaluation.testCases.filter((tc) => tc.testCase.intentExpectation);
	if (intentCases.length === 0) return undefined;

	let runCount = 0;
	let jointPassCount = 0;
	let partCount = 0;
	let anchorMatchCount = 0;
	let embedsMatchCount = 0;
	const rationaleScores: number[] = [];
	const slices = new Map<string, SliceAccumulator>();

	for (const tc of intentCases) {
		const expectation = tc.testCase.intentExpectation;
		if (!expectation) continue;

		for (const run of tc.runs) {
			const grade = run.intentGrade;
			if (!grade || grade.parts.length === 0) continue;
			runCount += 1;

			const caseJointPass = grade.parts.every((part) => part.jointPass);
			if (caseJointPass) jointPassCount += 1;

			grade.parts.forEach((part: IntentPartGrade, idx: number) => {
				partCount += 1;
				if (part.anchorMatch) anchorMatchCount += 1;
				if (part.embedsMatch) embedsMatchCount += 1;
				if (part.rationaleScore !== undefined) rationaleScores.push(part.rationaleScore);

				const accepts = expectation.parts ? expectation.parts[idx].accepts : expectation.accepts;
				for (const accept of accepts ?? []) {
					bump(slices, `anchor:${accept.anchor}`, part.jointPass);
				}
			});

			bump(slices, `context:${expectation.context}`, caseJointPass);
			bump(slices, `complexity:${tc.testCase.complexity}`, caseJointPass);
			bump(slices, `source:${expectation.source}`, caseJointPass);
			for (const tag of tc.testCase.tags) {
				bump(slices, `tag:${tag}`, caseJointPass);
			}
		}
	}

	const sliceStats: IntentSliceStat[] = [...slices.entries()]
		.map(([key, stat]) => ({
			key,
			total: stat.total,
			passCount: stat.passCount,
			accuracy: accuracyOf(stat),
		}))
		.sort((a, b) => a.key.localeCompare(b.key));

	const monitoringBars = [
		runCount > 0
			? {
					bar: 'joint accuracy >= 75%',
					threshold: 0.75,
					actual: jointPassCount / runCount,
					met: jointPassCount / runCount >= 0.75,
				}
			: undefined,
		buildBar('false-friend slice >= 80%', 0.8, slices.get('tag:false-friend')),
		buildBar('easy (complexity: simple) slice >= 90%', 0.9, slices.get('complexity:simple')),
	].filter((bar): bar is IntentMonitoringBar => bar !== undefined);

	return {
		caseCount: intentCases.length,
		runCount,
		jointAccuracy: runCount > 0 ? jointPassCount / runCount : 0,
		anchorAccuracy: partCount > 0 ? anchorMatchCount / partCount : 0,
		embedsAccuracy: partCount > 0 ? embedsMatchCount / partCount : 0,
		meanRationaleScore:
			rationaleScores.length > 0
				? rationaleScores.reduce((sum, s) => sum + s, 0) / rationaleScores.length
				: null,
		slices: sliceStats,
		monitoringBars,
	};
}

function pct(n: number): string {
	return `${(n * 100).toFixed(0)}%`;
}

/** Render the intent summary as a PR-comment section — joint/per-field
 *  accuracy, mean rationale score, monitoring bars (informational, not a
 *  gate), and the diagnostic slice breakdown. */
export function formatIntentSummaryMarkdown(summary: IntentSummary): string {
	return [
		'## Intent resolution',
		'',
		`- Joint accuracy: ${pct(summary.jointAccuracy)} (${String(summary.runCount)} runs across ${String(summary.caseCount)} cases)`,
		`- Anchor accuracy: ${pct(summary.anchorAccuracy)}`,
		`- Embeds-other accuracy: ${pct(summary.embedsAccuracy)}`,
		`- Mean rationale score: ${summary.meanRationaleScore !== null ? `${summary.meanRationaleScore.toFixed(2)}/2` : 'n/a'}`,
		'',
		'**Monitoring bars** (informational, non-blocking):',
		'',
		...summary.monitoringBars.map(
			(bar) => `- ${bar.met ? '✅' : '⚠️'} ${bar.bar} — actual ${pct(bar.actual)}`,
		),
		'',
		'**Slices:**',
		'',
		...summary.slices.map(
			(s) => `- \`${s.key}\`: ${pct(s.accuracy)} (${String(s.passCount)}/${String(s.total)})`,
		),
	].join('\n');
}
