import { z } from 'zod';

import type { ContextReport } from './context-report';

/** testmax auto-check groups that decide if a build is correct. Other groups are advisory. */
const GATING_GROUP_PREFIXES = ['Correctness', 'Execution with pinned data', 'Service calls'];

const autoChecksSchema = z.object({
	groups: z.array(
		z.object({
			title: z.string().catch(''),
			checks: z
				.array(z.object({ ok: z.boolean().nullable().optional(), level: z.string().optional() }))
				.catch([]),
		}),
	),
});

export type ReportFigures = Pick<
	ContextReport,
	| 'llmCalls'
	| 'inputTokens'
	| 'firstCallInput'
	| 'maxCallInput'
	| 'outputTokens'
	| 'firstCallToolCount'
>;

export interface RunSummary {
	calls: number;
	input: number;
	first: number;
	max: number;
	output: number;
	tools: number;
	checksPassed: number;
	checksTotal: number;
}

export interface CaseArmRuns {
	caseName: string;
	arm: string;
	runs: RunSummary[];
}

function gatingChecks(autoChecks: unknown): { passed: number; total: number } {
	const parsed = autoChecksSchema.safeParse(autoChecks);
	if (!parsed.success) return { passed: 0, total: 0 };
	const results = parsed.data.groups
		.filter((group) => GATING_GROUP_PREFIXES.some((prefix) => group.title.startsWith(prefix)))
		// testmax leaves informational checks out of the verdict.
		.flatMap((group) => group.checks.filter((check) => check.level !== 'info'))
		.map((check) => check.ok)
		.filter((ok) => typeof ok === 'boolean');
	return { passed: results.filter(Boolean).length, total: results.length };
}

/** Combine one run's context report with its testmax `auto-checks.json` (if any). */
export function summarizeRun(report: ReportFigures, autoChecks: unknown): RunSummary {
	const { passed, total } = gatingChecks(autoChecks);
	return {
		calls: report.llmCalls,
		input: report.inputTokens,
		first: report.firstCallInput,
		max: report.maxCallInput,
		output: report.outputTokens,
		tools: report.firstCallToolCount,
		checksPassed: passed,
		checksTotal: total,
	};
}

function meanOf(runs: RunSummary[], key: keyof RunSummary): string {
	const mean = runs.reduce((total, run) => total + run[key], 0) / runs.length;
	return Math.round(mean).toLocaleString('en-US');
}

function renderRow({ caseName, arm, runs }: CaseArmRuns): string {
	const cells = [
		caseName,
		arm,
		String(runs.length),
		...(['calls', 'input', 'first', 'max', 'output', 'tools'] as const).map((key) =>
			meanOf(runs, key),
		),
		runs.map((run) => `${run.checksPassed}/${run.checksTotal}`).join(', '),
	];
	return `| ${cells.join(' | ')} |`;
}

/** Markdown table with one row for each case and arm. Token columns are means over the runs. */
export function renderComparisonTable(rows: CaseArmRuns[]): string {
	const header =
		'| Case | Arm | Runs | LLM calls | Input tokens | First call | Peak call | Output | Tools | Gating checks |';
	const divider = '|---|---|---:|---:|---:|---:|---:|---:|---:|---|';
	const body = rows.filter((row) => row.runs.length > 0).map(renderRow);
	return [header, divider, ...body].join('\n');
}
