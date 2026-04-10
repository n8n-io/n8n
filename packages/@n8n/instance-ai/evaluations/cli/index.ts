#!/usr/bin/env node
import { parseCliArgs } from './args';
import { N8nClient } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { loadWorkflowTestCases } from '../data/workflows';
import { createLogger } from '../harness/logger';
import { runWorkflowTestCase, runWithConcurrency } from '../harness/runner';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import { writeWorkflowReport } from '../report/workflow-report';

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
	const seedResult = await seedCredentials(client);
	logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

	const preRunWorkflowIds = await snapshotWorkflowIds(client);
	const claimedWorkflowIds = new Set<string>();

	// Run test cases with bounded concurrency.
	// Each test case builds a workflow (uses n8n's agent) then runs scenarios
	// (uses our Anthropic key for Phase 1 + Phase 2 mock generation).
	// At Tier 4 (20K RPM) no practical limit is needed — set high to run all in parallel.
	const MAX_CONCURRENT_TEST_CASES = 4;
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
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
