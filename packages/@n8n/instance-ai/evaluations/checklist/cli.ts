import { extractChecklist, clearCache, saveCommittedChecklists } from './checklist';
import { runSingleExample, type RunnerConfig } from './runner';
import { runLangsmithEval } from './langsmith-runner';
import { generateReferences } from './generate-references';
import { writeReport } from './report';
import { saveRun, listRuns } from './storage';
import { SYNTHETIC_PROMPTS } from './synthetic-prompts';
import { N8nClient } from './n8n-client';
import { seedEvalCredentials, cleanupEvalCredentials, snapshotWorkflowIds } from './verification';
import type { Run, PromptConfig, ChecklistItem, InstanceAiResult } from './types';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
	maxExamples: number;
	tags: string[];
	grep: string;
	concurrency: number;
	timeoutMs: number;
	verbose: boolean;
	n8nBaseUrl: string;
	n8nBaseUrls: string[];
	complexity: string;
	langsmith: boolean;
	dataset: string;
	experimentName: string;
	skipExecutionEval: boolean;
	shard: string;
}

function parseArgs(args: string[]): CliArgs {
	const result: CliArgs = {
		maxExamples: 0,
		tags: [],
		grep: '',
		concurrency: 3,
		timeoutMs: 10 * 60 * 1000,
		verbose: false,
		n8nBaseUrl: 'http://localhost:5678',
		n8nBaseUrls: [],
		complexity: '',
		langsmith: false,
		dataset: '',
		experimentName: '',
		skipExecutionEval: false,
		shard: '',
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--max-examples':
				result.maxExamples = parseInt(args[++i], 10);
				break;
			case '--tags':
				result.tags = args[++i].split(',');
				break;
			case '--grep':
				result.grep = args[++i];
				break;
			case '--concurrency':
				result.concurrency = parseInt(args[++i], 10);
				break;
			case '--timeout':
				result.timeoutMs = parseInt(args[++i], 10) * 1000;
				break;
			case '--verbose':
				result.verbose = true;
				break;
			case '--n8n-url':
				result.n8nBaseUrl = args[++i];
				break;
			case '--complexity':
				result.complexity = args[++i];
				break;
			case '--langsmith':
				result.langsmith = true;
				break;
			case '--dataset':
				result.dataset = args[++i];
				break;
			case '--name':
				result.experimentName = args[++i];
				break;
			case '--skip-execution-eval':
				result.skipExecutionEval = true;
				break;
			case '--n8n-urls':
				result.n8nBaseUrls = args[++i].split(',').map((u) => u.trim());
				break;
			case '--shard':
				result.shard = args[++i];
				break;
		}
	}

	return result;
}

// ---------------------------------------------------------------------------
// Prompt filtering
// ---------------------------------------------------------------------------

function filterPrompts(prompts: PromptConfig[], args: CliArgs): PromptConfig[] {
	let filtered = prompts;

	if (args.tags.length > 0) {
		filtered = filtered.filter((p) => args.tags.some((tag) => p.tags?.includes(tag)));
	}

	if (args.grep) {
		filtered = filtered.filter((p) => p.text.toLowerCase().includes(args.grep.toLowerCase()));
	}

	if (args.complexity) {
		filtered = filtered.filter((p) => p.complexity === args.complexity);
	}

	if (args.maxExamples > 0) {
		filtered = filtered.slice(0, args.maxExamples);
	}

	// Apply sharding: --shard M/N keeps every Nth prompt starting at index M-1
	if (args.shard) {
		const match = args.shard.match(/^(\d+)\/(\d+)$/);
		if (match) {
			const shardIndex = parseInt(match[1], 10) - 1;
			const shardCount = parseInt(match[2], 10);
			if (shardCount > 0 && shardIndex >= 0 && shardIndex < shardCount) {
				filtered = filtered.filter((_, i) => i % shardCount === shardIndex);
			}
		}
	}

	return filtered;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function regenerateReport() {
	console.log('Regenerating report from saved runs...');
	const allRuns = listRuns();
	if (allRuns.length === 0) {
		console.log('No runs found. Nothing to generate.');
		return;
	}
	writeReport(allRuns);
	console.log(`Report written (${String(allRuns.length)} run(s))`);
}

async function refreshChecklists() {
	const args = parseArgs(process.argv.slice(3));
	const prompts = filterPrompts(SYNTHETIC_PROMPTS, args);

	console.log('=== Refresh Checklists ===');
	const deleted = clearCache();
	console.log(`Cleared ${String(deleted)} cached checklist(s)\n`);
	console.log(`Extracting checklists for ${String(prompts.length)} prompt(s)...\n`);

	for (const prompt of prompts) {
		const label = prompt.text.length > 80 ? prompt.text.slice(0, 80) + '...' : prompt.text;
		console.log(`--- ${label} ---`);
		const checklist = await extractChecklist(prompt.text);
		for (const item of checklist) {
			console.log(`  [${item.category}] ${item.item}`);
		}
		console.log(`  (${String(checklist.length)} items)\n`);
	}

	console.log('Done.');
}

async function commitChecklists() {
	const args = parseArgs(process.argv.slice(3));
	const prompts = filterPrompts(SYNTHETIC_PROMPTS, args);

	console.log('=== Commit Checklists ===');
	console.log(`Extracting checklists for ${String(prompts.length)} prompt(s)...\n`);

	const entries: Array<{ prompt: string; checklist: ChecklistItem[] }> = [];

	for (const prompt of prompts) {
		const label = prompt.text.length > 80 ? prompt.text.slice(0, 80) + '...' : prompt.text;
		process.stdout.write(`  "${label}"  `);
		const checklist = await extractChecklist(prompt.text);
		entries.push({ prompt: prompt.text, checklist });
		console.log(`${String(checklist.length)} items`);
	}

	saveCommittedChecklists(entries);
	console.log(`\nSaved ${String(entries.length)} checklist(s) to committed-checklists.json`);
	console.log('Commit this file to git for consistent evaluations across runs.');
}

async function runGenerateReferencesCmd() {
	const args = parseArgs(process.argv.slice(3));

	if (!args.dataset) {
		console.error('Error: --dataset <name> is required');
		console.error('  e.g. generate-references --dataset instance-ai-builder');
		process.exit(1);
	}

	console.log('=== Instance AI — Generate Golden References ===\n');

	await generateReferences({
		datasetName: args.dataset,
		n8nBaseUrl: args.n8nBaseUrl,
		timeoutMs: args.timeoutMs,
		verbose: args.verbose,
		overwrite: process.argv.includes('--overwrite'),
		maxExamples: args.maxExamples > 0 ? args.maxExamples : undefined,
	});
}

async function runLangsmithEvalCmd() {
	const args = parseArgs(process.argv.slice(2));

	if (!args.dataset) {
		console.error('Error: --dataset <name> is required in LangSmith mode');
		console.error('  e.g. --dataset instance-ai-general-agent');
		process.exit(1);
	}

	const experimentName =
		args.experimentName ||
		`${args.dataset}_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}`;

	console.log('=== Instance AI — LangSmith Checklist Eval ===');
	console.log(`Dataset: ${args.dataset}`);
	console.log(`Experiment: ${experimentName}`);
	console.log(`Concurrency: ${String(args.concurrency)}`);
	console.log(`Timeout: ${String(args.timeoutMs / 1000)}s`);
	console.log(`n8n URL: ${args.n8nBaseUrl}`);
	if (args.maxExamples > 0) console.log(`Max examples: ${String(args.maxExamples)}`);
	console.log('');

	await runLangsmithEval({
		datasetName: args.dataset,
		experimentName,
		n8nBaseUrl: args.n8nBaseUrl,
		concurrency: args.concurrency,
		timeoutMs: args.timeoutMs,
		verbose: args.verbose,
		maxExamples: args.maxExamples > 0 ? args.maxExamples : undefined,
	});
}

async function runEval() {
	const args = parseArgs(process.argv.slice(2));
	const prompts = filterPrompts(SYNTHETIC_PROMPTS, args);

	// Resolve n8n URLs: --n8n-urls takes precedence, fallback to --n8n-url
	const n8nUrls = args.n8nBaseUrls.length > 0 ? args.n8nBaseUrls : [args.n8nBaseUrl];

	console.log('=== Instance AI — Checklist Eval ===');
	console.log(`Prompts: ${String(prompts.length)}`);
	console.log(`Concurrency: ${String(args.concurrency)}`);
	console.log(`Timeout: ${String(args.timeoutMs / 1000)}s`);
	console.log(`n8n URL(s): ${n8nUrls.join(', ')}`);
	if (args.shard) console.log(`Shard: ${args.shard}`);
	if (args.complexity) console.log(`Complexity: ${args.complexity}`);
	if (args.tags.length > 0) console.log(`Tags: ${args.tags.join(', ')}`);
	if (args.grep) console.log(`Grep: ${args.grep}`);
	console.log('');

	// Create and authenticate a client for each n8n URL
	console.log(`Authenticating with ${String(n8nUrls.length)} n8n instance(s)...`);
	const n8nClients: N8nClient[] = [];
	const allSeededCredentialIds: Array<{ client: N8nClient; ids: string[] }> = [];
	let seededCredentialTypes: string[] = [];

	for (const url of n8nUrls) {
		const client = new N8nClient(url);
		await client.login();
		const seedResult = await seedEvalCredentials(client, prompts);
		n8nClients.push(client);
		allSeededCredentialIds.push({ client, ids: seedResult.credentialIds });
		seededCredentialTypes = seedResult.seededTypes;
		console.log(
			`  ${url}: authenticated, ${String(seedResult.credentialIds.length)} credential(s) seeded`,
		);
	}

	const run: Run = {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		status: 'running',
		config: { prompts, n8nBaseUrl: n8nUrls[0] },
		results: [],
	};

	saveRun(run);

	try {
		// Phase 1: Extract checklists
		console.log('\nPhase 1: Extracting checklists...');
		const checklistMap = new Map<string, ChecklistItem[]>();
		for (const prompt of prompts) {
			process.stdout.write(`  Extracting: "${prompt.text.slice(0, 60)}..."  `);
			const checklist = await extractChecklist(prompt.text);
			checklistMap.set(prompt.text, checklist);
			console.log(`${String(checklist.length)} items`);
		}

		// Phase 2: Run examples in batches
		console.log(`\nPhase 2: Running ${String(prompts.length)} examples...`);

		const tasks = prompts.map((prompt) => ({
			prompt,
			checklist: checklistMap.get(prompt.text) ?? [],
		}));

		const results: InstanceAiResult[] = [];

		for (let i = 0; i < tasks.length; i += args.concurrency) {
			const batch = tasks.slice(i, i + args.concurrency);
			const batchNum = Math.floor(i / args.concurrency) + 1;
			const totalBatches = Math.ceil(tasks.length / args.concurrency);
			console.log(`\n  Batch ${String(batchNum)}/${String(totalBatches)}:`);

			// Take snapshots per n8n instance. Each instance has its own workflow namespace.
			const snapshotsPerClient = new Map<N8nClient, Set<string>>();
			for (const client of n8nClients) {
				snapshotsPerClient.set(client, await snapshotWorkflowIds(client));
			}
			const batchClaimedIds = new Set<string>();

			const batchResults = await Promise.allSettled(
				batch.map(async ({ prompt, checklist }, batchIdx) => {
					// Round-robin: assign each task to an n8n instance
					const clientIdx = (i + batchIdx) % n8nClients.length;
					const client = n8nClients[clientIdx];
					const snapshot = snapshotsPerClient.get(client) ?? new Set<string>();

					const taskRunnerConfig: RunnerConfig = {
						n8nClient: client,
						timeoutMs: args.timeoutMs,
						verbose: args.verbose,
						autoApprove: true,
						skipExecutionEval: args.skipExecutionEval,
						seededCredentialTypes,
						preRunWorkflowIds: snapshot,
						claimedWorkflowIds: batchClaimedIds,
					};

					const label = `"${prompt.text.slice(0, 50)}..."`;
					const urlLabel = n8nClients.length > 1 ? ` [${n8nUrls[clientIdx]}]` : '';
					console.log(`    Starting: ${label}${urlLabel}`);

					const result = await runSingleExample(taskRunnerConfig, prompt, checklist);

					const scoreStr = `${(result.checklistScore * 100).toFixed(0)}%`;
					const successStr = result.success ? 'PASS' : 'FAIL';
					const toolCalls = String(result.metrics.totalToolCalls);
					const subAgents = String(result.metrics.subAgentsSpawned);
					console.log(
						`    Done: ${label} — ${successStr}, Score: ${scoreStr}, Tools: ${toolCalls}, Sub-agents: ${subAgents}`,
					);

					return result;
				}),
			);

			for (const r of batchResults) {
				if (r.status === 'fulfilled') {
					results.push(r.value);
				} else {
					console.error(`    Failed:`, r.reason);
				}
			}

			// Save progress after each batch
			run.results = results;
			saveRun(run);
			writeReport(listRuns());
		}

		run.results = results;
		run.status = 'completed';
	} catch (err) {
		console.error('Pipeline error:', err);
		run.status = 'failed';
	} finally {
		// Cleanup credentials on all instances
		for (const { client, ids } of allSeededCredentialIds) {
			await cleanupEvalCredentials(client, ids).catch(() => {});
		}
	}

	saveRun(run);

	// Regenerate report
	console.log('\nGenerating report...');
	writeReport(listRuns());

	// Summary
	printSummary(run);

	console.log(`\nReport: evaluations/.data/instance-ai-report.html`);
	console.log(`Run: evaluations/.data/instance-ai-runs/${run.id}.json`);
}

// ---------------------------------------------------------------------------
// Summary output
// ---------------------------------------------------------------------------

function printSummary(run: Run): void {
	console.log('\n=== Summary ===');
	console.log(`Status: ${run.status}`);
	console.log(`Results: ${String(run.results.length)}`);

	if (run.results.length === 0) return;

	const successRate = run.results.filter((r) => r.success).length / run.results.length;
	const avgScore = run.results.reduce((s, r) => s + r.checklistScore, 0) / run.results.length;
	const avgToolCalls =
		run.results.reduce((s, r) => s + r.metrics.totalToolCalls, 0) / run.results.length;
	const avgSubAgents =
		run.results.reduce((s, r) => s + r.metrics.subAgentsSpawned, 0) / run.results.length;
	const avgTime = run.results.reduce((s, r) => s + r.metrics.totalTimeMs, 0) / run.results.length;

	const execResults = run.results.filter((r) => (r.executionChecklist ?? []).length > 0);
	const avgExecScore =
		execResults.length > 0
			? execResults.reduce((s, r) => s + r.executionChecklistScore, 0) / execResults.length
			: 0;

	console.log(`Success Rate: ${(successRate * 100).toFixed(0)}%`);
	console.log(`Avg Build Score: ${(avgScore * 100).toFixed(0)}%`);
	if (execResults.length > 0) {
		console.log(
			`Avg Exec Score: ${(avgExecScore * 100).toFixed(0)}% (${String(execResults.length)} workflows tested)`,
		);
	}
	console.log(`Avg Tool Calls: ${avgToolCalls.toFixed(1)}`);
	console.log(`Avg Sub-Agents: ${avgSubAgents.toFixed(1)}`);
	console.log(`Avg Time: ${(avgTime / 1000).toFixed(1)}s`);

	const withFirstText = run.results.filter((r) => r.metrics.timeToFirstTextMs > 0);
	if (withFirstText.length > 0) {
		const avgFirstText =
			withFirstText.reduce((s, r) => s + r.metrics.timeToFirstTextMs, 0) / withFirstText.length;
		console.log(`Avg Time to 1st Text: ${(avgFirstText / 1000).toFixed(1)}s`);
	}

	// Per-complexity breakdown
	const complexities = ['simple', 'medium', 'complex'] as const;
	for (const c of complexities) {
		const cResults = run.results.filter((r) => r.complexity === c);
		if (cResults.length === 0) continue;
		const cSuccess = cResults.filter((r) => r.success).length / cResults.length;
		const cScore = cResults.reduce((s, r) => s + r.checklistScore, 0) / cResults.length;
		const cToolCalls = cResults.reduce((s, r) => s + r.metrics.totalToolCalls, 0) / cResults.length;
		console.log(
			`  ${c.toUpperCase()}: Success ${(cSuccess * 100).toFixed(0)}%, Score ${(cScore * 100).toFixed(0)}%, Avg Tools ${cToolCalls.toFixed(1)} (${String(cResults.length)} examples)`,
		);
	}
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
	console.log(`Usage: pnpm eval:checklist [command] [options]

Commands:
  (default)              Run the checklist eval pipeline (local)
  report                 Regenerate report from saved runs
  commit-checklists     Extract checklists and save to committed-checklists.json
  refresh-checklists     Clear cache and re-extract all checklists
  upload-datasets        Upload synthetic prompts to LangSmith datasets
  generate-references    Run prompts and upload outputs as golden references

Options (shared):
  --max-examples <n>      Max number of prompts to run (default: all)
  --concurrency <n>       Number of parallel runs (default: 3)
  --timeout <seconds>     Timeout per example in seconds (default: 600)
  --verbose               Enable verbose output
  --n8n-url <url>         Base URL for n8n instance (default: http://localhost:5678)
  --n8n-urls <urls>       Comma-separated n8n URLs for round-robin dispatch
  --shard <M/N>           Run shard M of N (e.g., --shard 1/2 for first half)

Options (local mode):
  --tags <tags>           Comma-separated tags to filter prompts
  --grep <substring>      Filter prompts by substring match
  --complexity <level>    Filter by complexity (simple, medium, complex)
  --skip-execution-eval   Skip execution-based evaluation (faster runs)

Options (LangSmith mode):
  --langsmith             Use LangSmith evaluate() harness
  --dataset <name>        LangSmith dataset name (required)
  --name <name>           Experiment name (default: <dataset>_<date>)

  --help                  Show this help message`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const command = process.argv[2];
const allArgs = process.argv.slice(2);
const hasLangsmithFlag = allArgs.includes('--langsmith');
const hasHelpFlag = allArgs.includes('--help') || allArgs.includes('-h');

if (hasHelpFlag) {
	printHelp();
} else if (command === 'report') {
	regenerateReport();
} else if (command === 'commit-checklists') {
	commitChecklists().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
} else if (command === 'refresh-checklists') {
	refreshChecklists().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
} else if (command === 'generate-references') {
	runGenerateReferencesCmd().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
} else if (command === 'upload-datasets') {
	// Delegate to the upload script
	import('./langsmith-datasets').catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
} else if (hasLangsmithFlag) {
	runLangsmithEvalCmd().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
} else {
	runEval().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
}
