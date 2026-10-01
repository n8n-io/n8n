#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Routing eval grader.
//
// Usage (from packages/@n8n/instance-ai):
//   pnpm tsx evaluations/routing/grade.ts --results <file> --cases-dir <dir> [--compare <file>] --out <report.md>
//
// Options:
//   --cases-dir <dir>          Routing cases, one `<id>.json` each (required).
//   --judge-cache-dir <dir>    Judge verdict cache (default evaluations/.data/routing-judge-cache).
//   --judge-concurrency <n>    Parallel judge requests (default 4).
//
// Reads the results JSON, resolves the route of each trial (see route rules in
// grade-resolve.ts), asks the judge only for ask-user cards and text-only
// replies, applies the case's accept tokens, and writes a markdown report and
// a JSON summary next to it (<report>.json). The judge needs ANTHROPIC_API_KEY
// unless every verdict is already cached. Exits 2 when a judge call failed.
//
// A case with a trial that stopped on a call that no longer commits (the stop
// rules changed after the run) is not graded. The report lists it under
// "Pending re-run".
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';

import {
	computeCompare,
	computeConfusion,
	computeHealth,
	computeRunMetrics,
	failureReason,
	type GradedRun,
	renderReport,
} from './grade-report';
import { gradeRoutingResults } from './grade-run';
import { loadRoutingCases, readResultsFile, type RoutingCase } from './grade-types';
import { DEFAULT_JUDGE_CACHE_DIR, JUDGE_MODEL, RoutingJudge } from './judge';

interface CliArgs {
	results: string;
	compare?: string;
	out: string;
	casesDir: string;
	judgeCacheDir: string;
	judgeConcurrency: number;
}

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}

function parseArgs(argv: string[]): CliArgs {
	const values = new Map<string, string>();
	for (let index = 0; index < argv.length; index++) {
		const flag = argv[index];
		if (flag === '--help' || flag === '-h') {
			console.log(
				'Usage: grade.ts --results <file> --cases-dir <dir> [--compare <file>] --out <report.md> [--judge-cache-dir <dir>] [--judge-concurrency <n>]',
			);
			process.exit(0);
		}
		if (!flag.startsWith('--')) fail(`Unexpected argument: ${flag}`);
		const value = argv[index + 1];
		if (value === undefined || value.startsWith('--')) fail(`Missing value for ${flag}`);
		values.set(flag.slice(2), value);
		index++;
	}
	const known = new Set([
		'results',
		'compare',
		'out',
		'cases-dir',
		'judge-cache-dir',
		'judge-concurrency',
	]);
	for (const key of values.keys()) if (!known.has(key)) fail(`Unknown option: --${key}`);

	const results = values.get('results') ?? fail('--results is required');
	const out = values.get('out') ?? fail('--out is required');
	const casesDir = values.get('cases-dir') ?? fail('--cases-dir is required');
	const concurrency = Number(values.get('judge-concurrency') ?? '4');
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		fail('--judge-concurrency must be a positive integer');
	}
	const compare = values.get('compare');
	return {
		results: resolve(results),
		compare: compare === undefined ? undefined : resolve(compare),
		out: resolve(out),
		casesDir: resolve(casesDir),
		judgeCacheDir: resolve(values.get('judge-cache-dir') ?? DEFAULT_JUDGE_CACHE_DIR),
		judgeConcurrency: concurrency,
	};
}

async function gradeRun(
	file: string,
	cases: Map<string, RoutingCase>,
	judge: RoutingJudge,
	concurrency: number,
): Promise<GradedRun> {
	return await gradeRoutingResults(readResultsFile(file), cases, judge, concurrency, file);
}

function summaryPath(reportPath: string): string {
	const { dir, name, ext } = parse(reportPath);
	return join(dir, `${ext === '.md' ? name : `${name}${ext}`}.json`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!existsSync(args.results)) fail(`Results file not found: ${args.results}`);
	if (args.compare && !existsSync(args.compare)) fail(`Compare file not found: ${args.compare}`);
	if (!existsSync(args.casesDir)) fail(`Cases directory not found: ${args.casesDir}`);

	const { byId: cases, warnings } = loadRoutingCases(args.casesDir);
	const judge = new RoutingJudge({
		cacheDir: args.judgeCacheDir,
		apiKey: process.env.ANTHROPIC_API_KEY,
	});

	const run = await gradeRun(args.results, cases, judge, args.judgeConcurrency);
	const base = args.compare
		? await gradeRun(args.compare, cases, judge, args.judgeConcurrency)
		: undefined;

	const metrics = computeRunMetrics(run.cases);
	const confusion = computeConfusion(run.cases);
	const health = computeHealth(run, judge.stats, warnings);
	const compare = base ? computeCompare(run, base) : undefined;
	const report = renderReport({
		run,
		metrics,
		confusion,
		health,
		casesDir: args.casesDir,
		compare,
	});

	const summary = {
		generatedAt: new Date().toISOString(),
		casesDir: args.casesDir,
		judgeModel: JUDGE_MODEL,
		results: run.meta,
		metrics,
		confusion,
		health,
		failingCases: run.cases
			.filter((graded) => !graded.pass)
			.map((graded) => ({
				id: graded.id,
				bucket: graded.bucket,
				accepts: graded.accepts,
				policyDependent: graded.policyDependent,
				routes: graded.trials.map((trial) => trial.label),
				reason: failureReason(graded),
			})),
		pendingRerun: run.pendingRerun,
		cases: run.cases,
		compare: compare && base ? { ...compare, baseCases: base.cases } : undefined,
	};

	mkdirSync(dirname(args.out), { recursive: true });
	writeFileSync(args.out, report);
	const jsonPath = summaryPath(args.out);
	writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);

	const pct = (value: number | null) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`);
	console.log(
		`${run.meta.variant}: macro ${pct(metrics.all.macroAccuracy)}, trial ${pct(metrics.all.trialPass.rate)}, ` +
			`strict macro ${pct(metrics.all.strictMacroAccuracy)}, over-asking ${pct(metrics.all.overAsking.rate)}, ` +
			`${metrics.all.cases} cases, ${metrics.all.trials} trials, ${run.pendingRerun.length} pending re-run ` +
			`(judge: ${health.judgedTrials} judged, ${judge.stats.cacheHits} cached, ${health.judgeFailedTrials} failed)`,
	);
	if (compare) {
		const before = compare.base.all.macroAccuracy;
		const after = compare.current.all.macroAccuracy;
		const delta =
			before === null || after === null ? 'n/a' : `${((after - before) * 100).toFixed(1)} pp`;
		console.log(
			`vs ${compare.baseMeta.variant}: macro delta ${delta}, ${compare.flipped.length} flipped cases`,
		);
	}
	console.log(`Report: ${args.out}`);
	console.log(`Summary: ${jsonPath}`);
	const judgeFailures = health.judgeFailedTrials + (base ? countJudgeFailures(base) : 0);
	if (judgeFailures > 0) {
		console.error(
			`${judgeFailures} trials failed to judge. Fix the cause and re-run; cached verdicts are reused.`,
		);
		process.exitCode = 2;
	}
}

function countJudgeFailures(run: GradedRun): number {
	return run.cases
		.flatMap((graded) => graded.trials)
		.filter((trial) => trial.resolution.judgeError !== undefined).length;
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
	process.exit(1);
});
