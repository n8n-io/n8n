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
// non-zero on any scenario below threshold.
// ---------------------------------------------------------------------------

import { runDiscoveryScenario, type DiscoveryRunResult } from './runner';
import type { DiscoveryTestCase } from './types';
import { loadDiscoveryTestCasesWithFiles } from '../data/discovery';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

interface CliArgs {
	filter?: string;
	verbose: boolean;
	trials: number;
	passThreshold: number;
	timeoutMs: number;
	maxSteps: number;
	modelId: string;
	concurrency: number;
	nodesJsonPath?: string;
}

const DEFAULT_MODEL = process.env.N8N_INSTANCE_AI_EVAL_MODEL ?? 'anthropic/claude-sonnet-4-6';

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

function requirePositiveInt(raw: string | undefined, flag: string): number {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
		console.error(`Invalid value for ${flag}: ${String(raw)} (expected a positive integer)`);
		process.exit(1);
	}
	return n;
}

function requireNumberInRange(
	raw: string | undefined,
	flag: string,
	lo: number,
	hi: number,
): number {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < lo || n > hi) {
		console.error(`Invalid value for ${flag}: ${String(raw)} (expected number in [${lo}, ${hi}])`);
		process.exit(1);
	}
	return n;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		verbose: false,
		trials: 3,
		passThreshold: 2 / 3,
		timeoutMs: 60_000,
		maxSteps: 5,
		modelId: DEFAULT_MODEL,
		concurrency: 3,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		switch (arg) {
			case '--verbose':
			case '-v':
				args.verbose = true;
				break;
			case '--filter':
				args.filter = argv[++i];
				break;
			case '--trials':
				args.trials = requirePositiveInt(argv[++i], '--trials');
				break;
			case '--pass-threshold':
				args.passThreshold = requireNumberInRange(argv[++i], '--pass-threshold', 0, 1);
				break;
			case '--timeout':
				args.timeoutMs = requirePositiveInt(argv[++i], '--timeout');
				break;
			case '--max-steps':
				args.maxSteps = requirePositiveInt(argv[++i], '--max-steps');
				break;
			case '--model':
				args.modelId = argv[++i];
				break;
			case '--concurrency':
				args.concurrency = requirePositiveInt(argv[++i], '--concurrency');
				break;
			case '--nodes-json':
				args.nodesJsonPath = argv[++i];
				break;
			default:
				break;
		}
	}

	return args;
}

// ---------------------------------------------------------------------------
// Local mode
// ---------------------------------------------------------------------------

interface ScenarioAggregate {
	scenario: DiscoveryTestCase;
	results: DiscoveryRunResult[];
	passCount: number;
	passRate: number;
}

async function runLocalMode(args: CliArgs): Promise<void> {
	const cases = loadDiscoveryTestCasesWithFiles(args.filter);

	if (cases.length === 0) {
		console.log('No discovery scenarios found.');
		return;
	}

	console.log(
		`Running ${String(cases.length)} discovery scenario(s) × ${String(args.trials)} trial(s) (model: ${args.modelId}, concurrency: ${String(args.concurrency)}).\n`,
	);

	const aggregates: ScenarioAggregate[] = [];

	// Per scenario, run trials in parallel up to `concurrency`. Across scenarios, run sequentially
	// — keeps the load profile predictable and per-scenario reports atomic.
	for (const { testCase, fileSlug } of cases) {
		process.stdout.write(`▸ ${fileSlug} ... `);
		const trialResults: DiscoveryRunResult[] = [];

		for (let i = 0; i < args.trials; i += args.concurrency) {
			const batchSize = Math.min(args.concurrency, args.trials - i);
			const batch = await Promise.all(
				Array.from(
					{ length: batchSize },
					async () =>
						await runDiscoveryScenario({
							scenario: testCase,
							modelId: args.modelId,
							maxSteps: args.maxSteps,
							timeoutMs: args.timeoutMs,
							...(args.nodesJsonPath ? { nodesJsonPath: args.nodesJsonPath } : {}),
						}),
				),
			);
			trialResults.push(...batch);
		}

		const passCount = trialResults.filter((r) => r.check.pass).length;
		const passRate = passCount / trialResults.length;
		const status = passRate >= args.passThreshold ? '✓' : '✗';
		console.log(
			`${status} ${String(passCount)}/${String(trialResults.length)} passed (${(passRate * 100).toFixed(0)}%)`,
		);

		if (args.verbose) {
			for (const [idx, r] of trialResults.entries()) {
				const icon = r.check.pass ? '  ✓' : '  ✗';
				const trial = `trial ${String(idx + 1)}`;
				console.log(`${icon} ${trial} (${(r.durationMs / 1000).toFixed(1)}s) — ${r.check.comment}`);
				if (r.runError) console.log(`     run error: ${r.runError}`);
				if (r.outcome.toolCalls.length > 0) {
					console.log('     tool calls:');
					for (const tc of r.outcome.toolCalls) {
						const argsPreview = previewArgs(tc.args);
						console.log(`       • ${tc.toolName}(${argsPreview})`);
					}
				}
				if (r.outcome.agentActivities.length > 0) {
					console.log('     spawned sub-agents:');
					for (const a of r.outcome.agentActivities) {
						console.log(`       • role=${a.role}, tools=[${a.tools.join(', ')}]`);
					}
				}
			}
		}

		aggregates.push({ scenario: testCase, results: trialResults, passCount, passRate });
	}

	printSummary(aggregates, args);

	const failingScenarios = aggregates.filter((a) => a.passRate < args.passThreshold);
	if (failingScenarios.length > 0) {
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
			const firstFailure = a.results.find((r) => !r.check.pass);
			if (firstFailure) {
				console.log(`    ${firstFailure.check.comment}`);
			}
		}
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	if (!process.env.ANTHROPIC_API_KEY) {
		console.error(
			'Error: ANTHROPIC_API_KEY is required to run discovery evaluations (the runner calls Anthropic in-process).',
		);
		process.exit(1);
	}

	await runLocalMode(args);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
