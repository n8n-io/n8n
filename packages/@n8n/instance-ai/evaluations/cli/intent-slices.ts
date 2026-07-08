// ---------------------------------------------------------------------------
// Offline slice-summary for the intent-resolution evals. Reads a finished
// run's eval-results.json and reports per-tag / per-difficulty accuracy for
// deterministic intent-classification verdicts against the spec's monitoring
// bars. Read-only analysis — does not touch the eval pipeline, aggregation,
// or report generation.
//
//   pnpm eval:intent-slices [path/to/eval-results.json]
// ---------------------------------------------------------------------------

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { loadExamAgentEvalTestCasesWithFiles } from '../data/agents-exam';

export interface IntentUnit {
	fileSlug: string;
	pass: boolean;
}

export interface SliceRow {
	slice: string;
	units: number;
	passed: number;
	accuracy: number;
	bar?: number;
	underBar?: boolean;
}

interface RawBuildExpectationResult {
	expectation: string;
	pass: boolean;
	incomplete?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBuildExpectationResult(value: unknown): value is RawBuildExpectationResult {
	return (
		isRecord(value) && typeof value.expectation === 'string' && typeof value.pass === 'boolean'
	);
}

/** Parses `eval-results.json`'s `testCases` entries, joining `testCaseFile` back to
 *  the corpus (`knownSlugs`) to isolate agent-tier cases and emit one unit per
 *  scored `intent*` verdict — each compound part and each iteration counts separately,
 *  mirroring how the headline pass rate counts verdicts. */
export function extractIntentUnits(report: unknown, knownSlugs: ReadonlySet<string>): IntentUnit[] {
	if (!isRecord(report)) {
		throw new Error('Malformed eval-results.json: expected a JSON object at the top level');
	}
	if (!Array.isArray(report.testCases)) {
		throw new Error('Malformed eval-results.json: expected a "testCases" array');
	}

	const units: IntentUnit[] = [];
	for (const entry of report.testCases) {
		if (!isRecord(entry)) continue;
		const testCaseFile = typeof entry.testCaseFile === 'string' ? entry.testCaseFile : undefined;
		if (testCaseFile === undefined || !knownSlugs.has(testCaseFile)) continue;

		const runs = entry.buildExpectationResultsPerRun;
		if (!Array.isArray(runs)) continue;

		for (const iterationResults of runs) {
			if (!Array.isArray(iterationResults)) continue; // null (build-failed) iteration
			for (const result of iterationResults) {
				if (!isBuildExpectationResult(result)) continue;
				if (!result.expectation.startsWith('intent')) continue;
				if (result.incomplete === true) continue;
				units.push({ fileSlug: testCaseFile, pass: result.pass });
			}
		}
	}
	return units;
}

interface CaseMeta {
	tags: string[];
	complexity: string;
}

const COMPLEXITY_TO_DIFFICULTY: Record<string, string> = {
	simple: 'easy',
	medium: 'med',
	complex: 'hard',
};

/** Monitoring bars per the spec: overall joint accuracy, the false-friend tag
 *  (adversarial "agent"-worded requests that are actually workflows), and the
 *  easy-difficulty floor. Everything else is reported but unmonitored. */
const OVERALL_BAR = 0.75;
const DIFFICULTY_BARS: Record<string, number> = { easy: 0.9 };
const TAG_BARS: Record<string, number> = { 'false-friend': 0.8 };

function buildRow(
	slice: string,
	units: IntentUnit[],
	matches: (unit: IntentUnit) => boolean,
	bar?: number,
): SliceRow | undefined {
	const matched = units.filter(matches);
	if (matched.length === 0) return undefined;
	const passed = matched.filter((u) => u.pass).length;
	const accuracy = passed / matched.length;
	const row: SliceRow = { slice, units: matched.length, passed, accuracy };
	if (bar !== undefined) {
		row.bar = bar;
		row.underBar = accuracy < bar;
	}
	return row;
}

export function computeSlices(
	units: IntentUnit[],
	meta: ReadonlyMap<string, CaseMeta>,
): SliceRow[] {
	const rows: SliceRow[] = [];

	const overall = buildRow('overall', units, () => true, OVERALL_BAR);
	if (overall) rows.push(overall);

	for (const difficulty of ['easy', 'med', 'hard']) {
		const row = buildRow(
			`difficulty:${difficulty}`,
			units,
			(u) => COMPLEXITY_TO_DIFFICULTY[meta.get(u.fileSlug)?.complexity ?? ''] === difficulty,
			DIFFICULTY_BARS[difficulty],
		);
		if (row) rows.push(row);
	}

	const tags = new Set<string>();
	for (const unit of units) {
		for (const tag of meta.get(unit.fileSlug)?.tags ?? []) {
			if (tag !== 'intent-resolution') tags.add(tag);
		}
	}
	for (const tag of [...tags].sort()) {
		const row = buildRow(
			`tag:${tag}`,
			units,
			(u) => meta.get(u.fileSlug)?.tags.includes(tag) ?? false,
			TAG_BARS[tag],
		);
		if (row) rows.push(row);
	}

	return rows;
}

function formatPct(fraction: number): string {
	return `${String(Math.round(fraction * 100))}%`;
}

function printTable(rows: SliceRow[]): void {
	const headers = ['slice', 'units', 'passed', 'accuracy', 'bar', 'status'];
	const data = rows.map((r) => [
		r.slice,
		String(r.units),
		String(r.passed),
		formatPct(r.accuracy),
		r.bar !== undefined ? formatPct(r.bar) : '-',
		r.bar === undefined ? '-' : r.underBar ? 'UNDER' : 'OK',
	]);
	const widths = headers.map((h, i) => Math.max(h.length, ...data.map((row) => row[i].length)));
	const formatRow = (cols: string[]) => cols.map((c, i) => c.padEnd(widths[i])).join('  ');
	console.log(formatRow(headers));
	for (const row of data) console.log(formatRow(row));
}

function main(): void {
	const reportPath = resolve(process.argv[2] ?? './eval-results.json');
	if (!existsSync(reportPath)) {
		console.error(`eval-results.json not found at ${reportPath} — run pnpm eval:agents first.`);
		process.exit(1);
	}

	const cases = loadExamAgentEvalTestCasesWithFiles();
	const knownSlugs = new Set(cases.map((c) => c.fileSlug));
	const meta = new Map<string, CaseMeta>(
		cases.map((c) => [c.fileSlug, { tags: c.testCase.tags, complexity: c.testCase.complexity }]),
	);

	let units: IntentUnit[];
	try {
		const report: unknown = JSON.parse(readFileSync(reportPath, 'utf-8'));
		units = extractIntentUnits(report, knownSlugs);
	} catch (error) {
		console.error(
			`Failed to read ${reportPath}: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}

	if (units.length === 0) {
		console.log(
			`no intent-classification units found in ${reportPath} (was this an agents-tier run?)`,
		);
		return;
	}

	const rows = computeSlices(units, meta);
	printTable(rows);

	// Bars are a regression tracker, not a gate — always exit 0, never fail the run.
	for (const row of rows) {
		if (row.underBar) {
			console.log(
				`UNDER BAR: ${row.slice} at ${formatPct(row.accuracy)} (bar ${formatPct(row.bar ?? 0)})`,
			);
		}
	}
}

if (require.main === module) {
	main();
}
