#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { parseCliArgs } from './args';
import { N8nClient } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { loadWorkflowTestCases } from '../data/workflows';
import { createLogger } from '../harness/logger';
import { runWorkflowTestCase, runWithConcurrency } from '../harness/runner';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import type { WorkflowTestCaseResult } from '../types';

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));

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
	const seedResult = await seedCredentials(client, undefined, logger);
	logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

	const preRunWorkflowIds = await snapshotWorkflowIds(client);
	const claimedWorkflowIds = new Set<string>();

	// Run test cases with bounded concurrency.
	// Each test case builds a workflow (uses n8n's agent) then runs scenarios
	// (uses our Anthropic key for Phase 1 + Phase 2 mock generation).
	const MAX_CONCURRENT_TEST_CASES = 4;
	const startTime = Date.now();
	let results;
	try {
		results = await runWithConcurrency(
			testCases,
			async (testCase) =>
				await runWorkflowTestCase({
					client,
					testCase,
					timeoutMs: args.timeoutMs,
					seededCredentialTypes: seedResult.seededTypes,
					preRunWorkflowIds,
					claimedWorkflowIds,
					logger,
					keepWorkflows: args.keepWorkflows,
				}),
			MAX_CONCURRENT_TEST_CASES,
		);
	} finally {
		// Cleanup credentials even if test execution fails
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});
	}

	const totalDuration = Date.now() - startTime;

	// Write eval-results.json for CI consumption (PR comments, artifacts)
	const outputPath = writeEvalResults(results, totalDuration, args.outputDir);
	console.log(`Results: ${outputPath}`);

	// Print console summary
	printSummary(results);
}

/** Write structured JSON results for CI (PR comments, artifact upload). */
function writeEvalResults(
	results: WorkflowTestCaseResult[],
	duration: number,
	outputDir?: string,
): string {
	const allScenarios = results.flatMap((r) => r.scenarioResults);
	const passed = allScenarios.filter((s) => s.success).length;

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		summary: {
			testCases: results.length,
			built: results.filter((r) => r.workflowBuildSuccess).length,
			scenariosTotal: allScenarios.length,
			scenariosPassed: passed,
			passRate: allScenarios.length > 0 ? passed / allScenarios.length : 0,
		},
		testCases: results.map((r) => ({
			name: r.testCase.prompt.slice(0, 70),
			built: r.workflowBuildSuccess,
			buildError: r.buildError,
			workflowId: r.workflowId,
			scenarios: r.scenarioResults.map((sr) => ({
				name: sr.scenario.name,
				passed: sr.success,
				score: sr.score,
				reasoning: sr.reasoning,
				failureCategory: sr.failureCategory,
				rootCause: sr.rootCause,
			})),
		})),
	};

	const dir = outputDir ?? process.cwd();
	mkdirSync(dir, { recursive: true });
	const outputPath = join(dir, 'eval-results.json');
	writeFileSync(outputPath, JSON.stringify(report, null, 2));
	return outputPath;
}

function printSummary(results: WorkflowTestCaseResult[]): void {
	console.log('\n=== Workflow Eval Results ===\n');
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

	// Totals
	const allScenarios = results.flatMap((r) => r.scenarioResults);
	const passed = allScenarios.filter((s) => s.success).length;
	const built = results.filter((r) => r.workflowBuildSuccess).length;
	console.log(
		`${String(built)}/${String(results.length)} built | ${String(passed)}/${String(allScenarios.length)} passed (${String(allScenarios.length > 0 ? Math.round((passed / allScenarios.length) * 100) : 0)}%)`,
	);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
