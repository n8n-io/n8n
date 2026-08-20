// ---------------------------------------------------------------------------
// Build-cost comparison report across eval runs ("arms") — one arm per
// eval-results.json, any pairing: MCP vs AIA, AIA vs AIA (builder-model A/Bs),
// MCP vs MCP (ANTHROPIC_MODEL A/Bs), or a single arm alone.
//
// The cost source is auto-detected per file, in this order:
//   - `buildCostUsdPerRun` present → persisted `claude` spend
//     (--build-via-mcp runs; attempts summed).
//   - `buildTokensPerRun` present → cache-aware token counts the harness summed
//     from each build's run debug, priced locally with the --rate-* flags. No
//     credentials, no network, no trace-retention window.
//   - non-null `threadIds` → backend builder cost summed from LangSmith:
//     each case's threads resolve to root runs (one per build turn) in the
//     backend trace project (default `instance-ai-evals`, eval workspace),
//     whose `total_cost` LangSmith prices cache-aware from the traced usage.
//     The fallback for runs recorded before token persistence existed.
// Every arm also gets per-iteration green verdicts (every evaluated scenario
// run and build expectation passed) → cost per green iteration.
//
// Usage — deliberately not wired into package.json (an experiment-time tool,
// used rarely); invoke via tsx from packages/@n8n/instance-ai:
//   dotenvx run -f ../../../.env.local -- pnpm tsx evaluations/cli/build-cost-report.ts \
//     --results <mcp-run>/eval-results.json --results <aia-run>/eval-results.json \
//     [--label mcp-opus48 --label aia-opus48] \
//     [--trace-project instance-ai-evals] [--out build-cost-report.md]
//
// Comparing two memory approaches (the quality-per-token verdict) — both arms
// come from persisted tokens, so LangSmith is not involved and dotenvx is only
// needed if the run itself needed it:
//   pnpm tsx evaluations/cli/build-cost-report.ts \
//     --results runs/baseline/eval-results.json --results runs/candidate/eval-results.json \
//     --label baseline --label candidate --out memory-ab.md
// Run each arm with the SAME case set and --iterations >= 5 (default is 1, which
// cannot separate two approaches from judge noise), then read cost per green
// iteration alongside mean tool calls: a better memory approach often ties on
// pass rate while spending materially less.
//
// Labels default to each run's experimentName. `--probe-thread <id>` skips the
// report and prints one thread's cost — a connectivity spot-check. The LangSmith
// path reads LANGSMITH_ENDPOINT / LANGSMITH_API_KEY and pins reads to the eval
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

/** Cache-aware token totals the harness now persists per build (see
 *  `harness/usage-summary.ts`), so an AIA arm no longer needs the LangSmith join. */
const buildTokensSchema = z.object({
	uncachedInput: z.number().min(0),
	cacheRead: z.number().min(0),
	cacheWrite: z.number().min(0),
	output: z.number().min(0),
	totalTokens: z.number().min(0),
	steps: z.number().min(0),
});

export type BuildTokens = z.infer<typeof buildTokensSchema>;

const testCaseSchema = z.object({
	name: z.string(),
	testCaseFile: z.string().nullish(),
	status: z.string(),
	totalRuns: z.number(),
	threadIds: z.array(z.string().nullable()).optional(),
	buildCostUsdPerRun: z.array(z.number().nullable()).optional(),
	buildTurnsPerRun: z.array(z.number().nullable()).optional(),
	buildTokensPerRun: z.array(buildTokensSchema.nullable()).optional(),
	buildToolCallsPerRun: z.array(z.number().nullable()).optional(),
	/** Per-iteration context/build cross, written by the harness. Non-strict on the
	 *  outcome string so a future cell name does not break an older report. */
	contextOutcomePerRun: z.array(z.object({ outcome: z.string() }).nullable()).optional(),
	buildExpectationResultsPerRun: z.array(z.array(unitVerdictSchema).nullable()).optional(),
	scenarios: z.array(z.object({ name: z.string(), runs: z.array(scenarioRunSchema) })).optional(),
});

const evalResultsSchema = z.object({
	experimentName: z.string().nullish(),
	totalRuns: z.number(),
	testCases: z.array(testCaseSchema),
});

export type EvalResults = z.infer<typeof evalResultsSchema>;

/** Parse an `eval-results.json` payload with this report's own schema. Exported so
 *  the producer↔consumer contract can be tested against the real schema rather than
 *  a hand-written copy of it, which would not catch a field rename on either side. */
export function parseEvalResults(payload: unknown): EvalResults {
	return evalResultsSchema.parse(payload);
}

export type ReportTestCase = z.infer<typeof testCaseSchema>;

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

/** LangSmith request with 429/5xx backoff — a full-run join fires ~100 queries,
 *  which trips the API's rate limit without pacing. Honors Retry-After. */
async function lsFetch(url: string, init: RequestInit): Promise<Response> {
	let delayMs = 2_000;
	for (let attempt = 1; ; attempt++) {
		const res = await fetch(url, init);
		if (res.ok || attempt >= 6 || (res.status !== 429 && res.status < 500)) return res;
		const retryAfter = Number(res.headers.get('retry-after'));
		const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : delayMs;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
		delayMs = Math.min(delayMs * 2, 30_000);
	}
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
	const res = await lsFetch(
		`${ls.apiUrl}/api/v1/sessions?name=${encodeURIComponent(projectName)}`,
		{
			headers: ls.headers,
		},
	);
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

const RUNS_QUERY_LIMIT = 100;

/** Sum a thread's root runs (one per turn); roots aggregate their children,
 *  so this is the thread's whole backend LLM spend. Null when the thread has
 *  no runs in the project — an unknown cost, not a $0 build (wrong
 *  --trace-project, or the trace hasn't landed yet). */
export async function sumThreadCost(
	ls: LangSmithConfig,
	projectId: string,
	threadId: string,
): Promise<ThreadCost | null> {
	const res = await lsFetch(`${ls.apiUrl}/api/v1/runs/query`, {
		method: 'POST',
		headers: ls.headers,
		body: JSON.stringify({
			session: [projectId],
			is_root: true,
			filter: `eq(thread_id, "${threadId}")`,
			limit: RUNS_QUERY_LIMIT,
			select: ['id', 'total_cost', 'total_tokens'],
		}),
	});
	if (!res.ok) {
		throw new Error(`LangSmith runs/query failed: ${res.status} ${await res.text()}`);
	}
	const { runs } = lsRunsQuerySchema.parse(await res.json());
	if (runs.length === 0) return null;
	if (runs.length === RUNS_QUERY_LIMIT) {
		console.warn(
			`thread ${threadId}: hit the runs/query page limit (${RUNS_QUERY_LIMIT}) — cost may be undercounted`,
		);
	}
	return {
		costUsd: runs.reduce((sum, r) => sum + (r.total_cost ?? 0), 0),
		tokens: runs.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0),
		turns: runs.length,
	};
}

// ---------------------------------------------------------------------------
// Per-case aggregation
// ---------------------------------------------------------------------------

export interface CaseCost {
	slug: string;
	/** Build cost per iteration; null when unknown (no thread, unresolved thread, or no spend recorded). */
	costPerIteration: Array<number | null>;
	/** MCP: `claude` turns; AIA: root runs (build turns). Mean over known iterations. */
	meanTurns?: number;
	/** AIA only: mean tokens per build. */
	meanTokens?: number;
	/** Mean tool calls per build. The first place a memory change that cuts
	 *  re-reads of instance state shows up. */
	meanToolCalls?: number;
	/** Mean cache-read tokens per build — separated because cache hit rate usually
	 *  moves more than raw input does when context handling changes. */
	meanCacheReadTokens?: number;
	greenIterations: number;
	evaluatedIterations: number;
	/** How many iterations landed in each context/build cell. The headline number for
	 *  a memory A/B: a working approach moves iterations OUT of `retrieval-gap`, and
	 *  it must not move them INTO `unattributed-success`, which is where a system
	 *  gets credited for builds something else carried.
	 *
	 *  Optional because a results file recorded before the harness wrote the
	 *  classification genuinely has none — absent means "not measured", which must not
	 *  be rendered as an empty tally. */
	contextOutcomes?: Record<string, number>;
}

function caseSlug(tc: ReportTestCase): string {
	return tc.testCaseFile ?? tc.name;
}

/** Count iterations per context/build cell, skipping the ones that could not be
 *  classified (no gradable claim on both axes). */
function contextOutcomesOf(tc: ReportTestCase): Record<string, number> {
	const tally: Record<string, number> = {};
	for (const entry of tc.contextOutcomePerRun ?? []) {
		if (!entry || entry.outcome === 'unclassified') continue;
		tally[entry.outcome] = (tally[entry.outcome] ?? 0) + 1;
	}
	return tally;
}

/** An iteration is green when every evaluated unit of it passed (scenario runs
 *  plus build-expectation verdicts; incomplete units don't count either way). */
export function greenStats(tc: ReportTestCase): { green: number; evaluated: number } {
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

/**
 * Per-million-token rates used to price persisted token counts, in USD.
 *
 * Overridable via `--rate-*` so an arm on a different model can be priced without
 * an edit. Defaults are Sonnet-class list prices; cache reads and writes are priced
 * separately because that split is the whole reason to persist the breakdown — a
 * memory change usually moves cache hit rate before it moves raw input.
 */
export interface TokenRates {
	uncachedInput: number;
	cacheRead: number;
	cacheWrite: number;
	output: number;
}

export const DEFAULT_TOKEN_RATES: TokenRates = {
	uncachedInput: 3,
	cacheRead: 0.3,
	cacheWrite: 3.75,
	output: 15,
};

export function priceTokens(tokens: BuildTokens, rates: TokenRates): number {
	return (
		(tokens.uncachedInput * rates.uncachedInput +
			tokens.cacheRead * rates.cacheRead +
			tokens.cacheWrite * rates.cacheWrite +
			tokens.output * rates.output) /
		1_000_000
	);
}

/**
 * Arm priced from the token counts the harness persisted per build.
 *
 * Preferred over the LangSmith thread join: it needs no credentials, no network and
 * no trace retention, so a two-arm comparison reads straight from two
 * `eval-results.json` files. The join stays as the fallback for runs recorded before
 * these fields existed.
 */
export function persistedTokenCosts(results: EvalResults, rates: TokenRates): CaseCost[] {
	return results.testCases.map((tc) => {
		const { green, evaluated } = greenStats(tc);
		const perRun = tc.buildTokensPerRun ?? [];
		const known = perRun.filter((t): t is BuildTokens => t !== null);
		return {
			slug: caseSlug(tc),
			costPerIteration: Array.from({ length: tc.totalRuns }, (_, i) => {
				const tokens = perRun[i];
				return tokens ? priceTokens(tokens, rates) : null;
			}),
			meanTokens: mean(known.map((t) => t.totalTokens)),
			meanToolCalls: meanToolCallsOf(tc),
			meanCacheReadTokens: mean(known.map((t) => t.cacheRead)),
			greenIterations: green,
			evaluatedIterations: evaluated,
		};
	});
}

/** Mean tool calls per build. Emitted independently of any cost source, so every arm
 *  reports it when the field is present rather than only the token-priced one. */
function meanToolCallsOf(tc: ReportTestCase): number | undefined {
	return mean((tc.buildToolCallsPerRun ?? []).filter((n): n is number => n !== null));
}

/** Arm whose cost the harness persisted per case (`--build-via-mcp` runs). */
export function persistedSpendCosts(results: EvalResults): CaseCost[] {
	return results.testCases.map((tc) => {
		const { green, evaluated } = greenStats(tc);
		const turns = (tc.buildTurnsPerRun ?? []).filter((t): t is number => t !== null);
		return {
			slug: caseSlug(tc),
			costPerIteration: tc.buildCostUsdPerRun ?? Array.from({ length: tc.totalRuns }, () => null),
			meanTurns: mean(turns),
			meanToolCalls: meanToolCallsOf(tc),
			greenIterations: green,
			evaluatedIterations: evaluated,
			contextOutcomes: contextOutcomesOf(tc),
		};
	});
}

/** Arm whose builder ran in the n8n backend (AIA): sum each case's build
 *  threads from the LangSmith trace project. */
export async function threadJoinCosts(
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
		for (const { l, cost } of resolved) {
			if (cost) costs.set(`${l.caseIndex}:${l.iteration}`, cost);
			else {
				console.warn(
					`thread ${l.threadId}: no runs in the trace project — wrong --trace-project or trace not landed; cost recorded as unknown`,
				);
			}
		}
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
			contextOutcomes: contextOutcomesOf(results.testCases[caseIndex]),
			greenIterations: green,
			evaluatedIterations: evaluated,
		};
	});
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export interface ArmSummary {
	label: string;
	/** Where this arm's dollars came from — rendered so mixed-source tables stay honest. */
	source: string;
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
	// Cache reads are called out at arm level rather than per case: it is an
	// aggregate signal, and a context change usually moves cache hit rate before it
	// moves anything else.
	const cacheReads = arm.cases
		.map((c) => c.meanCacheReadTokens)
		.filter((n): n is number => n !== undefined);
	return [
		`${arm.cases.length} cases`,
		`${costs.length} builds with cost`,
		`total ${fmtUsd(total)}`,
		`mean/build ${fmtUsd(mean(costs))}`,
		`median/build ${fmtUsd(median(costs))}`,
		...(cacheReads.length > 0
			? [`mean cache-read tokens/build ${Math.round(mean(cacheReads) ?? 0).toLocaleString()}`]
			: []),
		`green ${green}/${evaluated} iterations`,
		`cost per green iteration ${green > 0 ? fmtUsd(total / green) : '—'}`,
	];
}

/**
 * Per-arm context/build tally, in the order that reads as a diagnosis.
 *
 * The headline for a memory A/B: a working approach moves iterations out of
 * `retrieval-gap`. It must not move them into `unattributed-success` — that cell is
 * the build succeeding while the context lacked the fact, so something other than the
 * context system carried it, and crediting the system there would flatter it.
 */
const OUTCOME_ORDER = [
	'retrieval-gap',
	'context-ignored',
	'working',
	'unattributed-success',
] as const;

const OUTCOME_SHORT: Record<string, string> = {
	'retrieval-gap': 'never retrieved',
	'context-ignored': 'present but unused',
	working: 'context used',
	'unattributed-success': 'passed without it',
};

function contextOutcomeLine(arm: ArmSummary): string | undefined {
	const total: Record<string, number> = {};
	for (const c of arm.cases) {
		for (const [outcome, n] of Object.entries(c.contextOutcomes ?? {})) {
			total[outcome] = (total[outcome] ?? 0) + n;
		}
	}
	const parts = OUTCOME_ORDER.filter((o) => total[o]).map(
		(o) => `${OUTCOME_SHORT[o]} ${String(total[o])}`,
	);
	// Any cell the harness reports that this report has not been taught to order.
	for (const [o, n] of Object.entries(total)) {
		if (!OUTCOME_ORDER.includes(o as (typeof OUTCOME_ORDER)[number])) {
			parts.push(`${o} ${String(n)}`);
		}
	}
	return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function renderMarkdown(arms: ArmSummary[]): string {
	const lines: string[] = ['# Build-cost report — builder arms compared', ''];
	for (const arm of arms) {
		lines.push(`- **${arm.label}** (${arm.source}): ${armTotals(arm).join(', ')}`);
		const outcomes = contextOutcomeLine(arm);
		// Cost alone cannot tell a better context system from a cheaper one that
		// delivers nothing, so this sits directly under each arm's cost summary.
		if (outcomes) lines.push(`  - context: ${outcomes}`);
	}
	lines.push('');

	const slugs = [...new Set(arms.flatMap((arm) => arm.cases.map((c) => c.slug)))].sort();
	const byArm = arms.map((arm) => new Map(arm.cases.map((c) => [c.slug, c])));

	// Which optional columns an arm earns, decided once per arm so the header and
	// every row stay in step — they silently desynchronise if each recomputes it.
	const columns = arms.map((arm) => ({
		tokens: arm.cases.some((c) => c.meanTokens !== undefined),
		toolCalls: arm.cases.some((c) => c.meanToolCalls !== undefined),
	}));

	const header = ['case'];
	arms.forEach((arm, a) => {
		header.push(`${arm.label} $/build`, `${arm.label} green`, `${arm.label} turns`);
		if (columns[a].tokens) header.push(`${arm.label} tokens`);
		if (columns[a].toolCalls) header.push(`${arm.label} tools`);
	});
	lines.push(`| ${header.join(' | ')} |`);
	lines.push(`|${header.map(() => '---').join('|')}|`);

	for (const slug of slugs) {
		const row = [slug];
		for (let a = 0; a < arms.length; a++) {
			const c = byArm[a].get(slug);
			if (!c) {
				row.push('missing', '—', '—');
				if (columns[a].tokens) row.push('—');
				if (columns[a].toolCalls) row.push('—');
				continue;
			}
			row.push(
				fmtUsd(mean(c.costPerIteration.filter((v): v is number => v !== null))),
				`${c.greenIterations}/${c.evaluatedIterations}`,
				fmtNum(c.meanTurns),
			);
			if (columns[a].tokens) {
				row.push(c.meanTokens === undefined ? '—' : Math.round(c.meanTokens).toLocaleString());
			}
			if (columns[a].toolCalls) row.push(fmtNum(c.meanToolCalls));
		}
		lines.push(`| ${row.join(' | ')} |`);
	}
	lines.push('');
	lines.push(
		'_Cost sources are listed per arm above: persisted `claude` spend is Anthropic-billed' +
			' `total_cost_usd` (attempts summed); persisted tokens are the harness’s own cache-aware' +
			' counts priced locally at the --rate-* values; thread pricing is LangSmith cache-aware' +
			' pricing over the build thread’s root runs. Comparable at list price, not identical' +
			' accountants — do not mix sources across arms you intend to compare on cost._',
	);
	return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseFlags(argv: string[]): Map<string, string[]> {
	const flags = new Map<string, string[]>();
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith('--')) continue;
		const value = argv[i + 1];
		if (value === undefined || value.startsWith('--')) {
			throw new Error(`Flag ${arg} needs a value`);
		}
		const key = arg.slice(2);
		const values = flags.get(key);
		if (values) values.push(value);
		else flags.set(key, [value]);
		i++;
	}
	return flags;
}

/** Last occurrence wins for flags that only make sense once. */
function single(flags: Map<string, string[]>, key: string): string | undefined {
	return flags.get(key)?.at(-1);
}

function loadResults(path: string): EvalResults {
	return evalResultsSchema.parse(jsonParse(readFileSync(path, 'utf8')));
}

async function main(): Promise<void> {
	const flags = parseFlags(process.argv.slice(2));
	const traceProject = single(flags, 'trace-project') ?? 'instance-ai-evals';
	const concurrency = Math.max(1, Math.floor(Number(single(flags, 'concurrency'))) || 3);

	const probeThread = single(flags, 'probe-thread');
	if (probeThread) {
		const ls = await langsmithConfig();
		const projectId = await resolveTraceProjectId(ls, traceProject);
		const cost = await sumThreadCost(ls, projectId, probeThread);
		if (!cost) {
			console.log(`thread ${probeThread}: no runs found in trace project "${traceProject}"`);
			return;
		}
		console.log(
			`thread ${probeThread}: ${cost.turns} turns, ${cost.tokens.toLocaleString()} tokens, ${fmtUsd(cost.costUsd)}`,
		);
		return;
	}

	const resultPaths = flags.get('results') ?? [];
	const labels = flags.get('label') ?? [];
	if (resultPaths.length === 0) {
		throw new Error(
			'Pass --results <eval-results.json> (repeatable, one per arm) or --probe-thread <id>.',
		);
	}

	const rateFlag = (key: keyof TokenRates, flagName: string): number => {
		const raw = single(flags, flagName);
		if (raw === undefined) return DEFAULT_TOKEN_RATES[key];
		const parsed = Number(raw);
		if (!Number.isFinite(parsed) || parsed < 0) {
			throw new Error(`--${flagName} must be a non-negative number (USD per million tokens)`);
		}
		return parsed;
	};
	const rates: TokenRates = {
		uncachedInput: rateFlag('uncachedInput', 'rate-input'),
		cacheRead: rateFlag('cacheRead', 'rate-cache-read'),
		cacheWrite: rateFlag('cacheWrite', 'rate-cache-write'),
		output: rateFlag('output', 'rate-output'),
	};

	// LangSmith access is resolved once, lazily — only when some arm needs the
	// thread join (a persisted-spend-only comparison runs without credentials).
	let ls: LangSmithConfig | undefined;
	let projectId: string | undefined;

	const arms: ArmSummary[] = [];
	for (let i = 0; i < resultPaths.length; i++) {
		const results = loadResults(resultPaths[i]);
		const label = labels[i] ?? results.experimentName ?? `arm${String(i + 1)}`;
		const hasPersistedSpend = results.testCases.some((tc) => tc.buildCostUsdPerRun !== undefined);
		const hasPersistedTokens = results.testCases.some((tc) =>
			(tc.buildTokensPerRun ?? []).some((t) => t !== null),
		);
		const hasThreads = results.testCases.some((tc) =>
			(tc.threadIds ?? []).some((id) => id !== null),
		);
		if (hasPersistedSpend) {
			arms.push({ label, source: 'persisted `claude` spend', cases: persistedSpendCosts(results) });
		} else if (hasPersistedTokens) {
			// Preferred over the thread join below: no credentials, no network, no trace
			// retention window — two result files are enough.
			arms.push({
				label,
				source: 'persisted tokens (priced locally)',
				cases: persistedTokenCosts(results, rates),
			});
		} else if (hasThreads) {
			ls ??= await langsmithConfig();
			projectId ??= await resolveTraceProjectId(ls, traceProject);
			arms.push({
				label,
				source: 'LangSmith thread pricing',
				cases: await threadJoinCosts(results, ls, projectId, concurrency),
			});
		} else {
			console.warn(`${resultPaths[i]}: no buildCostUsdPerRun and no threadIds — pass data only.`);
			arms.push({ label, source: 'no cost source', cases: persistedSpendCosts(results) });
		}
	}

	const markdown = renderMarkdown(arms);
	const outPath = single(flags, 'out') ?? 'build-cost-report.md';
	writeFileSync(outPath, markdown);
	for (const arm of arms) console.log(`${arm.label}: ${armTotals(arm).join(', ')}`);
	console.log(`Report written to ${outPath}`);
}

if (require.main === module) {
	main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
