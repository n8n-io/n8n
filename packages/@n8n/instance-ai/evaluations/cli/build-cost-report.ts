// ---------------------------------------------------------------------------
// Build-cost comparison report: MCP (`claude` via --build-via-mcp) vs AIA
// (internal builder) arms of the same suite.
//
// Joins, per case:
//   - MCP arm: per-iteration `claude` spend persisted in eval-results.json
//     (`buildCostUsdPerRun` / `buildTurnsPerRun`).
//   - AIA arm: per-iteration backend builder cost summed from LangSmith —
//     each case's threadIds resolve to root runs (one per build turn) in the
//     backend trace project (default `instance-ai-evals`, eval workspace),
//     whose `total_cost` LangSmith prices cache-aware from the traced usage.
//   - Both arms: per-iteration green verdicts (every evaluated scenario run
//     and build expectation passed) → cost per green iteration.
//
// Usage:
//   dotenvx run -f ../../../.env.local -- pnpm eval:build-cost-report \
//     --aia-results <aia-run>/eval-results.json \
//     --mcp-results <mcp-run>/eval-results.json \
//     [--trace-project instance-ai-evals] [--out build-cost-report.md]
//
// Either arm may be omitted to report on one arm alone. `--probe-thread <id>`
// skips the report and prints one thread's cost — a connectivity spot-check.
// Reads LANGSMITH_ENDPOINT / LANGSMITH_API_KEY and pins reads to the eval
// workspace (Staging) exactly like the harness does.
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

import { configFor, resolveEvalWorkspaceId } from '../harness/langsmith-seed';

// ---------------------------------------------------------------------------
// eval-results.json (only the fields this report needs; unknown keys ignored)
// ---------------------------------------------------------------------------

const unitVerdictSchema = z.object({
	pass: z.boolean(),
	incomplete: z.boolean().optional(),
});

const scenarioRunSchema = z.object({
	passed: z.boolean(),
	incomplete: z.boolean().optional(),
});

const testCaseSchema = z.object({
	name: z.string(),
	testCaseFile: z.string().nullish(),
	status: z.string(),
	totalRuns: z.number(),
	threadIds: z.array(z.string().nullable()).optional(),
	buildCostUsdPerRun: z.array(z.number().nullable()).optional(),
	buildTurnsPerRun: z.array(z.number().nullable()).optional(),
	buildExpectationResultsPerRun: z.array(z.array(unitVerdictSchema).nullable()).optional(),
	scenarios: z.array(z.object({ name: z.string(), runs: z.array(scenarioRunSchema) })).optional(),
});

const evalResultsSchema = z.object({
	experimentName: z.string().nullish(),
	totalRuns: z.number(),
	testCases: z.array(testCaseSchema),
});

type EvalResults = z.infer<typeof evalResultsSchema>;
type ReportTestCase = z.infer<typeof testCaseSchema>;

// ---------------------------------------------------------------------------
// LangSmith REST (raw fetch + zod — keeps cost fields typed without SDK casts)
// ---------------------------------------------------------------------------

const lsProjectSchema = z.object({ id: z.string(), name: z.string() });
const lsRunsQuerySchema = z.object({
	runs: z.array(
		z.object({
			total_cost: z.number().nullish(),
			total_tokens: z.number().nullish(),
		}),
	),
});

interface LangSmithConfig {
	apiUrl: string;
	headers: Record<string, string>;
}

async function langsmithConfig(): Promise<LangSmithConfig> {
	const { apiUrl, apiKey } = configFor();
	if (!apiKey) {
		throw new Error(
			'LANGSMITH_API_KEY is not set — the AIA arm needs LangSmith access to sum builder cost.',
		);
	}
	const workspaceId = await resolveEvalWorkspaceId();
	return {
		apiUrl,
		headers: {
			'x-api-key': apiKey,
			'Content-Type': 'application/json',
			...(workspaceId ? { 'X-Tenant-Id': workspaceId } : {}),
		},
	};
}

async function resolveTraceProjectId(ls: LangSmithConfig, projectName: string): Promise<string> {
	const res = await fetch(`${ls.apiUrl}/api/v1/sessions?name=${encodeURIComponent(projectName)}`, {
		headers: ls.headers,
	});
	if (!res.ok) {
		throw new Error(`LangSmith sessions lookup failed: ${res.status} ${await res.text()}`);
	}
	const projects = z.array(lsProjectSchema).parse(await res.json());
	const match = projects.find((p) => p.name === projectName);
	if (!match) {
		throw new Error(
			`Trace project "${projectName}" not found in the eval workspace — is this the right tenant/workspace?`,
		);
	}
	return match.id;
}

interface ThreadCost {
	costUsd: number;
	tokens: number;
	/** Root runs in the thread — one per build turn. */
	turns: number;
}

/** Sum a thread's root runs (one per turn); roots aggregate their children,
 *  so this is the thread's whole backend LLM spend. */
async function sumThreadCost(
	ls: LangSmithConfig,
	projectId: string,
	threadId: string,
): Promise<ThreadCost> {
	const res = await fetch(`${ls.apiUrl}/api/v1/runs/query`, {
		method: 'POST',
		headers: ls.headers,
		body: JSON.stringify({
			session: [projectId],
			is_root: true,
			filter: `eq(thread_id, "${threadId}")`,
			limit: 100,
			select: ['id', 'total_cost', 'total_tokens'],
		}),
	});
	if (!res.ok) {
		throw new Error(`LangSmith runs/query failed: ${res.status} ${await res.text()}`);
	}
	const { runs } = lsRunsQuerySchema.parse(await res.json());
	return {
		costUsd: runs.reduce((sum, r) => sum + (r.total_cost ?? 0), 0),
		tokens: runs.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0),
		turns: runs.length,
	};
}

// ---------------------------------------------------------------------------
// Per-case aggregation
// ---------------------------------------------------------------------------

interface CaseCost {
	slug: string;
	/** Build cost per iteration; null when unknown (no thread / no spend recorded). */
	costPerIteration: Array<number | null>;
	/** MCP: `claude` turns; AIA: root runs (build turns). Mean over known iterations. */
	meanTurns?: number;
	/** AIA only: mean tokens per build. */
	meanTokens?: number;
	greenIterations: number;
	evaluatedIterations: number;
}

function caseSlug(tc: ReportTestCase): string {
	return tc.testCaseFile ?? tc.name;
}

/** An iteration is green when every evaluated unit of it passed (scenario runs
 *  plus build-expectation verdicts; incomplete units don't count either way). */
function greenStats(tc: ReportTestCase): { green: number; evaluated: number } {
	let green = 0;
	let evaluated = 0;
	for (let i = 0; i < tc.totalRuns; i++) {
		const verdicts: boolean[] = [];
		for (const scenario of tc.scenarios ?? []) {
			const run = scenario.runs[i];
			if (run && !run.incomplete) verdicts.push(run.passed);
		}
		for (const verdict of tc.buildExpectationResultsPerRun?.[i] ?? []) {
			if (!verdict.incomplete) verdicts.push(verdict.pass);
		}
		if (verdicts.length === 0) continue;
		evaluated++;
		if (verdicts.every(Boolean)) green++;
	}
	return { green, evaluated };
}

function mean(values: number[]): number | undefined {
	if (values.length === 0) return undefined;
	return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number | undefined {
	if (values.length === 0) return undefined;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mcpCaseCosts(results: EvalResults): CaseCost[] {
	return results.testCases.map((tc) => {
		const { green, evaluated } = greenStats(tc);
		const turns = (tc.buildTurnsPerRun ?? []).filter((t): t is number => t !== null);
		return {
			slug: caseSlug(tc),
			costPerIteration: tc.buildCostUsdPerRun ?? Array.from({ length: tc.totalRuns }, () => null),
			meanTurns: mean(turns),
			greenIterations: green,
			evaluatedIterations: evaluated,
		};
	});
}

async function aiaCaseCosts(
	results: EvalResults,
	ls: LangSmithConfig,
	projectId: string,
	concurrency: number,
): Promise<CaseCost[]> {
	// Flatten (case, iteration, threadId) so the thread queries can run in
	// fixed-size batches regardless of how threads distribute across cases.
	const lookups: Array<{ caseIndex: number; iteration: number; threadId: string }> = [];
	results.testCases.forEach((tc, caseIndex) => {
		(tc.threadIds ?? []).forEach((threadId, iteration) => {
			if (threadId) lookups.push({ caseIndex, iteration, threadId });
		});
	});

	const costs = new Map<string, ThreadCost>();
	for (let i = 0; i < lookups.length; i += concurrency) {
		const batch = lookups.slice(i, i + concurrency);
		const resolved = await Promise.all(
			batch.map(async (l) => ({ l, cost: await sumThreadCost(ls, projectId, l.threadId) })),
		);
		for (const { l, cost } of resolved) costs.set(`${l.caseIndex}:${l.iteration}`, cost);
	}

	return results.testCases.map((tc, caseIndex) => {
		const { green, evaluated } = greenStats(tc);
		const perIteration = Array.from({ length: tc.totalRuns }, (_, iteration) => {
			const cost = costs.get(`${caseIndex}:${iteration}`);
			return cost ? cost.costUsd : null;
		});
		const known = Array.from({ length: tc.totalRuns }, (_, iteration) =>
			costs.get(`${caseIndex}:${iteration}`),
		).filter((c): c is ThreadCost => c !== undefined);
		return {
			slug: caseSlug(tc),
			costPerIteration: perIteration,
			meanTurns: mean(known.map((c) => c.turns)),
			meanTokens: mean(known.map((c) => c.tokens)),
			greenIterations: green,
			evaluatedIterations: evaluated,
		};
	});
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

interface ArmSummary {
	label: string;
	experimentName?: string;
	cases: CaseCost[];
}

function knownCosts(arm: ArmSummary): number[] {
	return arm.cases.flatMap((c) => c.costPerIteration.filter((v): v is number => v !== null));
}

function fmtUsd(value: number | undefined | null): string {
	return value === undefined || value === null ? '—' : `$${value.toFixed(3)}`;
}

function fmtNum(value: number | undefined, digits = 1): string {
	return value === undefined ? '—' : value.toFixed(digits);
}

function armTotals(arm: ArmSummary): string[] {
	const costs = knownCosts(arm);
	const green = arm.cases.reduce((sum, c) => sum + c.greenIterations, 0);
	const evaluated = arm.cases.reduce((sum, c) => sum + c.evaluatedIterations, 0);
	const total = costs.reduce((a, b) => a + b, 0);
	return [
		`${arm.cases.length} cases`,
		`${costs.length} builds with cost`,
		`total ${fmtUsd(total)}`,
		`mean/build ${fmtUsd(mean(costs))}`,
		`median/build ${fmtUsd(median(costs))}`,
		`green ${green}/${evaluated} iterations`,
		`cost per green iteration ${green > 0 ? fmtUsd(total / green) : '—'}`,
	];
}

function renderMarkdown(arms: ArmSummary[]): string {
	const lines: string[] = ['# Build-cost report — builder arms compared', ''];
	for (const arm of arms) {
		lines.push(
			`- **${arm.label}**: ${arm.experimentName ?? '(unnamed experiment)'} — ${armTotals(arm).join(', ')}`,
		);
	}
	lines.push('');

	const slugs = [...new Set(arms.flatMap((arm) => arm.cases.map((c) => c.slug)))].sort();
	const byArm = arms.map((arm) => new Map(arm.cases.map((c) => [c.slug, c])));

	const header = ['case'];
	for (const arm of arms) {
		header.push(`${arm.label} $/build`, `${arm.label} green`, `${arm.label} turns`);
		if (arm.cases.some((c) => c.meanTokens !== undefined)) header.push(`${arm.label} tokens`);
	}
	lines.push(`| ${header.join(' | ')} |`);
	lines.push(`|${header.map(() => '---').join('|')}|`);

	for (const slug of slugs) {
		const row = [slug];
		for (let a = 0; a < arms.length; a++) {
			const c = byArm[a].get(slug);
			if (!c) {
				row.push('missing', '—', '—');
				if (arms[a].cases.some((x) => x.meanTokens !== undefined)) row.push('—');
				continue;
			}
			row.push(
				fmtUsd(mean(c.costPerIteration.filter((v): v is number => v !== null))),
				`${c.greenIterations}/${c.evaluatedIterations}`,
				fmtNum(c.meanTurns),
			);
			if (arms[a].cases.some((x) => x.meanTokens !== undefined)) {
				row.push(c.meanTokens === undefined ? '—' : Math.round(c.meanTokens).toLocaleString());
			}
		}
		lines.push(`| ${row.join(' | ')} |`);
	}
	lines.push('');
	lines.push(
		'_Cost sources differ by arm: MCP is `claude`-billed `total_cost_usd` (attempts summed);' +
			' AIA is LangSmith cache-aware pricing over the build thread’s root runs._',
	);
	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseFlags(argv: string[]): Map<string, string> {
	const flags = new Map<string, string>();
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith('--')) continue;
		const value = argv[i + 1];
		if (value === undefined || value.startsWith('--')) {
			throw new Error(`Flag ${arg} needs a value`);
		}
		flags.set(arg.slice(2), value);
		i++;
	}
	return flags;
}

function loadResults(path: string): EvalResults {
	return evalResultsSchema.parse(jsonParse(readFileSync(path, 'utf8')));
}

async function main(): Promise<void> {
	const flags = parseFlags(process.argv.slice(2));
	const traceProject = flags.get('trace-project') ?? 'instance-ai-evals';
	const concurrency = Number(flags.get('concurrency') ?? '5');

	const probeThread = flags.get('probe-thread');
	if (probeThread) {
		const ls = await langsmithConfig();
		const projectId = await resolveTraceProjectId(ls, traceProject);
		const cost = await sumThreadCost(ls, projectId, probeThread);
		console.log(
			`thread ${probeThread}: ${cost.turns} turns, ${cost.tokens.toLocaleString()} tokens, ${fmtUsd(cost.costUsd)}`,
		);
		return;
	}

	const aiaPath = flags.get('aia-results');
	const mcpPath = flags.get('mcp-results');
	if (!aiaPath && !mcpPath) {
		throw new Error('Pass --aia-results and/or --mcp-results (or --probe-thread <id>).');
	}

	const arms: ArmSummary[] = [];
	if (aiaPath) {
		const results = loadResults(aiaPath);
		const ls = await langsmithConfig();
		const projectId = await resolveTraceProjectId(ls, traceProject);
		arms.push({
			label: 'AIA',
			experimentName: results.experimentName ?? undefined,
			cases: await aiaCaseCosts(results, ls, projectId, concurrency),
		});
	}
	if (mcpPath) {
		const results = loadResults(mcpPath);
		const withCost = results.testCases.filter((tc) => tc.buildCostUsdPerRun !== undefined);
		if (withCost.length === 0) {
			console.warn(
				'MCP results carry no buildCostUsdPerRun — re-run the MCP arm on a build that persists per-case spend.',
			);
		}
		arms.push({
			label: 'MCP',
			experimentName: results.experimentName ?? undefined,
			cases: mcpCaseCosts(results),
		});
	}

	const markdown = renderMarkdown(arms);
	const outPath = flags.get('out') ?? 'build-cost-report.md';
	writeFileSync(outPath, markdown);
	for (const arm of arms) console.log(`${arm.label}: ${armTotals(arm).join(', ')}`);
	console.log(`Report written to ${outPath}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
