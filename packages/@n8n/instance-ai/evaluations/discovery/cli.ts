#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CLI for browser/computer-use discovery evaluation.
//
// Usage:
//   pnpm eval:discovery                                # run all scenarios, 3 trials each
//   pnpm eval:discovery --filter slack-oauth --verbose
//   pnpm eval:discovery --trials 5
//
// Loads scenarios from evaluations/data/discovery/, runs each scenario × N
// trials via the in-process runner, reports per-scenario pass-rates, exits
// non-zero on any scenario below threshold, or on any scenario with zero passes
// when --fail-on-zero-pass is set.
//
// Routing mode (cases live in LangTracer suite `intent-routing`):
//   pnpm eval:discovery --cases-dir <dir> --stop-on-route \
//     --json-out .data/routing/baseline.json --variant baseline --scenario-concurrency 4
//   pnpm eval:discovery --cases-dir <dir> --filter <slug> --stop-on-route --output-dir <out>
//   pnpm eval:discovery --source langtracer --suite intent-routing --validate-only
//
// `--cases-dir` reads routing case files and LangTracer suite-export bodies (see
// routing-case-dir.ts). Without `--output-dir`, routing mode reports no pass
// rates: it records each trial into the `--json-out` file for
// evaluations/routing/grade.ts. With `--output-dir`, it grades each case inline
// and writes `eval-results.json` for the LangTracer dispatcher (see
// routing-eval-results.ts). `--source langtracer --suite <slug>` pulls the cases
// from LangTracer instead. With `--validate-only`, `--compare-dir` checks the
// loaded cases against another directory. `--save-cases-dir` writes the loaded
// cases as `<id>.json`, so evaluations/routing/grade.ts can read them.
//
// `--skill-file <skillId>=<path>` runs the orchestrator with a different
// SKILL.md for that runtime skill (see skill-overrides.ts).
// ---------------------------------------------------------------------------

import type { RuntimeSkillSource } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isRoutingMode, parseCliArgs, USAGE, type CliArgs } from './cli-args';
import { loadRoutingCaseDir } from './routing-case-dir';
import {
	ROUTING_RESULTS_FILE,
	RoutingEvalOutput,
	type RoutingEvalMeta,
} from './routing-eval-results';
import {
	RoutingResultsWriter,
	toRoutingCaseResult,
	type RoutingResultsMeta,
} from './routing-results';
import { runDiscoveryScenario, type DiscoveryRunResult } from './runner';
import { buildSkillOverrideSource, type SkillOverrideRecord } from './skill-overrides';
import type { DiscoveryScenario, DiscoveryStreamStatus } from './types';
import { loadDiscoveryTestCasesWithFiles } from '../data/discovery';
import { buildTranscriptFromEvents } from '../outcome/transcript-from-events';
import { RoutingJudge, DEFAULT_JUDGE_CACHE_DIR } from '../routing/judge';
import { routingCaseDiff, routingTags } from '../routing/langtracer-cases';
import { loadRoutingCasesFromLangTracer } from '../routing/langtracer-source';
import {
	narrowToExactMatch,
	type LoadedRoutingCase,
	type RoutingCase,
	type RoutingCaseSelection,
} from '../routing/loader';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

/** With routing results, how long a timed-out stream may take to wind down and report usage. */
const SETTLE_GRACE_MS = 10_000;

function previewArgs(args: Record<string, unknown>): string {
	const entries = Object.entries(args).slice(0, 3);
	if (entries.length === 0) return '';
	return entries
		.map(([k, v]) => {
			let preview: string;
			if (typeof v === 'string') {
				preview = v.length > 40 ? `"${v.slice(0, 40)}…"` : `"${v}"`;
			} else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
				preview = String(v);
			} else if (Array.isArray(v)) {
				preview = `[${String(v.length)}]`;
			} else {
				preview = '{…}';
			}
			return `${k}=${preview}`;
		})
		.join(', ');
}

// ---------------------------------------------------------------------------
// Shared execution
// ---------------------------------------------------------------------------

interface CaseToRun {
	scenario: DiscoveryScenario;
	/** Case id. */
	label: string;
	/** Present in routing mode. */
	routingCase?: RoutingCase;
	/** Routing mode: the case file name without `.json`. */
	fileName?: string;
}

/** The parsed arguments plus what main() builds from them once. */
interface RunSettings {
	args: CliArgs;
	/** Built from `--skill-file`; absent runs the bundled skills. */
	skills?: { source: RuntimeSkillSource; records: Record<string, SkillOverrideRecord> };
}

async function runTrials(
	scenario: DiscoveryScenario,
	{ args, skills }: RunSettings,
): Promise<DiscoveryRunResult[]> {
	const keepsResults = args.jsonOut !== undefined || args.outputDir !== undefined;
	const trialResults: DiscoveryRunResult[] = [];
	for (let i = 0; i < args.trials; i += args.concurrency) {
		const batchSize = Math.min(args.concurrency, args.trials - i);
		const batch = await Promise.all(
			Array.from(
				{ length: batchSize },
				async () =>
					await runDiscoveryScenario({
						scenario,
						modelId: args.modelId,
						maxSteps: args.maxSteps,
						timeoutMs: args.timeoutMs,
						...(args.nodesJsonPath ? { nodesJsonPath: args.nodesJsonPath } : {}),
						...(args.stopOnRoute ? { stopOnRoute: true } : {}),
						...(keepsResults ? { settleGraceMs: SETTLE_GRACE_MS } : {}),
						...(skills ? { runtimeSkills: skills.source } : {}),
					}),
			),
		);
		trialResults.push(...batch);
	}
	return trialResults;
}

/**
 * Runs every case, `scenarioConcurrency` at a time. Sequential runs print the
 * case label before its trials start; concurrent runs print each case's report
 * in one piece when it finishes, so lines of different cases do not interleave.
 */
async function runCases(
	cases: CaseToRun[],
	settings: RunSettings,
	report: (entry: CaseToRun, results: DiscoveryRunResult[]) => string[],
	onCaseDone: (index: number, entry: CaseToRun, results: DiscoveryRunResult[]) => Promise<void>,
): Promise<DiscoveryRunResult[][]> {
	const { args } = settings;
	const allResults = new Array<DiscoveryRunResult[]>(cases.length);
	const sequential = args.scenarioConcurrency === 1;
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (nextIndex < cases.length) {
			const index = nextIndex++;
			const entry = cases[index];
			if (sequential) process.stdout.write(`▸ ${entry.label} ... `);
			const results = await runTrials(entry.scenario, settings);
			const lines = report(entry, results);
			if (sequential) {
				console.log(lines.join('\n'));
			} else {
				const [first = '', ...rest] = lines;
				console.log([`▸ ${entry.label} ... ${first}`, ...rest].join('\n'));
			}
			allResults[index] = results;
			await onCaseDone(index, entry, results);
		}
	}

	const workerCount = Math.min(args.scenarioConcurrency, cases.length);
	await Promise.all(Array.from({ length: workerCount }, async () => await worker()));
	return allResults;
}

function verboseTrialLines(results: DiscoveryRunResult[]): string[] {
	const lines: string[] = [];
	for (const [idx, r] of results.entries()) {
		const trial = `trial ${String(idx + 1)}`;
		const duration = `${(r.durationMs / 1000).toFixed(1)}s`;
		if (r.check) {
			const icon = r.check.pass ? '  ✓' : '  ✗';
			lines.push(`${icon} ${trial} (${duration}) — ${r.check.comment}`);
		} else {
			lines.push(`  • ${trial} (${duration}) — ${r.streamStatus}`);
		}
		if (r.runError) lines.push(`     run error: ${r.runError}`);
		if (r.outcome.toolCalls.length > 0) {
			lines.push('     tool calls:');
			for (const tc of r.outcome.toolCalls) {
				lines.push(`       • ${tc.toolName}(${previewArgs(tc.args)})`);
			}
		}
		if (r.outcome.agentActivities.length > 0) {
			lines.push('     spawned sub-agents:');
			for (const a of r.outcome.agentActivities) {
				lines.push(`       • role=${a.role}, tools=[${a.tools.join(', ')}]`);
			}
		}
	}
	return lines;
}

function resultsMeta({ args, skills }: RunSettings): RoutingResultsMeta {
	const startedAt = new Date().toISOString();
	return {
		runId: `${args.variant}-${startedAt.replace(/[:.]/g, '-')}-${nanoid(4)}`,
		variant: args.variant,
		model: args.modelId,
		...(skills ? { skillOverrides: skills.records } : {}),
		trialsPerCase: args.trials,
		stopOnRoute: args.stopOnRoute,
		startedAt,
	};
}

/** One writer per results file: `--json-out`, and `routing-results.json` under `--output-dir`. */
function createResultsWriters(
	{ args }: RunSettings,
	meta: RoutingResultsMeta,
	caseCount: number,
): RoutingResultsWriter[] {
	const paths = [
		...(args.jsonOut ? [args.jsonOut] : []),
		...(args.outputDir ? [join(args.outputDir, ROUTING_RESULTS_FILE)] : []),
	];
	return paths.map((path) => new RoutingResultsWriter(path, meta, caseCount));
}

// ---------------------------------------------------------------------------
// Local mode
// ---------------------------------------------------------------------------

interface ScenarioAggregate {
	scenario: DiscoveryScenario;
	results: DiscoveryRunResult[];
	passCount: number;
	passRate: number;
}

function passCountOf(results: DiscoveryRunResult[]): number {
	return results.filter((r) => r.check?.pass === true).length;
}

async function runLocalMode(settings: RunSettings): Promise<void> {
	const { args } = settings;
	const cases: CaseToRun[] = loadDiscoveryTestCasesWithFiles(args.filter).map(
		({ testCase, fileSlug }) => ({ scenario: testCase, label: fileSlug }),
	);

	if (cases.length === 0) {
		console.log('No discovery scenarios found.');
		return;
	}

	console.log(
		`Running ${String(cases.length)} discovery scenario(s) × ${String(args.trials)} trial(s) (model: ${args.modelId}, concurrency: ${String(args.concurrency)}).\n`,
	);

	const writers = createResultsWriters(settings, resultsMeta(settings), cases.length);

	// Per scenario, run trials in parallel up to `concurrency`. Across scenarios, run
	// `scenarioConcurrency` at a time (default 1: predictable load, atomic reports).
	const allResults = await runCases(
		cases,
		settings,
		(_entry, trialResults) => {
			const passCount = passCountOf(trialResults);
			const passRate = passCount / trialResults.length;
			const status = passRate >= args.passThreshold ? '✓' : '✗';
			return [
				`${status} ${String(passCount)}/${String(trialResults.length)} passed (${(passRate * 100).toFixed(0)}%)`,
				...(args.verbose ? verboseTrialLines(trialResults) : []),
			];
		},
		async (index, entry, results) => {
			const caseResult = toRoutingCaseResult(entry.scenario, undefined, results);
			await Promise.all(writers.map(async (writer) => await writer.record(index, caseResult)));
		},
	);
	await Promise.all(writers.map(async (writer) => await writer.finish()));

	const aggregates: ScenarioAggregate[] = cases.map((entry, index) => {
		const results = allResults[index];
		const passCount = passCountOf(results);
		return { scenario: entry.scenario, results, passCount, passRate: passCount / results.length };
	});

	printSummary(aggregates, args);
	for (const writer of writers) console.log(`\nResults written to ${writer.filePath}`);

	const failingScenarios = aggregates.filter((a) => a.passRate < args.passThreshold);
	const zeroPassScenarios = aggregates.filter((a) => a.passCount === 0);
	const shouldFail = args.failOnZeroPass
		? zeroPassScenarios.length > 0
		: failingScenarios.length > 0;
	if (shouldFail) {
		process.exitCode = 1;
	}
}

function printSummary(aggregates: ScenarioAggregate[], args: CliArgs): void {
	console.log('\n=== Summary ===');
	const totalTrials = aggregates.reduce((sum, a) => sum + a.results.length, 0);
	const totalPasses = aggregates.reduce((sum, a) => sum + a.passCount, 0);
	const passingScenarios = aggregates.filter((a) => a.passRate >= args.passThreshold).length;
	const totalDurationMs = aggregates
		.flatMap((a) => a.results)
		.reduce((sum, r) => sum + r.durationMs, 0);

	console.log(
		`Scenarios: ${String(passingScenarios)}/${String(aggregates.length)} above threshold (${(args.passThreshold * 100).toFixed(0)}%)`,
	);
	console.log(
		`Trials: ${String(totalPasses)}/${String(totalTrials)} passed (${((totalPasses / totalTrials) * 100).toFixed(0)}%)`,
	);
	console.log(`Total time: ${(totalDurationMs / 1000).toFixed(1)}s`);

	const failingScenarios = aggregates.filter((a) => a.passRate < args.passThreshold);
	if (failingScenarios.length > 0) {
		console.log('\nFailing scenarios:');
		for (const a of failingScenarios) {
			console.log(`  ✗ ${a.scenario.id} (${(a.passRate * 100).toFixed(0)}%)`);
			const firstFailure = a.results.find((r) => r.check?.pass !== true);
			if (firstFailure?.check) {
				console.log(`    ${firstFailure.check.comment}`);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Routing mode
// ---------------------------------------------------------------------------

function describeRoutingTrial(r: DiscoveryRunResult): string {
	const duration = `${(r.durationMs / 1000).toFixed(1)}s`;
	if (r.stop) return `stop@${r.stop.toolName} ${duration}`;
	if (r.runError) return `${r.streamStatus} ${duration} (${r.runError.slice(0, 80)})`;
	return `${r.streamStatus} ${duration}`;
}

function routingSelection(args: CliArgs): RoutingCaseSelection {
	return {
		...(args.filter !== undefined ? { filter: args.filter } : {}),
		...(args.exclude !== undefined ? { exclude: args.exclude } : {}),
		...(args.excludePrefix !== undefined ? { excludePrefix: args.excludePrefix } : {}),
	};
}

async function loadRoutingCasesForArgs(
	args: CliArgs,
): Promise<{ loaded: LoadedRoutingCase[]; origin: string }> {
	if (args.source === 'langtracer' && args.suite) {
		const { suite, cases } = await loadRoutingCasesFromLangTracer(
			args.suite,
			routingSelection(args),
		);
		return {
			loaded: narrowToExactMatch(cases, args.filter),
			origin: `LangTracer suite "${suite.slug}" (#${String(suite.id)})`,
		};
	}
	if (!args.casesDir) throw new Error('Routing mode needs --cases-dir <dir>.');
	return {
		loaded: loadRoutingCaseDir(args.casesDir, routingSelection(args)),
		origin: args.casesDir,
	};
}

/**
 * Compares loaded cases with the files in `dir`: the same ids, and for each id
 * the same routing fields and tags. Returns one line per difference.
 */
function compareWithDirectory(loaded: RoutingCase[], dir: string, args: CliArgs): string[] {
	const local = new Map(
		loadRoutingCaseDir(dir, routingSelection(args)).map(({ routingCase }) => [
			routingCase.id,
			routingCase,
		]),
	);
	const differences: string[] = [];
	const seen = new Set<string>();
	for (const routingCase of loaded) {
		seen.add(routingCase.id);
		const counterpart = local.get(routingCase.id);
		if (!counterpart) {
			differences.push(`${routingCase.id}: not in ${dir}`);
			continue;
		}
		const fields = routingCaseDiff(counterpart, routingCase);
		if (fields.length > 0) differences.push(`${routingCase.id}: differs in ${fields.join(', ')}`);
		const tags = routingTags(routingCase).join(' ');
		if (tags !== routingTags(counterpart).join(' ')) {
			differences.push(`${routingCase.id}: tags differ`);
		}
	}
	for (const id of local.keys()) {
		if (!seen.has(id)) differences.push(`${id}: missing from the loaded cases`);
	}
	return differences;
}

function countBy(values: string[]): string {
	const counts = new Map<string, number>();
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
	return [...counts]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, count]) => `${key}=${String(count)}`)
		.join(', ');
}

async function runRoutingMode(settings: RunSettings): Promise<void> {
	const { args } = settings;
	const { loaded, origin } = await loadRoutingCasesForArgs(args);
	const cases: CaseToRun[] = loaded.map(({ routingCase, scenario, fileName }) => ({
		scenario,
		label: routingCase.id,
		routingCase,
		...(fileName ? { fileName } : {}),
	}));
	if (args.saveCasesDir) {
		mkdirSync(args.saveCasesDir, { recursive: true });
		for (const { routingCase } of loaded) {
			const file = join(args.saveCasesDir, `${routingCase.id}.json`);
			writeFileSync(file, `${JSON.stringify(routingCase, null, 2)}\n`);
		}
		console.log(`Wrote ${String(loaded.length)} routing case file(s) to ${args.saveCasesDir}.`);
	}

	if (args.validateOnly) {
		const routingCases = loaded.map(({ routingCase }) => routingCase);
		console.log(`${String(cases.length)} routing case(s) in ${origin} are valid.`);
		if (routingCases.length > 0) {
			console.log(`  buckets: ${countBy(routingCases.map((c) => c.bucket))}`);
			const seeded = routingCases.filter((c) => c.seed !== undefined).length;
			const attached = routingCases.filter((c) => c.attach !== undefined).length;
			console.log(`  seeded: ${String(seeded)}, attached: ${String(attached)}`);
		}
		if (args.compareDir) {
			const differences = compareWithDirectory(routingCases, args.compareDir, args);
			if (differences.length === 0) {
				console.log(`  matches ${args.compareDir}: same ids, fields, and tags`);
			} else {
				console.error(`  ${String(differences.length)} difference(s) from ${args.compareDir}:`);
				for (const line of differences) console.error(`    - ${line}`);
				process.exitCode = 1;
			}
		}
		return;
	}
	if (cases.length === 0) {
		console.log(`No routing cases found in ${origin}.`);
		return;
	}

	if (!args.jsonOut && !args.outputDir) {
		console.warn('Warning: no --json-out or --output-dir given; results will only be printed.');
	}

	console.log(
		`Running ${String(cases.length)} routing case(s) × ${String(args.trials)} trial(s) (variant: ${args.variant}, model: ${args.modelId}, stop-on-route: ${String(args.stopOnRoute)}, scenario concurrency: ${String(args.scenarioConcurrency)}, trial concurrency: ${String(args.concurrency)}).\n`,
	);

	const meta = resultsMeta(settings);
	const writers = createResultsWriters(settings, meta, cases.length);
	const evalOutput = args.outputDir
		? new RoutingEvalOutput(
				args.outputDir,
				new RoutingJudge({
					cacheDir: args.judgeCacheDir ?? DEFAULT_JUDGE_CACHE_DIR,
					apiKey: process.env.ANTHROPIC_API_KEY,
				}),
				meta satisfies RoutingEvalMeta,
				cases.length,
			)
		: undefined;

	const allResults = await runCases(
		cases,
		settings,
		(entry, results) => [
			`[${entry.routingCase?.bucket ?? '?'}] ${results.map(describeRoutingTrial).join(' | ')}`,
			...(args.verbose ? verboseTrialLines(results) : []),
		],
		async (index, entry, results) => {
			const caseResult = toRoutingCaseResult(entry.scenario, entry.routingCase, results);
			await Promise.all(writers.map(async (writer) => await writer.record(index, caseResult)));
			if (!evalOutput || !entry.routingCase) return;
			const graded = await evalOutput.record(index, {
				routingCase: entry.routingCase,
				...(entry.fileName ? { fileName: entry.fileName } : {}),
				result: caseResult,
				threadIds: results.map((r) => r.threadId),
				transcripts: results.map((r) =>
					buildTranscriptFromEvents({
						events: r.events,
						openingMessage: entry.scenario.userMessage,
					}),
				),
			});
			const labels = graded.graded?.trials.map((trial) => trial.label).join(', ') ?? 'not graded';
			console.log(`  ${entry.label}: graded ${labels}`);
		},
	);
	await Promise.all(writers.map(async (writer) => await writer.finish()));
	const evalResults = await evalOutput?.finish();

	const trials = allResults.flat();
	printRoutingSummary(trials);
	for (const writer of writers) console.log(`\nResults written to ${writer.filePath}`);
	if (evalOutput && evalResults) {
		const { passed, testCases, notVerified } = evalResults.summary;
		console.log(
			`Graded: ${String(passed)}/${String(testCases)} case(s) passed, ${String(notVerified)} not verified.`,
		);
		console.log(`Eval results written to ${evalOutput.evalResultsPath}`);
		console.log(`Summary written to ${evalOutput.summaryPath}`);
	}

	if (trials.length > 0 && trials.every((r) => r.streamStatus === 'errored')) {
		process.exitCode = 1;
	}
}

function printRoutingSummary(trials: DiscoveryRunResult[]): void {
	console.log('\n=== Summary ===');
	const byStatus = new Map<DiscoveryStreamStatus, number>();
	const byStopTool = new Map<string, number>();
	let inputTokens = 0;
	let outputTokens = 0;
	let costUsd = 0;
	let withUsage = 0;
	for (const r of trials) {
		byStatus.set(r.streamStatus, (byStatus.get(r.streamStatus) ?? 0) + 1);
		if (r.stop) byStopTool.set(r.stop.toolName, (byStopTool.get(r.stop.toolName) ?? 0) + 1);
		if (r.usage) {
			withUsage++;
			inputTokens += r.usage.promptTokens;
			outputTokens += r.usage.completionTokens;
			costUsd += r.usage.costUsd;
		}
	}
	const format = (counts: Map<string, number>) =>
		[...counts].map(([key, count]) => `${key}=${String(count)}`).join(', ') || '∅';

	console.log(`Trials: ${String(trials.length)} (${format(byStatus)})`);
	console.log(`Stopped on: ${format(byStopTool)}`);
	console.log(
		`Total trial time: ${(trials.reduce((sum, r) => sum + r.durationMs, 0) / 1000).toFixed(1)}s`,
	);
	if (withUsage > 0) {
		console.log(
			`Orchestrator tokens (${String(withUsage)} trial(s) with usage): input=${String(inputTokens)}, output=${String(outputTokens)}, cost=$${costUsd.toFixed(2)}`,
		);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function exitWithError(error: unknown): never {
	console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
}

async function main(): Promise<void> {
	let args: CliArgs;
	try {
		args = parseCliArgs(process.argv.slice(2));
	} catch (error) {
		exitWithError(error);
	}
	if (args.help) {
		console.log(USAGE);
		return;
	}

	if (!args.validateOnly && !process.env.ANTHROPIC_API_KEY) {
		console.error(
			'Error: ANTHROPIC_API_KEY is required to run discovery evaluations (the runner calls Anthropic in-process).',
		);
		process.exit(1);
	}

	const settings: RunSettings = { args };
	let skills: RunSettings['skills'];
	try {
		skills = buildSkillOverrideSource(args.skillFiles);
	} catch (error) {
		exitWithError(error);
	}
	if (skills) {
		settings.skills = skills;
		for (const [skillId, record] of Object.entries(skills.records)) {
			console.log(`Skill override: ${skillId} <- ${record.path}`);
		}
	}

	if (isRoutingMode(args)) {
		await runRoutingMode(settings);
		return;
	}
	await runLocalMode(settings);
}

main()
	.then(() => {
		process.stdout.write('', () => process.exit(process.exitCode ?? 0));
	})
	.catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
