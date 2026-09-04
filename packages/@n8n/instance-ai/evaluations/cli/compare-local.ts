#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Compare two LOCAL eval runs — the measurement step of eval-driven
// development on Instance AI.
//
//   pnpm eval:compare-local --before .output/edd/before --after .output/edd/after
//
// Both sides are `eval-results.json` artifacts written by any run (the direct
// driver writes one with no LangSmith involvement at all). Units are keyed and
// graded by the same `comparison/` code the CI PR comment uses, so a local
// verdict and a CI verdict cannot drift into disagreeing about what a unit is.
//
// Deliberately NOT reusing `formatComparisonTerminal`: that renderer takes a
// MultiRunEvaluation, which a persisted artifact cannot faithfully rebuild, and
// it renders a whole eval report. What the EDD loop wants is narrower — which
// units moved, in which direction, and did anything move that you weren't
// aiming at.
//
// Read the output as direction and blast radius, not as a verdict. The verdict
// column is the CI-grade tier, and at the iteration counts a local loop can
// afford most real movement grades 'stable' (3/3 -> 2/3 is not significant) —
// the run prints a power note saying so whenever N is small.
// ---------------------------------------------------------------------------

import { statSync } from 'node:fs';
import { join } from 'node:path';

import {
	bucketFromResultsJson,
	readEvalResults,
	EvalResultsParseError,
} from '../comparison/bucket-from-results-json';
import { compareBuckets, unitKeyOf } from '../comparison/compare';
import type { ComparisonResult, EvaluationUnitComparison, UnitRef } from '../comparison/compare';

const USAGE = `
Compare two local eval runs (no LangSmith required).

  pnpm eval:compare-local --before <path> --after <path> [options]

  --before <path>          Baseline side: a run's --output-dir, or its eval-results.json
  --after  <path>          Changed side: same
  --json                   Emit the raw comparison as JSON instead of the report
  --fail-on-regression     Exit 1 when any unit's pass rate dropped
  --help                   This message

Typical use, from packages/@n8n/instance-ai/ with LANGSMITH_API_KEY unset:

  pnpm eval:instance-ai --filter my-case --iterations 3 --output-dir .output/edd/before
  # ...make the change, rebuild, restart the instance...
  pnpm eval:instance-ai --filter my-case --iterations 3 --output-dir .output/edd/after
  pnpm eval:compare-local --before .output/edd/before --after .output/edd/after
`;

interface CliArgs {
	before: string;
	after: string;
	json: boolean;
	failOnRegression: boolean;
}

function nextArg(argv: string[], index: number, flag: string): string {
	const value = argv[index + 1];
	if (value === undefined || value.startsWith('--')) {
		throw new Error(`${flag} needs a value`);
	}
	return value;
}

function parseArgs(argv: string[]): CliArgs {
	let before: string | undefined;
	let after: string | undefined;
	let json = false;
	let failOnRegression = false;

	for (let i = 0; i < argv.length; i++) {
		switch (argv[i]) {
			case '--before':
				before = nextArg(argv, i, '--before');
				i++;
				break;
			case '--after':
				after = nextArg(argv, i, '--after');
				i++;
				break;
			case '--json':
				json = true;
				break;
			case '--fail-on-regression':
				failOnRegression = true;
				break;
			case '--help':
			case '-h':
				console.log(USAGE);
				process.exit(0);
				break;
			default:
				throw new Error(`Unknown argument: ${String(argv[i])}`);
		}
	}

	if (!before || !after) throw new Error('Both --before and --after are required.');
	return { before, after, json, failOnRegression };
}

/** Accept either a run's output directory or the results file inside it. */
function resolveResultsPath(input: string): string {
	try {
		if (statSync(input).isDirectory()) return join(input, 'eval-results.json');
	} catch {
		// Fall through — readEvalResults reports the missing path with guidance.
	}
	return input;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const INDENT = '  ';
// Wide enough to leave a gap after the longest kind name ('expectation').
const KIND_WIDTH = 13;
const KEY_WIDTH = 58;

function pct(rate: number): string {
	return `${(rate * 100).toFixed(1)}%`;
}

function pp(delta: number): string {
	const points = delta * 100;
	return `${points >= 0 ? '+' : ''}${points.toFixed(1)}pp`;
}

function truncate(text: string, width: number): string {
	return text.length <= width ? text.padEnd(width) : `${text.slice(0, width - 1)}…`;
}

function unitLine(unit: EvaluationUnitComparison): string {
	const counts = `${String(unit.baselinePasses)}/${String(unit.baselineTotal)} → ${String(unit.prPasses)}/${String(unit.prTotal)}`;
	return `${INDENT.repeat(2)}${unit.kind.padEnd(KIND_WIDTH)}${truncate(unitKeyOf(unit), KEY_WIDTH)}  ${counts.padEnd(13)}  ${pp(unit.delta).padStart(8)}  ${unit.verdict}`;
}

function refLine(ref: UnitRef): string {
	return `${INDENT.repeat(2)}${ref.kind.padEnd(KIND_WIDTH)}${unitKeyOf(ref)}`;
}

/**
 * Largest per-unit trial count on either side. Drives the statistical-power
 * note: at the iteration counts a local loop can afford, the strict tier is
 * mathematically unreachable and reporting a "no regressions" result without
 * saying so would be misleading.
 */
function maxTrialsPerUnit(result: ComparisonResult): number {
	let max = 0;
	for (const unit of result.evaluationUnits) {
		max = Math.max(max, unit.prTotal, unit.baselineTotal);
	}
	return max;
}

function render(result: ComparisonResult, beforePath: string, afterPath: string): string[] {
	const lines: string[] = [];
	const title = 'Instance AI — local before/after';
	lines.push(title);
	lines.push('═'.repeat(title.length));

	lines.push(`${INDENT}before  ${beforePath}`);
	lines.push(`${INDENT}after   ${afterPath}`);
	lines.push('');

	const { aggregate } = result;
	lines.push(
		`${INDENT}Aggregate  ${pct(aggregate.baselineAggregatePassRate)} → ${pct(aggregate.prAggregatePassRate)}  (${pp(aggregate.delta)} over ${String(aggregate.intersectionSize)} shared unit(s))`,
	);
	lines.push('');

	const regressed = result.evaluationUnits
		.filter((unit) => unit.delta < 0)
		.sort((a, b) => a.delta - b.delta);
	const improved = result.evaluationUnits
		.filter((unit) => unit.delta > 0)
		.sort((a, b) => b.delta - a.delta);
	const unchanged = result.evaluationUnits.length - regressed.length - improved.length;

	if (regressed.length > 0) {
		lines.push(`${INDENT}WORSE AFTER  (blast radius — account for every line before you push)`);
		lines.push(...regressed.map(unitLine));
		lines.push('');
	}
	if (improved.length > 0) {
		lines.push(`${INDENT}BETTER AFTER`);
		lines.push(...improved.map(unitLine));
		lines.push('');
	}
	if (unchanged > 0) {
		lines.push(`${INDENT}UNCHANGED  ${String(unchanged)} unit(s)`);
		lines.push('');
	}

	// A changed case set is the single most common way a local comparison
	// misleads: the units you care about silently drop out of the intersection.
	if (result.prOnly.length > 0) {
		lines.push(`${INDENT}ONLY IN AFTER  (no before-side counterpart — not compared)`);
		lines.push(...result.prOnly.map(refLine));
		lines.push('');
	}
	if (result.baselineOnly.length > 0) {
		lines.push(`${INDENT}ONLY IN BEFORE  (disappeared from the after run — not compared)`);
		lines.push(...result.baselineOnly.map(refLine));
		lines.push('');
	}

	const notable = result.failureCategories.filter((category) => category.notable);
	if (notable.length > 0) {
		lines.push(`${INDENT}FAILURE-CATEGORY DRIFT`);
		for (const category of notable) {
			lines.push(
				`${INDENT.repeat(2)}${category.category.padEnd(22)}${pct(category.baselineRate)} → ${pct(category.prRate)}  (${pp(category.delta)})`,
			);
		}
		lines.push('');
	}

	if (result.evaluationUnits.length === 0) {
		lines.push(
			`${INDENT}No shared units. The two runs covered different cases — check the --filter/--tier on both.`,
		);
		lines.push('');
		return lines;
	}

	const maxTrials = maxTrialsPerUnit(result);
	if (maxTrials < 6) {
		lines.push(
			`${INDENT}N is small (at most ${String(maxTrials)} trial(s) per unit). At this N only a near-total`,
		);
		lines.push(
			`${INDENT}flip clears the high-confidence 'regression' tier — a unit that loses a single`,
		);
		lines.push(
			`${INDENT}trial still grades 'stable'. Read the counts, not the verdict column, and raise`,
		);
		lines.push(`${INDENT}--iterations before calling any one line a regression.`);
		lines.push('');
	}

	return lines;
}

// ---------------------------------------------------------------------------

function main(): void {
	let args: CliArgs;
	try {
		args = parseArgs(process.argv.slice(2));
	} catch (error: unknown) {
		console.error(error instanceof Error ? error.message : String(error));
		console.error(USAGE);
		process.exit(1);
	}

	const beforePath = resolveResultsPath(args.before);
	const afterPath = resolveResultsPath(args.after);

	let result: ComparisonResult;
	try {
		// pr = after, baseline = before: a negative delta means the change made it worse.
		result = compareBuckets(
			bucketFromResultsJson(readEvalResults(afterPath), 'after'),
			bucketFromResultsJson(readEvalResults(beforePath), 'before'),
		);
	} catch (error: unknown) {
		if (error instanceof EvalResultsParseError) {
			console.error(error.message);
			process.exit(1);
		}
		throw error;
	}

	if (args.json) {
		console.log(JSON.stringify({ before: beforePath, after: afterPath, result }, null, 2));
	} else {
		console.log(`\n${render(result, beforePath, afterPath).join('\n')}`);
	}

	if (args.failOnRegression && result.evaluationUnits.some((unit) => unit.delta < 0)) {
		process.exit(1);
	}
}

main();
