import { extractChecklist, clearCache } from './checklist';
import { runSingleExample, type RunnerConfig } from './runner';
import { writeReport } from './report';
import { saveRun, listRuns } from './storage';
import { SYNTHETIC_PROMPTS } from './synthetic-prompts';
import type { Run, PromptConfig, ChecklistItem, AgentResult } from './types';

import { loadNodesFromFile } from '../support/load-nodes';
import { resolveBuiltinNodeDefinitionDirs, setupLLM } from '../support/environment';
import type { ModelId } from '../../src/llm-config';
import { DEFAULT_MODEL, AVAILABLE_MODELS } from '../../src/llm-config';

interface CliArgs {
	model: ModelId;
	maxExamples: number;
	tags: string[];
	grep: string;
	concurrency: number;
	timeoutMs: number;
	verbose: boolean;
}

function parseArgs(args: string[]): CliArgs {
	const result: CliArgs = {
		model: DEFAULT_MODEL,
		maxExamples: 0,
		tags: [],
		grep: '',
		concurrency: 3,
		timeoutMs: 5 * 60 * 1000,
		verbose: false,
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--model':
				result.model = args[++i] as ModelId;
				break;
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
		}
	}

	return result;
}

function filterPrompts(prompts: PromptConfig[], args: CliArgs): PromptConfig[] {
	let filtered = prompts;

	if (args.tags.length > 0) {
		filtered = filtered.filter((p) => args.tags.some((tag) => p.tags?.includes(tag)));
	}

	if (args.grep) {
		filtered = filtered.filter((p) => p.text.toLowerCase().includes(args.grep.toLowerCase()));
	}

	if (args.maxExamples > 0) {
		filtered = filtered.slice(0, args.maxExamples);
	}

	return filtered;
}

function regenerateReport() {
	console.log('Regenerating report from saved runs...');
	const allRuns = listRuns();
	if (allRuns.length === 0) {
		console.log('No runs found. Nothing to generate.');
		return;
	}
	writeReport(allRuns);
	console.log(`Report written (${allRuns.length} run(s))`);
}

async function refreshChecklists() {
	const args = parseArgs(process.argv.slice(3));
	const prompts = filterPrompts(SYNTHETIC_PROMPTS, args);

	console.log('=== Refresh Checklists ===');
	const deleted = clearCache();
	console.log(`Cleared ${deleted} cached checklist(s)\n`);
	console.log(`Extracting checklists for ${prompts.length} prompt(s)...\n`);

	for (const prompt of prompts) {
		const label = prompt.text.length > 80 ? prompt.text.slice(0, 80) + '...' : prompt.text;
		console.log(`--- ${label} ---`);
		const checklist = await extractChecklist(prompt.text);
		for (const item of checklist) {
			console.log(`  [${item.category}] ${item.item}`);
		}
		console.log(`  (${checklist.length} items)\n`);
	}

	console.log('Done.');
}

async function runEval() {
	const args = parseArgs(process.argv.slice(2));
	const prompts = filterPrompts(SYNTHETIC_PROMPTS, args);

	console.log('=== n8n Code Builder — Checklist Eval ===');
	console.log(`Model: ${args.model}`);
	console.log(`Prompts: ${prompts.length}`);
	console.log(`Concurrency: ${args.concurrency}`);
	console.log(`Timeout: ${args.timeoutMs / 1000}s`);
	if (args.tags.length > 0) console.log(`Tags: ${args.tags.join(', ')}`);
	if (args.grep) console.log(`Grep: ${args.grep}`);
	console.log('');

	// Load environment
	console.log('Loading node types...');
	const nodeTypes = loadNodesFromFile();
	const nodeDefinitionDirs = resolveBuiltinNodeDefinitionDirs();
	console.log(
		`Loaded ${nodeTypes.length} node types, ${nodeDefinitionDirs.length} definition dirs`,
	);

	console.log('Setting up LLM...');
	const llm = await setupLLM(args.model);

	const runnerConfig: RunnerConfig = {
		nodeTypes,
		nodeDefinitionDirs,
		llm,
		timeoutMs: args.timeoutMs,
		verbose: args.verbose,
	};

	const run: Run = {
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString(),
		status: 'running',
		config: { prompts, model: args.model },
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
			console.log(`${checklist.length} items`);
		}

		// Phase 2: Run examples in batches
		console.log(`\nPhase 2: Running ${prompts.length} examples...`);

		const tasks = prompts.map((prompt) => ({
			prompt,
			checklist: checklistMap.get(prompt.text) ?? [],
		}));

		const results: AgentResult[] = [];

		for (let i = 0; i < tasks.length; i += args.concurrency) {
			const batch = tasks.slice(i, i + args.concurrency);
			const batchNum = Math.floor(i / args.concurrency) + 1;
			const totalBatches = Math.ceil(tasks.length / args.concurrency);
			console.log(`\n  Batch ${batchNum}/${totalBatches}:`);

			const batchResults = await Promise.allSettled(
				batch.map(async ({ prompt, checklist }) => {
					const label = `"${prompt.text.slice(0, 50)}..."`;
					console.log(`    Starting: ${label}`);

					const result = await runSingleExample(runnerConfig, prompt, checklist);

					const scoreStr = `${(result.checklistScore * 100).toFixed(0)}%`;
					const successStr = result.success ? 'PASS' : 'FAIL';
					console.log(
						`    Done: ${label} — ${successStr}, Score: ${scoreStr}, Iters: ${result.iterations.length}`,
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
	}

	saveRun(run);

	// Regenerate report
	console.log('\nGenerating report...');
	writeReport(listRuns());

	// Summary
	console.log('\n=== Summary ===');
	console.log(`Status: ${run.status}`);
	console.log(`Results: ${run.results.length}`);

	if (run.results.length > 0) {
		const successRate = run.results.filter((r) => r.success).length / run.results.length;
		const avgScore = run.results.reduce((s, r) => s + r.checklistScore, 0) / run.results.length;

		console.log(`Success Rate: ${(successRate * 100).toFixed(0)}%`);
		console.log(`Avg Checklist Score: ${(avgScore * 100).toFixed(0)}%`);

		// Per-complexity breakdown
		const complexities = ['simple', 'medium', 'complex'] as const;
		for (const c of complexities) {
			const cResults = run.results.filter((r) => r.complexity === c);
			if (cResults.length === 0) continue;
			const cSuccess = cResults.filter((r) => r.success).length / cResults.length;
			const cScore = cResults.reduce((s, r) => s + r.checklistScore, 0) / cResults.length;
			console.log(
				`  ${c.toUpperCase()}: Success ${(cSuccess * 100).toFixed(0)}%, Score ${(cScore * 100).toFixed(0)}% (${cResults.length} examples)`,
			);
		}
	}

	console.log(`\nReport: evaluations/.data/checklist-report.html`);
	console.log(`Run: evaluations/.data/checklist-runs/${run.id}.json`);
}

function printHelp() {
	console.log(`Usage: pnpm eval:checklist [command] [options]

Commands:
  (default)              Run the checklist eval pipeline
  report                 Regenerate report from saved runs
  refresh-checklists     Clear cache and re-extract all checklists

Options:
  --model <model>         Model to use (default: ${DEFAULT_MODEL})
                          Available: ${AVAILABLE_MODELS.join(', ')}
  --max-examples <n>      Max number of prompts to run (default: all)
  --tags <tags>           Comma-separated tags to filter prompts
  --grep <substring>      Filter prompts by substring match
  --concurrency <n>       Number of parallel runs (default: 3)
  --timeout <seconds>     Timeout per example in seconds (default: 300)
  --verbose               Enable verbose output
  --help                  Show this help message`);
}

const command = process.argv[2];

if (command === '--help' || command === '-h') {
	printHelp();
} else if (command === 'report') {
	regenerateReport();
} else if (command === 'refresh-checklists') {
	refreshChecklists().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
} else {
	runEval().catch((err) => {
		console.error('Fatal error:', err);
		process.exit(1);
	});
}
