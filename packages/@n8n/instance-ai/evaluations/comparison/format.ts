// ---------------------------------------------------------------------------
// Render a ComparisonResult as a markdown block for the PR comment.
//
// Three tiers, surfaced as separate sections (skipped when empty):
//   - Regressions          — high-confidence flags
//   - Soft regressions     — looser bar; investigate, not gating
//   - Notable movement     — large delta, no statistical flag (visibility)
//
// Plus an Improvements section and a run-level Failure-category drift table
// when category data is available on both sides.
// ---------------------------------------------------------------------------

import {
	byVerdict,
	hardRegressions,
	improvements,
	softRegressions,
	watchList,
	type ComparisonResult,
	type FailureCategoryComparison,
	type ScenarioComparison,
} from './compare';

/** Aggregate pass-rate change large enough to bold in the header. */
const AGGREGATE_NOTABLE_DELTA = 0.05;

export function formatComparisonMarkdown(result: ComparisonResult): string {
	const counts = byVerdict(result);
	const hard = hardRegressions(result);
	const soft = softRegressions(result);
	const watch = watchList(result);
	const imps = improvements(result);

	const lines: string[] = [];
	lines.push(`### vs Baseline \`${result.baseline.experimentName}\``);
	lines.push('');
	lines.push(formatAggregateLine(result));
	lines.push('');

	const partial = formatPartialBanner(result);
	if (partial !== undefined) {
		lines.push(partial);
		lines.push('');
	}

	lines.push(formatTallyLine(counts));
	lines.push('');

	if (hard.length > 0) {
		lines.push('#### Regressions');
		lines.push('');
		lines.push(
			'High-confidence: large pass-rate drop on a reliable scenario, unlikely to be noise.',
		);
		lines.push('');
		lines.push(formatScenarioTable(hard, { withPValue: true }));
		lines.push('');
	}

	if (soft.length > 0) {
		lines.push('#### Soft regressions');
		lines.push('');
		lines.push(
			'Crossed the looser bar. Frequently natural variance — worth a glance only if your changes touch related code paths.',
		);
		lines.push('');
		lines.push(formatScenarioTable(soft, { withPValue: true }));
		lines.push('');
	}

	if (watch.length > 0) {
		lines.push('#### Notable movement');
		lines.push('');
		lines.push('Moved noticeably without crossing either regression bar. Visibility only.');
		lines.push('');
		lines.push(formatScenarioTable(watch, { withPValue: false }));
		lines.push('');
	}

	if (imps.length > 0) {
		lines.push('#### Improvements');
		lines.push('');
		lines.push(formatScenarioTable(imps, { withPValue: true }));
		lines.push('');
	}

	const categoryBlock = formatFailureCategorySection(result.failureCategories);
	if (categoryBlock) {
		lines.push(categoryBlock);
		lines.push('');
	}

	if (
		hard.length === 0 &&
		soft.length === 0 &&
		watch.length === 0 &&
		imps.length === 0 &&
		!categoryBlock
	) {
		lines.push('_No scenarios moved beyond the noise floor._');
	}

	return lines.join('\n');
}

function formatAggregateLine(result: ComparisonResult): string {
	const { aggregate } = result;
	const delta = aggregate.delta * 100;
	const sign = delta >= 0 ? '+' : '';
	const emphasis = Math.abs(aggregate.delta) >= AGGREGATE_NOTABLE_DELTA;
	const deltaPart = `**${sign}${delta.toFixed(1)}pp**${emphasis ? ' (worth a look)' : ''}`;
	return (
		`Aggregate (n=${String(aggregate.intersectionSize)}): ` +
		`PR ${pct(aggregate.prAggregatePassRate)}% vs baseline ${pct(aggregate.baselineAggregatePassRate)}% — ` +
		deltaPart
	);
}

function formatTallyLine(counts: Record<string, number>): string {
	// Spell out each tier explicitly. The reader shouldn't have to guess what
	// "soft" or "watch" means — each label says what it is.
	const parts: string[] = [];
	if (counts.hard_regression) {
		parts.push(`**${String(counts.hard_regression)} regression** (high-confidence)`);
	}
	if (counts.soft_regression) {
		parts.push(`${String(counts.soft_regression)} soft regression`);
	}
	if (counts.watch) {
		parts.push(`${String(counts.watch)} notable movement (no claim)`);
	}
	if (counts.improvement) {
		parts.push(`${String(counts.improvement)} improvement`);
	}
	if (counts.unreliable_baseline) {
		parts.push(`${String(counts.unreliable_baseline)} on flaky baseline`);
	}
	parts.push(`${String(counts.stable)} stable`);
	if (counts.insufficient_data) parts.push(`${String(counts.insufficient_data)} no data`);
	return parts.join(' · ');
}

function formatPartialBanner(result: ComparisonResult): string | undefined {
	const skipped = result.baselineOnly.length;
	const onlyInPr = result.prOnly.length;
	if (skipped === 0 && onlyInPr === 0) return undefined;
	const parts: string[] = [];
	if (skipped > 0) parts.push(`${String(skipped)} in baseline not run by PR`);
	if (onlyInPr > 0) parts.push(`${String(onlyInPr)} new in PR`);
	return `> Partial comparison: ${parts.join(', ')}.`;
}

function formatScenarioTable(
	scenarios: ScenarioComparison[],
	opts: { withPValue: boolean },
): string {
	const header = opts.withPValue
		? '| Scenario | PR | Baseline | Δ | noise probability |\n|---|---|---|---|---|'
		: '| Scenario | PR | Baseline | Δ |\n|---|---|---|---|';
	const rows = scenarios.map((s) => {
		const prRate = `${String(s.prPasses)}/${String(s.prTotal)}`;
		const baseRate = `${String(s.baselinePasses)}/${String(s.baselineTotal)}`;
		const delta = s.delta * 100;
		const sign = delta >= 0 ? '+' : '';
		const cells: string[] = [
			`${s.testCaseFile} / ${s.scenarioName}`,
			prRate,
			baseRate,
			`${sign}${delta.toFixed(0)}pp`,
		];
		if (opts.withPValue) {
			const p = s.verdict === 'improvement' ? s.pValueRight : s.pValueLeft;
			cells.push(p.toFixed(3));
		}
		return `| ${cells.join(' | ')} |`;
	});
	return [header, ...rows].join('\n');
}

function formatFailureCategorySection(categories: FailureCategoryComparison[]): string | undefined {
	if (categories.length === 0) return undefined;
	// Always show the table, but only include categories with non-zero count on either side.
	const rows = categories.filter((c) => c.prCount > 0 || c.baselineCount > 0);
	if (rows.length === 0) return undefined;

	const header = '| Category | PR | Baseline | Δ |\n|---|---|---|---|';
	const formatted = rows.map((c) => {
		const prRate = pct(c.prRate);
		const baseRate = pct(c.baselineRate);
		const delta = c.delta * 100;
		const sign = delta >= 0 ? '+' : '';
		const note = c.notable ? ' **(notable)**' : '';
		return `| ${c.category} | ${c.prCount} (${prRate}%) | ${c.baselineCount} (${baseRate}%) | ${sign}${delta.toFixed(1)}pp${note} |`;
	});

	return ['#### Failure-category drift', '', header, ...formatted].join('\n');
}

function pct(rate: number): string {
	return (rate * 100).toFixed(1);
}

// ---------------------------------------------------------------------------
// Terminal renderer: aligned plain text for the eval CLI's end-of-run print.
// Same data as the markdown renderer, no markdown syntax.
// ---------------------------------------------------------------------------

const TERMINAL_INDENT = '  ';
const TERMINAL_TABLE_INDENT = '    ';

export function formatComparisonTerminal(result: ComparisonResult): string {
	const counts = byVerdict(result);
	const hard = hardRegressions(result);
	const soft = softRegressions(result);
	const watch = watchList(result);
	const imps = improvements(result);
	const cats = result.failureCategories.filter((c) => c.prCount > 0 || c.baselineCount > 0);

	const lines: string[] = [];
	const title = `vs baseline ${result.baseline.experimentName}`;
	lines.push(title);
	lines.push('─'.repeat(title.length));

	lines.push(TERMINAL_INDENT + formatTerminalAggregateLine(result));

	const partial = formatTerminalPartialLine(result);
	if (partial !== undefined) lines.push(TERMINAL_INDENT + partial);

	lines.push(TERMINAL_INDENT + 'verdicts: ' + formatTerminalTally(counts));

	if (hard.length > 0) {
		lines.push('');
		lines.push(
			TERMINAL_INDENT +
				'REGRESSIONS  (high-confidence: large drop on a reliable scenario, unlikely noise)',
		);
		lines.push(formatTerminalScenarioTable(hard, true));
	}

	if (soft.length > 0) {
		lines.push('');
		lines.push(
			TERMINAL_INDENT + 'SOFT REGRESSIONS  (crossed the looser bar — investigate, not gating)',
		);
		lines.push(formatTerminalScenarioTable(soft, true));
	}

	if (watch.length > 0) {
		lines.push('');
		lines.push(
			TERMINAL_INDENT + 'NOTABLE MOVEMENT  (moved noticeably without crossing either bar)',
		);
		lines.push(formatTerminalScenarioTable(watch, false));
	}

	if (imps.length > 0) {
		lines.push('');
		lines.push(TERMINAL_INDENT + 'IMPROVEMENTS');
		lines.push(formatTerminalScenarioTable(imps, true));
	}

	if (cats.length > 0) {
		lines.push('');
		lines.push(TERMINAL_INDENT + 'failure-category drift');
		lines.push(formatTerminalCategoryTable(cats));
	}

	if (
		hard.length === 0 &&
		soft.length === 0 &&
		watch.length === 0 &&
		imps.length === 0 &&
		cats.length === 0
	) {
		lines.push('');
		lines.push(TERMINAL_INDENT + 'No scenarios moved beyond the noise floor.');
	}

	return lines.join('\n');
}

function formatTerminalAggregateLine(result: ComparisonResult): string {
	const { aggregate } = result;
	const totalScenarios =
		aggregate.intersectionSize + result.prOnly.length + result.baselineOnly.length;
	const delta = aggregate.delta * 100;
	const sign = delta >= 0 ? '+' : '';
	const emphasis = Math.abs(aggregate.delta) >= AGGREGATE_NOTABLE_DELTA ? '  (worth a look)' : '';
	return (
		`aggregate (${aggregate.intersectionSize} of ${totalScenarios} scenarios):  ` +
		`${pct(aggregate.prAggregatePassRate)}% PR vs ${pct(aggregate.baselineAggregatePassRate)}% baseline   ` +
		`${sign}${delta.toFixed(1)}pp${emphasis}`
	);
}

function formatTerminalPartialLine(result: ComparisonResult): string | undefined {
	if (result.baselineOnly.length === 0 && result.prOnly.length === 0) return undefined;
	const parts: string[] = [];
	if (result.baselineOnly.length > 0) {
		parts.push(`${result.baselineOnly.length} baseline scenarios not run by PR`);
	}
	if (result.prOnly.length > 0) parts.push(`${result.prOnly.length} new in PR`);
	return `partial: ${parts.join(', ')}`;
}

function formatTerminalTally(counts: Record<string, number>): string {
	const parts: string[] = [];
	if (counts.hard_regression) parts.push(`${counts.hard_regression} regression`);
	if (counts.soft_regression) parts.push(`${counts.soft_regression} soft regression`);
	if (counts.watch) parts.push(`${counts.watch} notable movement`);
	if (counts.improvement) parts.push(`${counts.improvement} improvement`);
	if (counts.unreliable_baseline) parts.push(`${counts.unreliable_baseline} on flaky baseline`);
	parts.push(`${counts.stable} stable`);
	if (counts.insufficient_data) parts.push(`${counts.insufficient_data} no data`);
	return parts.join(', ');
}

function formatTerminalScenarioTable(scenarios: ScenarioComparison[], withPValue: boolean): string {
	const names = scenarios.map((s) => `${s.testCaseFile}/${s.scenarioName}`);
	const prCells = scenarios.map((s) => `${s.prPasses}/${s.prTotal}`);
	const baseCells = scenarios.map((s) => `${s.baselinePasses}/${s.baselineTotal}`);
	const deltaCells = scenarios.map((s) => {
		const d = s.delta * 100;
		return `${d >= 0 ? '+' : ''}${d.toFixed(0)}pp`;
	});
	const pCells = withPValue
		? scenarios.map((s) => (s.verdict === 'improvement' ? s.pValueRight : s.pValueLeft).toFixed(3))
		: [];

	const nameW = maxWidth(names, 'scenario');
	const prW = maxWidth(prCells, 'PR');
	const baseW = maxWidth(baseCells, 'baseline');
	const deltaW = maxWidth(deltaCells, 'Δ');
	const pW = withPValue ? maxWidth(pCells, 'noise prob') : 0;

	const headers = [
		'scenario'.padEnd(nameW),
		'PR'.padEnd(prW),
		'baseline'.padEnd(baseW),
		'Δ'.padEnd(deltaW),
	];
	if (withPValue) headers.push('noise prob'.padEnd(pW));

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
	const names = cats.map((c) => c.category);
	const prCells = cats.map((c) => `${c.prCount} (${pct(c.prRate)}%)`);
	const baseCells = cats.map((c) => `${c.baselineCount} (${pct(c.baselineRate)}%)`);
	const deltaCells = cats.map((c) => {
		const d = c.delta * 100;
		const sign = d >= 0 ? '+' : '';
		return `${sign}${d.toFixed(1)}pp${c.notable ? '  notable' : ''}`;
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
