#!/usr/bin/env node
import { parseCliArgs } from './args';
import { runEvaluation } from '../harness/runner';
import { listRuns } from '../report/storage';
import { writeReport as writeHtmlReport } from '../report/generator';
import { PROMPTS } from '../data/prompts';
import type { PromptConfig, DatasetExample } from '../types';

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));

	if (args.command === 'report') {
		// Regenerate report from saved runs
		const runs = listRuns();
		if (runs.length === 0) {
			console.log('No runs found.');
			return;
		}
		writeHtmlReport(runs);
		console.log(`Report regenerated (${runs.length} run(s))`);
		return;
	}

	if (args.command === 'upload-datasets') {
		// Upload local prompts to LangSmith
		const { Client } = await import('langsmith');
		const { uploadDataset } = await import('../harness/dataset');
		const client = new Client();
		// Split by dataset
		const general = PROMPTS.filter((p) => !p.dataset || p.dataset === 'general');
		const builder = PROMPTS.filter((p) => p.dataset === 'builder');
		if (general.length > 0) {
			await uploadDataset(client, 'instance-ai-general', general.map(toDatasetExample));
			console.log(`Uploaded ${general.length} examples to instance-ai-general`);
		}
		if (builder.length > 0) {
			await uploadDataset(client, 'instance-ai-builder', builder.map(toDatasetExample));
			console.log(`Uploaded ${builder.length} examples to instance-ai-builder`);
		}
		return;
	}

	// Build RunConfig from CLI args
	let prompts = PROMPTS;
	// Apply filters
	if (args.tags?.length)
		prompts = prompts.filter((p) => args.tags!.some((t) => p.tags.includes(t)));
	if (args.complexity) prompts = prompts.filter((p) => p.complexity === args.complexity);
	if (args.triggerType) prompts = prompts.filter((p) => p.triggerType === args.triggerType);
	if (args.maxExamples) prompts = prompts.slice(0, args.maxExamples);

	// Single prompt mode
	if (args.prompt) {
		prompts = [{ text: args.prompt, complexity: 'medium', tags: ['cli'] }];
	}

	const run = await runEvaluation({
		mode: args.langsmith ? 'langsmith' : 'local',
		n8nBaseUrl: args.baseUrl,
		email: args.email,
		password: args.password,
		timeoutMs: args.timeoutMs,
		concurrency: args.concurrency,
		verbose: args.verbose,
		skipExecution: args.skipExecution,
		prompts,
		datasetName: args.dataset,
		experimentName: args.experimentName,
		maxExamples: args.maxExamples,
	});

	console.log(`\nRun ${run.id} ${run.status}`);
	console.log(`Report: evaluations/.data/instance-ai-report.html`);
}

function toDatasetExample(p: PromptConfig): DatasetExample {
	return {
		prompt: p.text,
		tags: p.tags,
		complexity: p.complexity,
		triggerType: p.triggerType,
		expectedCredentials: p.expectedCredentials,
	};
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
