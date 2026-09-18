/**
 * Offline benchmark: can a System One model pick the next browser action from
 * a page snapshot accurately enough for `browser_act` to execute it without a
 * real-LLM turn?
 *
 * Exercises the production path — `buildRequest`, `createSystemOneFn` and
 * `decide` all come from `@n8n/mcp-browser`, so a passing number here is a
 * number about the shipped loop, not about a copy of it.
 *
 * Run:  source .env && pnpm tsx evaluations/typesafe-browser/run.ts
 */

import {
	actionCandidates,
	buildRequest,
	createSystemOneFn,
	estimateTokens,
	parseSnapshot,
	type Answer,
	type TaskBrief,
} from '@n8n/mcp-browser';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';

import { gradeCase, summarize } from './grade';

const DEFAULT_CASES = join(__dirname, 'fixtures/cases.json');
const OUTPUT_PATH = '.eval-output/typesafe-browser-results.json';
const API_KEY_ENV = 'N8N_INSTANCE_AI_TYPESAFE_API_KEY';
/** Requests are independent; a few at a time keeps the run quick. */
const CONCURRENCY = 4;

const caseSchema = z.object({
	id: z.string(),
	task: z.object({
		goal: z.string(),
		knownValues: z.record(z.string(), z.string()).optional(),
		recentActions: z
			.array(
				z.object({
					action: z.string(),
					target: z.string().optional(),
					text: z.string().optional(),
					changedPage: z.boolean(),
				}),
			)
			.optional(),
		page: z.object({ url: z.string(), title: z.string() }),
	}),
	snapshot: z.string(),
	expected: z.object({ tool: z.string(), ref: z.string().optional() }),
});

type BenchmarkCase = z.infer<typeof caseSchema>;

interface CaseRun {
	id: string;
	expected: BenchmarkCase['expected'];
	answers: Record<string, Answer>;
	latencyMs: number;
	stateTokensEst: number;
	inputTokens: number;
	elementCount: number;
}

interface CaseFailure {
	id: string;
	error: string;
}

function toTaskBrief(benchmarkCase: BenchmarkCase): TaskBrief {
	const { task } = benchmarkCase;
	return {
		goal: task.goal,
		...(task.knownValues ? { knownValues: task.knownValues } : {}),
		...(task.recentActions ? { recentActions: task.recentActions } : {}),
		url: task.page.url,
		title: task.page.title,
		snapshot: benchmarkCase.snapshot,
	};
}

/**
 * Failures are returned, never dropped. A dropped failure would shrink the
 * denominator and inflate every rate, which is the one thing a go/no-go
 * benchmark must not do.
 */
async function runAll(
	cases: BenchmarkCase[],
	systemOne: NonNullable<ReturnType<typeof createSystemOneFn>>,
): Promise<{ runs: CaseRun[]; failures: CaseFailure[] }> {
	const runs: CaseRun[] = [];
	const failures: CaseFailure[] = [];
	let next = 0;

	const worker = async () => {
		while (next < cases.length) {
			const benchmarkCase = cases[next++];
			try {
				const brief = toTaskBrief(benchmarkCase);
				const { elements } = actionCandidates(parseSnapshot(brief.snapshot));
				const { state, questions } = buildRequest(brief, elements);

				const startedAt = Date.now();
				const result = await systemOne({ state, questions });
				runs.push({
					id: benchmarkCase.id,
					expected: benchmarkCase.expected,
					answers: result.answers,
					latencyMs: Date.now() - startedAt,
					stateTokensEst: estimateTokens(JSON.stringify(state)),
					inputTokens: result.usage.input_tokens,
					elementCount: elements.length,
				});
			} catch (error) {
				failures.push({
					id: benchmarkCase.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	};

	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cases.length) }, worker));
	return { runs, failures };
}

const percent = (value: number) => `${(value * 100).toFixed(0)}%`;

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function main(): Promise<void> {
	const casesPath = resolve(process.argv[2] ?? DEFAULT_CASES);
	const systemOne = createSystemOneFn(process.env[API_KEY_ENV] ?? '', {
		// A benchmark exists to be debugged, so the body is printed here rather
		// than swallowed the way the production client does.
		onError: ({ status, statusText, body }) =>
			console.error(`  API ${status} ${statusText}: ${body.slice(0, 300)}`),
	});
	if (!systemOne) {
		throw new Error(`${API_KEY_ENV} is not set. Export it first (\`source .env\`) and re-run.`);
	}

	const parsed: unknown = JSON.parse(await readFile(casesPath, 'utf-8'));
	const cases = z.array(caseSchema).parse(parsed);
	console.log(`Running ${cases.length} case(s) from ${casesPath}\n`);

	const { runs, failures } = await runAll(cases, systemOne);
	if (runs.length === 0) {
		console.error('No cases completed.');
		for (const failure of failures) console.error(`  ${failure.id}: ${failure.error}`);
		process.exitCode = 1;
		return;
	}

	const allGraded = runs.map((run) => gradeCase(run.id, run.expected, run.answers));
	const base = summarize(allGraded);

	console.log('Per case:');
	for (const graded of allGraded) {
		const run = runs.find((r) => r.id === graded.id);
		const want = graded.expected.tool + (graded.expected.ref ? ` ${graded.expected.ref}` : '');
		const got = graded.routerChoice + (graded.refChoice ? ` ${graded.refChoice}` : '');
		const outcome =
			graded.decision.kind === 'execute'
				? graded.autoExecutedCorrectly
					? 'RAN  ok'
					: 'RAN  WRONG'
				: `held ${graded.decision.reason}`;

		console.log(
			`  ${graded.exactMatch ? 'ok  ' : 'MISS'} ${graded.id}\n` +
				`       want ${want} | got ${got} | conf ${graded.confidence.toFixed(2)} | ${outcome}\n` +
				`       ${run?.elementCount ?? 0} refs | ${run?.inputTokens ?? 0} tok | ${run?.latencyMs ?? 0}ms` +
				(graded.trippedGuards.length > 0
					? ` | ${graded.trippedGuards.map((g) => g.replace('guard_', '!')).join(' ')}`
					: ''),
		);
	}

	if (failures.length > 0) {
		console.log(`\n${failures.length} case(s) FAILED and are excluded from every rate below:`);
		for (const failure of failures) console.log(`  ${failure.id}: ${failure.error}`);
	}

	console.log(`\nScored            ${base.cases}/${cases.length} case(s)`);
	console.log(`Router accuracy   ${percent(base.routerAccuracy)}`);
	console.log(`Ref accuracy      ${percent(base.refAccuracy)} (over ${base.refsJudged} judged)`);
	console.log(`Exact match       ${percent(base.exactMatchRate)}`);
	console.log(`Median latency    ${median(runs.map((r) => r.latencyMs))}ms`);
	console.log(`Median input tok  ${median(runs.map((r) => r.inputTokens))}`);
	console.log(`Largest state est ${Math.max(...runs.map((r) => r.stateTokensEst))} tok`);
	console.log(`Hand-back reasons ${JSON.stringify(base.handbackReasons)}`);

	// There is no confidence gate any more, so the question is no longer "which
	// threshold" but "would any threshold have separated right from wrong". If
	// the two columns overlap, a gate cannot help and only costs coverage.
	console.log('\nConfidence of executed actions:');
	console.log('  bucket      correct  wrong');
	for (const low of [0, 0.2, 0.4, 0.6, 0.8]) {
		const inBucket = allGraded.filter(
			(one) => one.autoExecuted && one.confidence >= low && one.confidence < low + 0.2,
		);
		if (inBucket.length === 0) continue;
		const correct = inBucket.filter((one) => one.autoExecutedCorrectly).length;
		console.log(
			`  ${low.toFixed(1)}–${(low + 0.2).toFixed(1)}     ${String(correct).padStart(8)}  ` +
				`${String(inBucket.length - correct).padStart(5)}`,
		);
	}

	const outputPath = resolve(OUTPUT_PATH);
	await mkdir(dirname(outputPath), { recursive: true });
	await writeFile(
		outputPath,
		JSON.stringify({ summary: base, failures, runs, graded: allGraded }, null, 2),
		'utf-8',
	);
	console.log(`\nFull results written to ${outputPath}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
	process.exit(2);
});
