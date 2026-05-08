// ---------------------------------------------------------------------------
// Render the eval run as a PR comment (markdown) or a console summary
// (aligned plain text). Both formats are driven by:
//
//   - MultiRunEvaluation — pass rates, build counts, per-trial reasoning
//   - ComparisonOutcome (optional) — tagged result of the baseline
//     comparison: `ok` (ran, has scenarios), `no_baseline` (skipped), or
//     `fetch_failed` / `self_baseline` (skipped for cause). Each kind
//     drives a distinct top-of-comment alert so a LangSmith outage doesn't
//     get dressed up as "no baseline configured".
//
// When no comparison is available (no baseline yet, LangSmith offline)
// the renderers still produce a useful per-test-case summary. When a
// comparison is available, sections render in priority order:
// regressions, likely regressions, worth watching, improvements,
// failure-category drift. Only sections with content are emitted.
// ---------------------------------------------------------------------------

import {
	hardRegressions,
	improvements,
	softRegressions,
	watchList,
	type ComparisonOutcome,
	type ComparisonResult,
	type FailureCategoryComparison,
	type ScenarioComparison,
} from './compare';
import type {
	MultiRunEvaluation,
	TestCaseAggregation,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';

interface FormatOptions {
	/** Optional commit SHA to include in the heading. Truncated to 8 chars. */
	commitSha?: string;
	/** Maps each test-case reference to its file slug. When provided, the
	 *  per-scenario failure breakdown looks up failed runs by
	 *  `${fileSlug}/${scenarioName}` — deterministic across collisions like
	 *  multiple `happy-path` scenarios. When omitted, the breakdown is
	 *  skipped (no name-only fallback — that lookup was wrong on real data). */
	slugByTestCase?: Map<WorkflowTestCase, string>;
}

// ---------------------------------------------------------------------------
// Markdown PR comment
// ---------------------------------------------------------------------------

export function formatComparisonMarkdown(
	evaluation: MultiRunEvaluation,
	outcome?: ComparisonOutcome,
	options: FormatOptions = {},
): string {
	const lines: string[] = [];
	const comparison = outcome?.kind === 'ok' ? outcome.result : undefined;

	lines.push(formatHeading(options.commitSha));
	lines.push('');
	lines.push(formatTopAlert(outcome));
	lines.push('');
	lines.push(formatAggregateBlock(evaluation, comparison));
	lines.push('');

	if (comparison) {
		const hard = hardRegressions(comparison);
		const soft = softRegressions(comparison);
		const watch = watchList(comparison);
		const imps = improvements(comparison);

		const renderedAnyTable = hard.length > 0 || soft.length > 0 || imps.length > 0;

		// Built once and reused across the regression-tier sections so each
		// scenario row can carry a collapsible breakdown of its failed PR runs.
		// Improvements skip the breakdown — they passed. Skipped entirely when
		// the caller didn't pass a slug map (lookup would be ambiguous).
		const failedIndex = options.slugByTestCase
			? buildFailedRunsIndex(evaluation, options.slugByTestCase)
			: undefined;

		if (hard.length > 0) {
			lines.push(
				...renderScenarioSection('Regressions', '— high-confidence', hard, true, failedIndex),
			);
		}
		if (soft.length > 0) {
			lines.push(
				...renderScenarioSection(
					'Likely regressions',
					'— looser statistical flag, investigate if related to your changes',
					soft,
					true,
					failedIndex,
				),
			);
		}
		if (watch.length > 0) {
			lines.push(
				...renderScenarioSection(
					'Worth watching',
					'— large change, not flagged as a regression',
					watch,
					false,
					failedIndex,
				),
			);
		}
		if (imps.length > 0) {
			lines.push(...renderScenarioSection('Improvements', '', imps, true));
		}

		if (renderedAnyTable) {
			lines.push(
				"_p = Fisher's exact one-sided p-value. Lower = stronger evidence of a real change._",
			);
			lines.push('');
		}

		// Always render the breakdown when comparison data is available — the
		// renderer drops 0/0 rows itself, so empty categories don't pollute
		// the output but the reader still sees the full taxonomy of what's
		// tracked.
		lines.push(...renderFailureCategorySection(comparison.failureCategories));
	}

	lines.push(...renderPerTestCaseDetails(evaluation, options.slugByTestCase));

	if (comparison) {
		const otherFindings = renderOtherFindings(comparison);
		if (otherFindings.length > 0) lines.push(...otherFindings);
	}

	const failureDetails = renderFailureDetails(evaluation, options.slugByTestCase);
	if (failureDetails.length > 0) lines.push(...failureDetails);

	return lines.join('\n');
}

function formatHeading(commitSha?: string): string {
	const sha = commitSha ? ` — \`${commitSha.slice(0, 8)}\`` : '';
	return `### Instance AI Workflow Eval${sha}`;
}

function formatTopAlert(outcome?: ComparisonOutcome): string {
	if (!outcome) {
		return ['> [!NOTE]', '> No baseline comparison ran (LangSmith disabled for this run).'].join(
			'\n',
		);
	}

	if (outcome.kind === 'no_baseline') {
		return [
			'> [!NOTE]',
			'> No baseline configured — comparison skipped. Run the eval with `--experiment-name instance-ai-baseline` on master to create one.',
		].join('\n');
	}
	if (outcome.kind === 'self_baseline') {
		return [
			'> [!NOTE]',
			`> This run is the baseline (\`${outcome.experimentName}\`) — nothing to compare against.`,
		].join('\n');
	}
	if (outcome.kind === 'fetch_failed') {
		return [
			'> [!WARNING]',
			`> Regression detection did not run — baseline fetch failed: ${outcome.error}`,
		].join('\n');
	}

	const comparison = outcome.result;
	const hard = hardRegressions(comparison).length;
	const soft = softRegressions(comparison).length;
	const watch = watchList(comparison).length;
	const imps = improvements(comparison).length;
	const stable = countByVerdict(comparison, 'stable');

	const aggDelta = comparison.aggregate.delta * 100;
	const aggDeltaText = `${aggDelta >= 0 ? '+' : ''}${aggDelta.toFixed(1)}pp`;
	const passRateText = `pass rate ${aggDeltaText} vs master`;

	// Two-line summary: regression-tier counts on top, positives/neutrals on the
	// bottom. The pass-rate delta tails whichever line matches its sign so the
	// per-line story stays coherent (negative delta lives with the concerns).
	const concernsParts = [
		hard > 0 ? `**${hard} regression${hard === 1 ? '' : 's'}**` : '0 regressions',
		`${soft} likely regression${soft === 1 ? '' : 's'}`,
		`${watch} worth watching`,
	];
	const winsParts = [`${imps} improvement${imps === 1 ? '' : 's'}`, `${stable} stable`];
	if (aggDelta < 0) {
		concernsParts.push(passRateText);
	} else {
		winsParts.push(passRateText);
	}
	const concerns = concernsParts.join(' · ');
	const wins = winsParts.join(' · ');

	let icon: string;
	let alertKind: 'CAUTION' | 'WARNING' | 'NOTE' | 'TIP';

	if (hard > 0) {
		icon = '🔴';
		alertKind = 'CAUTION';
	} else if (soft > 0) {
		icon = '🟡';
		alertKind = 'WARNING';
	} else if (watch > 0) {
		icon = '🔵';
		alertKind = 'NOTE';
	} else {
		icon = '🟢';
		alertKind = 'TIP';
	}

	return `> [!${alertKind}]\n> ${icon} ${concerns}\n> ${wins}`;
}

function formatAggregateBlock(
	evaluation: MultiRunEvaluation,
	comparison?: ComparisonResult,
): string {
	if (!comparison) {
		const allScenarios = evaluation.testCases.flatMap((tc) => tc.scenarios);
		const passed = allScenarios.reduce((sum, sa) => sum + sa.passCount, 0);
		const total = allScenarios.reduce((sum, sa) => sum + sa.runs.length, 0);
		const rate = total > 0 ? (passed / total) * 100 : 0;
		return `**Aggregate**: ${rate.toFixed(1)}% pass (${passed}/${total} trials, ${allScenarios.length} scenarios × N=${evaluation.totalRuns})`;
	}

	const { aggregate } = comparison;
	const delta = aggregate.delta * 100;
	const sign = delta >= 0 ? '+' : '';
	const arrow = delta > 0 ? ' ↑' : delta < 0 ? ' ↓' : '';

	const baselineN = inferBaselineN(comparison);
	const sampleLine = baselineN
		? `_${aggregate.intersectionSize} scenarios · N=${evaluation.totalRuns} (PR) vs N=${baselineN} (baseline) · baseline: \`${comparison.baseline.experimentName}\`_`
		: `_${aggregate.intersectionSize} scenarios · N=${evaluation.totalRuns} (PR) · baseline: \`${comparison.baseline.experimentName}\`_`;

	const partial = comparison.baselineOnly.length + comparison.prOnly.length;
	const partialNote =
		partial > 0
			? `\n_Partial: ${[
					comparison.baselineOnly.length > 0
						? `${comparison.baselineOnly.length} baseline scenarios not run by PR`
						: null,
					comparison.prOnly.length > 0
						? `${comparison.prOnly.length} PR scenarios have no baseline data (added since baseline captured)`
						: null,
				]
					.filter((s) => s !== null)
					.join(', ')}._`
			: '';

	return [
		`**Aggregate**: ${pct(aggregate.prAggregatePassRate)}% PR vs ${pct(aggregate.baselineAggregatePassRate)}% baseline — **${sign}${delta.toFixed(1)}pp${arrow}**`,
		sampleLine + partialNote,
	].join('\n');
}

function renderScenarioSection(
	heading: string,
	subtitle: string,
	scenarios: ScenarioComparison[],
	withPValue: boolean,
	failedIndex?: FailedRunsBySlug,
): string[] {
	const lines: string[] = [];
	const headingLine = subtitle
		? `#### ${heading} (${scenarios.length}) ${subtitle}`
		: `#### ${heading} (${scenarios.length})`;
	lines.push(headingLine);
	lines.push('');
	if (withPValue) {
		lines.push('| Scenario | PR | Baseline | Δ | p |');
		lines.push('|---|---|---|---|---|');
	} else {
		lines.push('| Scenario | PR | Baseline | Δ |');
		lines.push('|---|---|---|---|');
	}
	for (const s of scenarios) {
		const cells = [
			`\`${s.testCaseFile}/${s.scenarioName}\``,
			formatRateCell(s.prPasses, s.prTotal),
			formatRateCell(s.baselinePasses, s.baselineTotal),
			formatDeltaCell(s.delta),
		];
		if (withPValue) {
			const p = s.verdict === 'improvement' ? s.pValueRight : s.pValueLeft;
			cells.push(p.toFixed(3));
		}
		lines.push(`| ${cells.join(' | ')} |`);
	}
	lines.push('');

	// Per-scenario failure breakdown — one collapsible per row that had failed
	// PR runs. Lets the reader drill into each flagged scenario without
	// hunting through a separate "Failure details" section.
	if (failedIndex) {
		for (const s of scenarios) {
			const failedRuns = failedIndex.get(`${s.testCaseFile}/${s.scenarioName}`) ?? [];
			if (failedRuns.length === 0) continue;
			lines.push(...renderScenarioFailureBreakdown(s, failedRuns));
		}
	}

	return lines;
}

function renderScenarioFailureBreakdown(
	s: ScenarioComparison,
	failedRuns: FailedRunDetail[],
): string[] {
	const slug = `${s.testCaseFile}/${s.scenarioName}`;
	const categoryMix = summarizeCategories(failedRuns);
	const summaryParts = [`${failedRuns.length} of ${s.prTotal} failed`];
	if (categoryMix) summaryParts.push(categoryMix);

	const lines: string[] = [];
	lines.push(`<details><summary><code>${slug}</code> — ${summaryParts.join(' · ')}</summary>`);
	lines.push('');
	for (const fr of failedRuns) {
		const tag = fr.category ? ` [${fr.category}]` : '';
		lines.push(`> Run ${fr.runIndex}${tag}: ${fr.reasoning.slice(0, 300)}`);
		lines.push('>');
	}
	// Drop the trailing empty quote line.
	if (lines[lines.length - 1] === '>') lines.pop();
	lines.push('');
	lines.push('</details>');
	lines.push('');
	return lines;
}

function renderFailureCategorySection(categories: FailureCategoryComparison[]): string[] {
	// Drop rows that are 0/0 on both sides — they carry no signal for the
	// reader. Categories with non-zero count on either side are kept so the
	// reader sees the full picture even if not "notable".
	const rows = categories.filter((c) => c.prCount > 0 || c.baselineCount > 0);
	if (rows.length === 0) return [];

	const lines: string[] = [];
	lines.push('#### Failure breakdown');
	lines.push('');
	lines.push('| Category | PR | Baseline | Δ | |');
	lines.push('|---|---|---|---|---|');
	for (const c of rows) {
		const isNew = c.baselineCount === 0 && c.prCount > 0;
		const label = isNew ? `\`${c.category}\` 🆕` : `\`${c.category}\``;
		const delta = c.delta * 100;
		const sign = delta >= 0 ? '+' : '';
		const arrow = delta > 0 ? ' ↑' : delta < 0 ? ' ↓' : '';
		const notableMarker = c.notable ? '**notable**' : '';
		lines.push(
			`| ${label} | ${c.prCount} (${pct(c.prRate)}%) | ${c.baselineCount} (${pct(c.baselineRate)}%) | ${sign}${delta.toFixed(1)}pp${arrow} | ${notableMarker} |`,
		);
	}
	lines.push('');
	return lines;
}

function renderPerTestCaseDetails(
	evaluation: MultiRunEvaluation,
	slugByTestCase?: Map<WorkflowTestCase, string>,
): string[] {
	const { totalRuns, testCases } = evaluation;
	if (testCases.length === 0) return [];
	const lines: string[] = [];
	lines.push(`<details><summary>Per-test-case results (${testCases.length})</summary>`);
	lines.push('');
	const renderName = (tc: TestCaseAggregation): string => {
		const slug = slugByTestCase?.get(tc.testCase);
		return slug ? `\`${slug}\`` : `\`${tc.testCase.prompt.slice(0, 70)}\``;
	};
	if (totalRuns > 1) {
		lines.push(`| Workflow | Built | pass@${totalRuns} | pass^${totalRuns} |`);
		lines.push('|---|---|---|---|');
		for (const tc of testCases) {
			const meanPassAtK = tc.scenarios.length
				? Math.round(
						(tc.scenarios.reduce((sum, sa) => sum + (sa.passAtK[totalRuns - 1] ?? 0), 0) /
							tc.scenarios.length) *
							100,
					)
				: 0;
			const meanPassHatK = tc.scenarios.length
				? Math.round(
						(tc.scenarios.reduce((sum, sa) => sum + (sa.passHatK[totalRuns - 1] ?? 0), 0) /
							tc.scenarios.length) *
							100,
					)
				: 0;
			lines.push(
				`| ${renderName(tc)} | ${tc.buildSuccessCount}/${totalRuns} | ${meanPassAtK}% | ${meanPassHatK}% |`,
			);
		}
	} else {
		lines.push('| Workflow | Built | Pass rate |');
		lines.push('|---|---|---|');
		for (const tc of testCases) {
			const built = tc.runs[0]?.workflowBuildSuccess ? '✓' : '✗';
			const passed = tc.scenarios.filter((sa) => sa.runs[0]?.success).length;
			const total = tc.scenarios.length;
			lines.push(`| ${renderName(tc)} | ${built} | ${passed}/${total} |`);
		}
	}
	lines.push('');
	lines.push('</details>');
	lines.push('');
	return lines;
}

function renderOtherFindings(comparison: ComparisonResult): string[] {
	const stable = countByVerdict(comparison, 'stable');
	const flaky = countByVerdict(comparison, 'unreliable_baseline');
	const noData = countByVerdict(comparison, 'insufficient_data');
	if (stable === 0 && flaky === 0 && noData === 0) return [];

	const summaryParts: string[] = [];
	if (flaky > 0) summaryParts.push(`${flaky} on flaky baseline`);
	if (noData > 0) summaryParts.push(`${noData} no data`);
	if (stable > 0) summaryParts.push(`${stable} stable`);
	const summary = summaryParts.join(' · ');

	const lines: string[] = [];
	lines.push(`<details><summary>Other findings: ${summary}</summary>`);
	lines.push('');

	const stableScenarios = comparison.scenarios.filter((s) => s.verdict === 'stable');
	const flakyScenarios = comparison.scenarios.filter((s) => s.verdict === 'unreliable_baseline');
	const noDataScenarios = comparison.scenarios.filter((s) => s.verdict === 'insufficient_data');

	if (flakyScenarios.length > 0) {
		lines.push('**Confident drop on a flaky baseline (surfaced for visibility, not flagged):**');
		lines.push('');
		lines.push('| Scenario | PR | Baseline | Δ |');
		lines.push('|---|---|---|---|');
		for (const s of flakyScenarios) {
			lines.push(
				`| \`${s.testCaseFile}/${s.scenarioName}\` | ${formatRateCell(s.prPasses, s.prTotal)} | ${formatRateCell(s.baselinePasses, s.baselineTotal)} | ${formatDeltaCell(s.delta)} |`,
			);
		}
		lines.push('');
	}

	if (noDataScenarios.length > 0) {
		lines.push(
			`**No data:** ${noDataScenarios.map((s) => `\`${s.testCaseFile}/${s.scenarioName}\``).join(', ')}`,
		);
		lines.push('');
	}

	if (stableScenarios.length > 0) {
		lines.push(`**Stable (${stableScenarios.length}):**`);
		lines.push(
			stableScenarios.map((s) => `\`${s.testCaseFile}/${s.scenarioName}\``).join(', ') + '.',
		);
		lines.push('');
	}

	lines.push('</details>');
	lines.push('');
	return lines;
}

function renderFailureDetails(
	evaluation: MultiRunEvaluation,
	slugByTestCase?: Map<WorkflowTestCase, string>,
): string[] {
	const failed: Array<{
		tc: WorkflowTestCaseResult;
		fileSlug: string | undefined;
		scenarioName: string;
		failedRuns: Array<{ category?: string; reasoning: string }>;
	}> = [];
	for (const tc of evaluation.testCases) {
		const fileSlug = slugByTestCase?.get(tc.testCase);
		for (const sa of tc.scenarios) {
			const failedRuns = sa.runs
				.filter((r) => !r.success)
				.map((r) => ({ category: r.failureCategory, reasoning: r.reasoning }));
			if (failedRuns.length > 0) {
				failed.push({ tc: tc.runs[0], fileSlug, scenarioName: sa.scenario.name, failedRuns });
			}
		}
	}
	if (failed.length === 0) return [];

	const lines: string[] = [];
	lines.push('<details><summary>Failure details</summary>');
	lines.push('');
	for (const { tc, fileSlug, scenarioName, failedRuns } of failed) {
		const slug = fileSlug
			? `${fileSlug}/${scenarioName}`
			: `${tc.testCase.prompt.slice(0, 50).trim()} / ${scenarioName}`;
		lines.push(`**\`${slug}\`** — ${failedRuns.length} failed`);
		for (const fr of failedRuns) {
			const tag = fr.category ? ` [${fr.category}]` : '';
			lines.push(`> Run${tag}: ${fr.reasoning.slice(0, 200)}`);
		}
		lines.push('');
	}
	lines.push('</details>');
	lines.push('');
	return lines;
}

// ---------------------------------------------------------------------------
// Per-scenario failure lookup
// ---------------------------------------------------------------------------
//
// The comparison carries per-scenario counts (passed / total) but not the
// underlying reasoning text. The evaluation has the reasoning, but keys
// testCases by reference identity — not by the `testCaseFile` slug used in
// the comparison. The slug map (built in cli/index.ts where the file slugs
// are first known) bridges the two so the lookup is deterministic. Without
// it we'd have to disambiguate by scenarioName alone, which collides on
// reused names (`happy-path` shows up across most workflows).

interface FailedRunDetail {
	category?: string;
	reasoning: string;
	runIndex: number; // 1-based for display
}

type FailedRunsBySlug = Map<string, FailedRunDetail[]>;

function buildFailedRunsIndex(
	evaluation: MultiRunEvaluation,
	slugByTestCase: Map<WorkflowTestCase, string>,
): FailedRunsBySlug {
	const map: FailedRunsBySlug = new Map();
	for (const tc of evaluation.testCases) {
		const fileSlug = slugByTestCase.get(tc.testCase);
		if (!fileSlug) continue; // testCase not in the slug map — skip rather than misattribute
		for (const sa of tc.scenarios) {
			const failedRuns: FailedRunDetail[] = [];
			sa.runs.forEach((r, i) => {
				if (!r.success) {
					failedRuns.push({
						category: r.failureCategory,
						reasoning: r.reasoning,
						runIndex: i + 1,
					});
				}
			});
			if (failedRuns.length > 0) {
				map.set(`${fileSlug}/${sa.scenario.name}`, failedRuns);
			}
		}
	}
	return map;
}

function summarizeCategories(failedRuns: FailedRunDetail[]): string | undefined {
	const counts = new Map<string, number>();
	for (const fr of failedRuns) {
		if (fr.category) counts.set(fr.category, (counts.get(fr.category) ?? 0) + 1);
	}
	if (counts.size === 0) return undefined;
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([cat, n]) => `${n}× ${cat}`)
		.join(', ');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(rate: number): string {
	return (rate * 100).toFixed(1);
}

function formatRateCell(passes: number, total: number): string {
	const rate = total > 0 ? Math.round((passes / total) * 100) : 0;
	return `${passes}/${total} (${rate}%)`;
}

function formatDeltaCell(delta: number): string {
	const pp = delta * 100;
	const sign = pp >= 0 ? '+' : '';
	const arrow = pp > 0 ? ' ↑' : pp < 0 ? ' ↓' : '';
	return `${sign}${pp.toFixed(0)}pp${arrow}`;
}

function countByVerdict(
	comparison: ComparisonResult,
	verdict: ScenarioComparison['verdict'],
): number {
	return comparison.scenarios.filter((s) => s.verdict === verdict).length;
}

/** Best-effort N=baseline iteration count. The comparison only carries trial
 *  totals per scenario; we infer N from the most-common scenario total since
 *  the baseline runs every scenario the same number of times. */
function inferBaselineN(comparison: ComparisonResult): number | undefined {
	const totals = comparison.scenarios
		.filter((s) => s.baselineTotal > 0)
		.map((s) => s.baselineTotal);
	if (totals.length === 0) return undefined;
	const counts = new Map<number, number>();
	for (const t of totals) counts.set(t, (counts.get(t) ?? 0) + 1);
	let best = totals[0];
	let bestCount = 0;
	for (const [n, c] of counts) {
		if (c > bestCount) {
			best = n;
			bestCount = c;
		}
	}
	return best;
}

// ---------------------------------------------------------------------------
// Terminal renderer: aligned plain text for the eval CLI's end-of-run print.
// ---------------------------------------------------------------------------

const TERMINAL_INDENT = '  ';
const TERMINAL_TABLE_INDENT = '    ';

export function formatComparisonTerminal(
	evaluation: MultiRunEvaluation,
	outcome?: ComparisonOutcome,
	options: FormatOptions = {},
): string {
	const lines: string[] = [];
	const comparison = outcome?.kind === 'ok' ? outcome.result : undefined;

	const titleSuffix = options.commitSha ? ` — ${options.commitSha.slice(0, 8)}` : '';
	const title = `Instance AI Workflow Eval${titleSuffix}`;
	lines.push(title);
	lines.push('═'.repeat(title.length));

	lines.push(TERMINAL_INDENT + formatTerminalVerdictLine(outcome));
	lines.push('');

	lines.push(...formatTerminalAggregate(evaluation, comparison));
	lines.push('');

	lines.push(...formatTerminalPerTestCase(evaluation, options.slugByTestCase));

	if (comparison) {
		const hard = hardRegressions(comparison);
		const soft = softRegressions(comparison);
		const watch = watchList(comparison);
		const imps = improvements(comparison);

		if (hard.length > 0) {
			lines.push(
				TERMINAL_INDENT +
					'REGRESSIONS  (high-confidence: large drop on a reliable scenario, unlikely noise)',
			);
			lines.push(formatTerminalScenarioTable(hard, true));
			lines.push('');
		}
		if (soft.length > 0) {
			lines.push(
				TERMINAL_INDENT +
					'LIKELY REGRESSIONS  (looser statistical flag — investigate if related to your changes)',
			);
			lines.push(formatTerminalScenarioTable(soft, true));
			lines.push('');
		}
		if (watch.length > 0) {
			lines.push(TERMINAL_INDENT + 'WORTH WATCHING  (large change, not flagged as a regression)');
			lines.push(formatTerminalScenarioTable(watch, false));
			lines.push('');
		}
		if (imps.length > 0) {
			lines.push(TERMINAL_INDENT + 'IMPROVEMENTS');
			lines.push(formatTerminalScenarioTable(imps, true));
			lines.push('');
		}

		// Always render the breakdown when comparison data is available — same
		// rationale as the markdown side. The terminal table drops 0/0 rows
		// itself.
		const breakdownRows = comparison.failureCategories.filter(
			(c) => c.prCount > 0 || c.baselineCount > 0,
		);
		if (breakdownRows.length > 0) {
			lines.push(TERMINAL_INDENT + 'failure breakdown');
			lines.push(formatTerminalCategoryTable(breakdownRows));
			lines.push('');
		}

		// Stable count is already in the verdict line; surface only the rarer
		// outcomes here.
		const flaky = countByVerdict(comparison, 'unreliable_baseline');
		const noData = countByVerdict(comparison, 'insufficient_data');
		const otherParts: string[] = [];
		if (flaky > 0) otherParts.push(`${flaky} on flaky baseline`);
		if (noData > 0) otherParts.push(`${noData} no data`);
		if (otherParts.length > 0) {
			lines.push(TERMINAL_INDENT + 'other: ' + otherParts.join(' · '));
		}
	}

	return lines.join('\n');
}

function formatTerminalVerdictLine(outcome?: ComparisonOutcome): string {
	if (!outcome) return '▶ No baseline comparison ran (LangSmith disabled).';
	if (outcome.kind === 'no_baseline') {
		return '▶ No baseline configured — comparison skipped.';
	}
	if (outcome.kind === 'self_baseline') {
		return `▶ This run is the baseline (${outcome.experimentName}) — nothing to compare.`;
	}
	if (outcome.kind === 'fetch_failed') {
		return `▶ Regression detection did not run — baseline fetch failed: ${outcome.error}`;
	}

	const comparison = outcome.result;
	const hard = hardRegressions(comparison).length;
	const soft = softRegressions(comparison).length;
	const watch = watchList(comparison).length;
	const imps = improvements(comparison).length;
	const stable = countByVerdict(comparison, 'stable');

	const aggDelta = comparison.aggregate.delta * 100;
	const aggDeltaText = `${aggDelta >= 0 ? '+' : ''}${aggDelta.toFixed(1)}pp`;
	const passRateText = `pass rate ${aggDeltaText} vs master`;

	const concernsParts = [
		`${hard} regression${hard === 1 ? '' : 's'}`,
		`${soft} likely regression${soft === 1 ? '' : 's'}`,
		`${watch} worth watching`,
	];
	const winsParts = [`${imps} improvement${imps === 1 ? '' : 's'}`, `${stable} stable`];
	if (aggDelta < 0) {
		concernsParts.push(passRateText);
	} else {
		winsParts.push(passRateText);
	}

	// The caller prepends TERMINAL_INDENT to the start of this string. Embed an
	// extra TERMINAL_INDENT after the line break so the wins line aligns under
	// the concerns text (past the `▶ ` arrow).
	return `▶ ${concernsParts.join(' · ')}\n${TERMINAL_INDENT}  ${winsParts.join(' · ')}`;
}

function formatTerminalAggregate(
	evaluation: MultiRunEvaluation,
	comparison?: ComparisonResult,
): string[] {
	const lines: string[] = [];
	if (!comparison) {
		const allScenarios = evaluation.testCases.flatMap((tc) => tc.scenarios);
		const passed = allScenarios.reduce((sum, sa) => sum + sa.passCount, 0);
		const total = allScenarios.reduce((sum, sa) => sum + sa.runs.length, 0);
		const rate = total > 0 ? (passed / total) * 100 : 0;
		lines.push(
			TERMINAL_INDENT +
				`Aggregate: ${rate.toFixed(1)}% pass (${passed}/${total} trials, ${allScenarios.length} scenarios × N=${evaluation.totalRuns})`,
		);
		return lines;
	}

	const { aggregate } = comparison;
	const baselineN = inferBaselineN(comparison);
	const aggDelta = aggregate.delta * 100;
	const sign = aggDelta >= 0 ? '+' : '';
	const arrow = aggDelta > 0 ? ' ↑' : aggDelta < 0 ? ' ↓' : '';
	lines.push(TERMINAL_INDENT + `Aggregate (${aggregate.intersectionSize} scenarios)`);
	lines.push(
		TERMINAL_INDENT +
			`  PR        ${pct(aggregate.prAggregatePassRate)}%   (N=${evaluation.totalRuns})`,
	);
	if (baselineN !== undefined) {
		lines.push(
			TERMINAL_INDENT +
				`  baseline  ${pct(aggregate.baselineAggregatePassRate)}%   (N=${baselineN})`,
		);
	} else {
		lines.push(TERMINAL_INDENT + `  baseline  ${pct(aggregate.baselineAggregatePassRate)}%`);
	}
	lines.push(TERMINAL_INDENT + `  Δ         ${sign}${aggDelta.toFixed(1)}pp${arrow}`);

	if (comparison.baselineOnly.length > 0 || comparison.prOnly.length > 0) {
		const partialParts: string[] = [];
		if (comparison.baselineOnly.length > 0)
			partialParts.push(`${comparison.baselineOnly.length} baseline scenarios not run by PR`);
		if (comparison.prOnly.length > 0)
			partialParts.push(`${comparison.prOnly.length} PR scenarios have no baseline data`);
		lines.push(TERMINAL_INDENT + `  partial: ${partialParts.join(', ')}`);
	}

	return lines;
}

function formatTerminalPerTestCase(
	evaluation: MultiRunEvaluation,
	slugByTestCase?: Map<WorkflowTestCase, string>,
): string[] {
	const { totalRuns, testCases } = evaluation;
	if (testCases.length === 0) return [];
	const lines: string[] = [];
	const heading = `Per-test-case results (${testCases.length})`;
	lines.push(TERMINAL_INDENT + heading);

	const nameOf = (tc: TestCaseAggregation, max: number): string => {
		const slug = slugByTestCase?.get(tc.testCase);
		return slug ?? tc.testCase.prompt.slice(0, max);
	};

	if (totalRuns > 1) {
		const rows = testCases.map((tc) => {
			const meanPassAtK =
				tc.scenarios.length > 0
					? Math.round(
							(tc.scenarios.reduce((sum, sa) => sum + (sa.passAtK[totalRuns - 1] ?? 0), 0) /
								tc.scenarios.length) *
								100,
						)
					: 0;
			const meanPassHatK =
				tc.scenarios.length > 0
					? Math.round(
							(tc.scenarios.reduce((sum, sa) => sum + (sa.passHatK[totalRuns - 1] ?? 0), 0) /
								tc.scenarios.length) *
								100,
						)
					: 0;
			return {
				name: nameOf(tc, 60),
				builds: `${tc.buildSuccessCount}/${totalRuns}`,
				passAtK: `${meanPassAtK}%`,
				passHatK: `${meanPassHatK}%`,
			};
		});
		const nameW = maxWidth(
			rows.map((r) => r.name),
			'workflow',
		);
		const buildsW = maxWidth(
			rows.map((r) => r.builds),
			'builds',
		);
		const atKHeader = `pass@${totalRuns}`;
		const hatKHeader = `pass^${totalRuns}`;
		const atKW = maxWidth(
			rows.map((r) => r.passAtK),
			atKHeader,
		);
		const hatKW = maxWidth(
			rows.map((r) => r.passHatK),
			hatKHeader,
		);
		lines.push(
			TERMINAL_TABLE_INDENT +
				`${'workflow'.padEnd(nameW)}  ${'builds'.padEnd(buildsW)}  ${atKHeader.padStart(atKW)}  ${hatKHeader.padStart(hatKW)}`,
		);
		lines.push(
			TERMINAL_TABLE_INDENT +
				`${'─'.repeat(nameW)}  ${'─'.repeat(buildsW)}  ${'─'.repeat(atKW)}  ${'─'.repeat(hatKW)}`,
		);
		for (const r of rows) {
			lines.push(
				TERMINAL_TABLE_INDENT +
					`${r.name.padEnd(nameW)}  ${r.builds.padEnd(buildsW)}  ${r.passAtK.padStart(atKW)}  ${r.passHatK.padStart(hatKW)}`,
			);
		}
	} else {
		for (const tc of testCases) {
			const r = tc.runs[0];
			const buildStatus = r.workflowBuildSuccess ? 'BUILT' : 'BUILD FAILED';
			lines.push('');
			lines.push(TERMINAL_INDENT + `${nameOf(tc, 70)}…`);
			lines.push(TERMINAL_INDENT + `  ${buildStatus}${r.workflowId ? ` (${r.workflowId})` : ''}`);
			if (r.buildError) lines.push(TERMINAL_INDENT + `  error: ${r.buildError.slice(0, 200)}`);
			for (const sa of tc.scenarios) {
				const sr = sa.runs[0];
				const status = sr.success ? 'PASS' : 'FAIL';
				const category = sr.failureCategory ? ` [${sr.failureCategory}]` : '';
				lines.push(TERMINAL_INDENT + `  ${status}  ${sr.scenario.name}${category}`);
				if (!sr.success) {
					const errs = sr.evalResult?.errors ?? [];
					if (errs.length > 0) {
						lines.push(TERMINAL_INDENT + `        error: ${errs.join('; ').slice(0, 200)}`);
					}
					lines.push(TERMINAL_INDENT + `        diagnosis: ${sr.reasoning.slice(0, 200)}`);
				}
			}
		}
	}
	lines.push('');
	return lines;
}

function formatTerminalScenarioTable(scenarios: ScenarioComparison[], withPValue: boolean): string {
	const names = scenarios.map((s) => `${s.testCaseFile}/${s.scenarioName}`);
	const prCells = scenarios.map((s) => `${s.prPasses}/${s.prTotal}`);
	const baseCells = scenarios.map((s) => `${s.baselinePasses}/${s.baselineTotal}`);
	const deltaCells = scenarios.map((s) => {
		const d = s.delta * 100;
		const sign = d >= 0 ? '+' : '';
		const arrow = d > 0 ? ' ↑' : d < 0 ? ' ↓' : '';
		return `${sign}${d.toFixed(0)}pp${arrow}`;
	});
	const pCells = withPValue
		? scenarios.map((s) => (s.verdict === 'improvement' ? s.pValueRight : s.pValueLeft).toFixed(3))
		: [];

	const nameW = maxWidth(names, 'scenario');
	const prW = maxWidth(prCells, 'PR');
	const baseW = maxWidth(baseCells, 'baseline');
	const deltaW = maxWidth(deltaCells, 'Δ');
	const pW = withPValue ? maxWidth(pCells, 'p') : 0;

	const headers = [
		'scenario'.padEnd(nameW),
		'PR'.padEnd(prW),
		'baseline'.padEnd(baseW),
		'Δ'.padEnd(deltaW),
	];
	if (withPValue) headers.push('p'.padEnd(pW));
	const widths = withPValue ? [nameW, prW, baseW, deltaW, pW] : [nameW, prW, baseW, deltaW];
	const sep = widths.map((w) => '─'.repeat(w)).join('  ');

	const rows = scenarios.map((_, i) => {
		const cells = [
			names[i].padEnd(nameW),
			prCells[i].padEnd(prW),
			baseCells[i].padEnd(baseW),
			deltaCells[i].padEnd(deltaW),
		];
		if (withPValue) cells.push(pCells[i].padEnd(pW));
		return TERMINAL_TABLE_INDENT + cells.join('  ');
	});

	return [TERMINAL_TABLE_INDENT + headers.join('  '), TERMINAL_TABLE_INDENT + sep, ...rows].join(
		'\n',
	);
}

function formatTerminalCategoryTable(cats: FailureCategoryComparison[]): string {
	const names = cats.map((c) => {
		const isNew = c.baselineCount === 0 && c.prCount > 0;
		return c.category + (isNew ? ' 🆕' : '');
	});
	const prCells = cats.map((c) => `${c.prCount} (${pct(c.prRate)}%)`);
	const baseCells = cats.map((c) => `${c.baselineCount} (${pct(c.baselineRate)}%)`);
	const deltaCells = cats.map((c) => {
		const d = c.delta * 100;
		const sign = d >= 0 ? '+' : '';
		return `${sign}${d.toFixed(1)}pp`;
	});

	const nameW = maxWidth(names, 'category');
	const prW = maxWidth(prCells, 'PR');
	const baseW = maxWidth(baseCells, 'baseline');

	const headers = ['category'.padEnd(nameW), 'PR'.padEnd(prW), 'baseline'.padEnd(baseW), 'Δ'];
	const sep = [nameW, prW, baseW, maxWidth(deltaCells, 'Δ')].map((w) => '─'.repeat(w)).join('  ');

	const rows = cats.map(
		(_, i) =>
			TERMINAL_TABLE_INDENT +
			[
				names[i].padEnd(nameW),
				prCells[i].padEnd(prW),
				baseCells[i].padEnd(baseW),
				deltaCells[i],
			].join('  '),
	);

	return [TERMINAL_TABLE_INDENT + headers.join('  '), TERMINAL_TABLE_INDENT + sep, ...rows].join(
		'\n',
	);
}

function maxWidth(values: string[], header: string): number {
	return values.reduce((m, v) => Math.max(m, v.length), header.length);
}
