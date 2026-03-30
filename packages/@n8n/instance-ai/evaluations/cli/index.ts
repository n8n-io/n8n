#!/usr/bin/env node
import { parseCliArgs } from './args';
import { N8nClient } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { PROMPTS } from '../data/prompts';
import { loadWorkflowTestCases } from '../data/workflows';
import { createLogger } from '../harness/logger';
import { runEvaluation, runWorkflowTestCase, runWithConcurrency } from '../harness/runner';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import { writeReport as writeHtmlReport } from '../report/generator';
import { listRuns } from '../report/storage';
import { writeWorkflowReport } from '../report/workflow-report';
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

	// Workflow test case mode
	if (args.command === 'workflows') {
		const testCases = loadWorkflowTestCases(args.filter);
		if (testCases.length === 0) {
			console.log('No workflow test cases found in evaluations/data/workflows/');
			return;
		}

		const totalScenarios = testCases.reduce((sum, tc) => sum + tc.scenarios.length, 0);
		console.log(
			`Running ${String(testCases.length)} workflow test case(s) with ${String(totalScenarios)} scenario(s)\n`,
		);

		const logger = createLogger(args.verbose);

		// Setup: authenticate, seed credentials, snapshot workflows
		const client = new N8nClient(args.baseUrl);
		logger.info(`Authenticating with ${args.baseUrl}...`);
		await client.login(args.email, args.password);
		logger.success('Authenticated');

		logger.info('Seeding credentials...');
		const seedResult = await seedCredentials(client);
		logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

		const preRunWorkflowIds = await snapshotWorkflowIds(client);
		const claimedWorkflowIds = new Set<string>();

		// Run test cases with bounded concurrency.
		// Each test case builds a workflow (uses n8n's agent) then runs scenarios
		// (uses our Anthropic key for Phase 1 + Phase 2 mock generation).
		// At Tier 4 (20K RPM) no practical limit is needed — set high to run all in parallel.
		const MAX_CONCURRENT_TEST_CASES = 99;
		const results = await runWithConcurrency(
			testCases,
			(testCase) =>
				runWorkflowTestCase({
					client,
					testCase,
					timeoutMs: args.timeoutMs,
					seededCredentialTypes: seedResult.seededTypes,
					preRunWorkflowIds,
					claimedWorkflowIds,
					logger,
				}),
			MAX_CONCURRENT_TEST_CASES,
		);

		// Cleanup credentials
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});

		// Generate HTML report
		const reportPath = writeWorkflowReport(results);
		console.log(`Report: ${reportPath}`);

		// Print summary
		console.log('\n=== Workflow Test Case Results ===\n');
		for (const r of results) {
			const buildStatus = r.workflowBuildSuccess ? 'BUILT' : 'BUILD FAILED';
			console.log(`${r.testCase.prompt.slice(0, 70)}...`);
			console.log(`  Workflow: ${buildStatus}${r.workflowId ? ` (${r.workflowId})` : ''}`);
			if (r.buildError) {
				console.log(`  Error: ${r.buildError.slice(0, 200)}`);
			}

			for (const sr of r.scenarioResults) {
				const icon = sr.success ? '\u2713' : '\u2717';
				console.log(
					`  ${icon} ${sr.scenario.name}: ${sr.success ? 'PASS' : 'FAIL'} (${String(sr.score * 100)}%)`,
				);
				if (!sr.success) {
					console.log(`    ${sr.reasoning.slice(0, 120)}`);
				}
			}
			console.log('');
		}

		return;
	}

	// Build RunConfig from CLI args (existing prompt-based mode)
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
