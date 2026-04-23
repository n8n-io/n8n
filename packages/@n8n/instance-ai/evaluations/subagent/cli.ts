#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CLI for isolated sub-agent evaluation
//
// Usage:
//   pnpm eval:subagent --verbose
//   pnpm eval:subagent --filter webhook --verbose
//   pnpm eval:subagent --prompt "Build a webhook workflow" --subagent builder
//   pnpm eval:subagent --dataset my-dataset --experiment my-exp --verbose
// ---------------------------------------------------------------------------

import { Client } from 'langsmith/client';
import { evaluate } from 'langsmith/evaluation';
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

import { createFeedbackExtractor, mapExampleToTestCase } from './langsmith';
import { runSubAgent, type RunSubAgentDeps } from './runner';
import type { SubAgentTestCase, SubAgentRunnerConfig, SubAgentResult } from './types';
import { N8nClient } from '../clients/n8n-client';

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

interface CliArgs {
	filter?: string;
	verbose: boolean;
	timeoutMs: number;
	maxSteps: number;
	modelId?: string;
	subagent: string;
	prompt?: string;
	dataset?: string;
	experiment?: string;
	concurrency: number;
	baseUrl: string;
	keepWorkflows: boolean;
}

function requirePositiveInt(raw: string | undefined, flag: string): number {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
		console.error(`Invalid value for ${flag}: ${String(raw)} (expected a positive integer)`);
		process.exit(1);
	}
	return n;
}

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		verbose: false,
		timeoutMs: 120_000,
		maxSteps: 40,
		modelId: process.env.N8N_INSTANCE_AI_EVAL_MODEL,
		subagent: 'builder',
		concurrency: 5,
		baseUrl: process.env.N8N_EVAL_BASE_URL ?? 'http://localhost:5678',
		keepWorkflows: false,
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
			case '--timeout':
				args.timeoutMs = requirePositiveInt(argv[++i], '--timeout');
				break;
			case '--max-steps':
				args.maxSteps = requirePositiveInt(argv[++i], '--max-steps');
				break;
			case '--model':
				args.modelId = argv[++i];
				break;
			case '--subagent':
				args.subagent = argv[++i];
				break;
			case '--prompt':
				args.prompt = argv[++i];
				break;
			case '--dataset':
				args.dataset = argv[++i];
				break;
			case '--experiment':
				args.experiment = argv[++i];
				break;
			case '--concurrency':
				args.concurrency = requirePositiveInt(argv[++i], '--concurrency');
				break;
			case '--base-url':
				args.baseUrl = argv[++i];
				break;
			case '--keep-workflows':
				args.keepWorkflows = true;
				break;
			default:
				break;
		}
	}

	return args;
}

// ---------------------------------------------------------------------------
// Dataset loading (local JSON files)
// ---------------------------------------------------------------------------

const DATA_DIR = join(__dirname, '..', 'data', 'subagent');

function loadLocalTestCases(filter?: string, subagent?: string): SubAgentTestCase[] {
	let files: string[];
	try {
		files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
	} catch {
		console.error(`No test cases found in ${DATA_DIR}`);
		return [];
	}

	if (filter) {
		files = files.filter((f) => f.includes(filter));
	}

	const cases: SubAgentTestCase[] = [];
	for (const file of files) {
		const raw = readFileSync(join(DATA_DIR, file), 'utf-8');
		let parsed: {
			id?: string;
			prompt: string;
			subagent?: string;
			systemPrompt?: string;
			tools?: string[];
			maxSteps?: number;
			annotations?: Record<string, unknown>;
		};
		try {
			parsed = JSON.parse(raw) as typeof parsed;
		} catch {
			console.error(`Failed to parse ${file}`);
			continue;
		}
		const tc: SubAgentTestCase = {
			id: parsed.id ?? basename(file, '.json'),
			prompt: parsed.prompt,
		};
		const resolvedSubagent = parsed.subagent ?? subagent;
		if (resolvedSubagent) tc.subagent = resolvedSubagent;
		if (parsed.systemPrompt) tc.systemPrompt = parsed.systemPrompt;
		if (parsed.tools) tc.tools = parsed.tools;
		if (parsed.maxSteps) tc.maxSteps = parsed.maxSteps;
		if (parsed.annotations) tc.annotations = parsed.annotations;
		cases.push(tc);
	}
	return cases;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
	return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

function printResult(result: SubAgentResult, verbose: boolean): void {
	const { testCase, capturedWorkflows, feedback, durationMs, error } = result;
	const secs = (durationMs / 1000).toFixed(1);

	const workflowCount = capturedWorkflows.length;
	const binaryPassRate = feedback.find(
		(f) => f.evaluator === 'binary-checks' && f.metric === 'pass_rate',
	);
	const produced = feedback.find((f) => f.metric === 'workflow_produced');

	const statusIcon = error ? '\u2717' : produced?.score === 1 ? '\u2713' : '\u25CB';
	const passRateStr = binaryPassRate ? `${(binaryPassRate.score * 100).toFixed(0)}%` : 'N/A';

	console.log(
		`${statusIcon} ${testCase.id} (${secs}s) — ${String(workflowCount)} workflow(s), binary checks: ${passRateStr}`,
	);

	if (error) {
		console.log(`  Error: ${truncate(error, 200)}`);
	}

	if (verbose) {
		const checks = feedback.filter((f) => f.evaluator === 'binary-checks' && f.kind === 'metric');
		for (const check of checks) {
			const icon = check.score === 1 ? '  \u2713' : '  \u2717';
			const comment = check.comment ? ` — ${check.comment}` : '';
			console.log(`${icon} ${check.metric}${comment}`);
		}

		if (result.capturedWorkflows.length > 0) {
			console.log('  Workflow: ', result.capturedWorkflows[0].json);
		}

		if (result.text) {
			console.log(`  Agent: ${truncate(result.text, 300)}`);
		}
		console.log('');
	}
}

function printSummary(results: SubAgentResult[]): void {
	const passed = results.filter((r) => !r.error && r.capturedWorkflows.length > 0).length;
	const failed = results.length - passed;
	const avgDuration = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

	console.log('\n=== Summary ===');
	console.log(
		`Total: ${String(results.length)}, Produced workflow: ${String(passed)}, Failed: ${String(failed)}`,
	);
	console.log(`Average duration: ${(avgDuration / 1000).toFixed(1)}s`);
}

// ---------------------------------------------------------------------------
// LangSmith mode
// ---------------------------------------------------------------------------

async function runLangsmithMode(
	args: CliArgs,
	config: SubAgentRunnerConfig,
	deps: RunSubAgentDeps,
): Promise<void> {
	const apiKey = process.env.LANGSMITH_API_KEY;
	if (!apiKey) {
		console.error('Error: LANGSMITH_API_KEY is required for --dataset mode');
		process.exit(1);
	}

	const lsClient = new Client({ apiKey });

	const target = async (inputs: Record<string, unknown>) => {
		const testCase = mapExampleToTestCase(inputs);
		testCase.subagent ??= args.subagent;
		const result = await runSubAgent(testCase, config, deps);

		return {
			prompt: testCase.prompt,
			subagent: testCase.subagent ?? 'builder',
			text: result.text,
			workflow: result.capturedWorkflows[0]?.json ?? null,
			feedback: result.feedback,
			durationMs: result.durationMs,
			error: result.error,
		};
	};

	console.log('Running LangSmith evaluation:');
	console.log(`  Dataset: ${args.dataset!}`);
	console.log(`  Experiment: ${args.experiment ?? '(auto-generated)'}`);
	console.log(`  Sub-agent: ${args.subagent}`);
	console.log(`  Concurrency: ${String(args.concurrency)}`);
	console.log('');

	const experimentResults = await evaluate(target, {
		data: args.dataset!,
		evaluators: [createFeedbackExtractor()],
		experimentPrefix: args.experiment,
		maxConcurrency: args.concurrency,
		client: lsClient,
		metadata: {
			subagent: args.subagent,
			modelId: config.modelId,
			maxSteps: config.maxSteps,
			timeoutMs: config.timeoutMs,
		},
	});

	await lsClient.awaitPendingTraceBatches();

	const experimentName =
		'experimentName' in experimentResults
			? String(experimentResults.experimentName)
			: (args.experiment ?? 'unknown');

	console.log(`\nExperiment complete: ${experimentName}`);
}

// ---------------------------------------------------------------------------
// Local mode (sequential, with optional single prompt)
// ---------------------------------------------------------------------------

async function runLocalMode(
	args: CliArgs,
	config: SubAgentRunnerConfig,
	deps: RunSubAgentDeps,
): Promise<void> {
	let testCases: SubAgentTestCase[];

	if (args.prompt) {
		testCases = [
			{
				id: 'cli-prompt',
				prompt: args.prompt,
				subagent: args.subagent,
			},
		];
	} else {
		testCases = loadLocalTestCases(args.filter, args.subagent);
	}

	if (testCases.length === 0) {
		console.log('No test cases found.');
		return;
	}

	console.log(
		`Running ${String(testCases.length)} sub-agent test case(s) with model ${config.modelId ?? '<server default>'} (concurrency: ${String(args.concurrency)})\n`,
	);

	const results: SubAgentResult[] = [];

	// Concurrency=1 falls through the same batched path (batch size 1, strictly sequential).
	for (let i = 0; i < testCases.length; i += args.concurrency) {
		const batch = testCases.slice(i, i + args.concurrency);

		if (args.verbose) {
			for (const tc of batch) {
				console.log(`Starting: ${tc.id} — ${truncate(tc.prompt, 80)}`);
			}
		}

		const batchResults = await Promise.all(
			batch.map(async (testCase) => await runSubAgent(testCase, config, deps)),
		);

		for (const result of batchResults) {
			results.push(result);
			printResult(result, args.verbose);
		}
	}

	printSummary(results);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	const config: SubAgentRunnerConfig = {
		modelId: args.modelId,
		timeoutMs: args.timeoutMs,
		maxSteps: args.maxSteps,
		verbose: args.verbose,
	};

	const client = new N8nClient(args.baseUrl);
	await client.login();

	const deps: RunSubAgentDeps = { client, deleteAfterRun: !args.keepWorkflows };

	if (args.dataset) {
		await runLangsmithMode(args, config, deps);
	} else {
		await runLocalMode(args, config, deps);
	}
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
