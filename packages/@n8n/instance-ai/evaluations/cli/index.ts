#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { aggregateResults } from './aggregator';
import { parseCliArgs } from './args';
import { N8nClient } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { loadWorkflowTestCases } from '../data/workflows';
import { createLogger } from '../harness/logger';
import { runWorkflowTestCase, runWithConcurrency } from '../harness/runner';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import type { MultiRunEvaluation, WorkflowTestCaseResult } from '../types';

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));

	const testCases = loadWorkflowTestCases(args.filter);
	if (testCases.length === 0) {
		console.log('No workflow test cases found in evaluations/data/workflows/');
		return;
	}

	const totalScenarios = testCases.reduce((sum, tc) => sum + tc.scenarios.length, 0);
	console.log(
		`Running ${String(testCases.length)} workflow test case(s) with ${String(totalScenarios)} scenario(s) x ${String(args.runs)} runs\n`,
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

	// Run test cases with bounded concurrency.
	// Each test case builds a workflow (uses n8n's agent) then runs scenarios
	// (uses our Anthropic key for Phase 1 + Phase 2 mock generation).
	const MAX_CONCURRENT_TEST_CASES = 4;
	const startTime = Date.now();
	const allRunResults: WorkflowTestCaseResult[][] = [];

	try {
		for (let run = 0; run < args.runs; run++) {
			if (args.runs > 1) {
				console.log(`\n--- Run #${String(run + 1)}/${String(args.runs)} ---\n`);
			}

			const preRunWorkflowIds = await snapshotWorkflowIds(client);
			const claimedWorkflowIds = new Set<string>();

			const results = await runWithConcurrency(
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

			allRunResults.push(results);
		}
	} finally {
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});
	}

	const totalDuration = Date.now() - startTime;
	const aggregatedResults = aggregateResults(allRunResults, args.runs);

	// Write eval-results.json for CI consumption (PR comments, artifacts)
	const outputPath = writeEvalResults(aggregatedResults, totalDuration, args.outputDir);
	console.log(`Results: ${outputPath}`);

	// Print console summary
	printSummary(aggregatedResults);
}

/** Write structured JSON results for CI (PR comments, artifact upload). */
function writeEvalResults(
	evaluation: MultiRunEvaluation,
	duration: number,
	outputDir?: string,
): string {
	const { totalRuns, testCases } = evaluation;
	const allScenarios = testCases.flatMap((tc) => tc.scenarios);
	const totalScenariosCount = allScenarios.length;

	const passAtKCount =
		totalScenariosCount > 0
			? allScenarios.reduce((sum, s) => sum + (s.passAtK[totalRuns - 1] ?? 0), 0)
			: 0;
	const passHatKCount =
		totalScenariosCount > 0
			? allScenarios.reduce((sum, s) => sum + (s.passHatK[totalRuns - 1] ?? 0), 0)
			: 0;

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		totalRuns,
		summary: {
			testCases: testCases.length,
			built: testCases.filter((tc) => tc.buildSuccessCount > 0).length,
			scenariosTotal: totalScenariosCount,
			passAtK: totalScenariosCount > 0 ? passAtKCount / totalScenariosCount : 0,
			passHatK: totalScenariosCount > 0 ? passHatKCount / totalScenariosCount : 0,
		},
		testCases: testCases.map((tc) => ({
			name: tc.testCase.prompt.slice(0, 70),
			buildSuccessCount: tc.buildSuccessCount,
			totalRuns,
			scenarios: tc.scenarios.map((sa) => ({
				name: sa.scenario.name,
				passCount: sa.passCount,
				totalRuns,
				passAtK: sa.passAtK[totalRuns - 1] ?? 0,
				passHatK: sa.passHatK[totalRuns - 1] ?? 0,
				runs: sa.runs.map((sr) => ({
					passed: sr.success,
					score: sr.score,
					reasoning: sr.reasoning,
					failureCategory: sr.failureCategory,
					rootCause: sr.rootCause,
				})),
			})),
		})),
	};

	const dir = outputDir ?? process.cwd();
	mkdirSync(dir, { recursive: true });
	const outputPath = join(dir, 'eval-results.json');
	writeFileSync(outputPath, JSON.stringify(report, null, 2));
	return outputPath;
}

function printSummary(evaluation: MultiRunEvaluation): void {
	const { totalRuns, testCases } = evaluation;
	const multiRun = totalRuns > 1;

	console.log('\n=== Workflow Eval Results ===\n');
	for (const tc of testCases) {
		console.log(`${tc.testCase.prompt.slice(0, 70)}...`);

		if (multiRun) {
			console.log(`  Build: ${String(tc.buildSuccessCount)}/${String(totalRuns)} runs`);
		} else {
			const r = tc.runs[0];
			const buildStatus = r.workflowBuildSuccess ? 'BUILT' : 'BUILD FAILED';
			console.log(`  Workflow: ${buildStatus}${r.workflowId ? ` (${r.workflowId})` : ''}`);
			if (r.buildError) {
				console.log(`  Error: ${r.buildError.slice(0, 200)}`);
			}
		}

		for (const sa of tc.scenarios) {
			if (multiRun) {
				const passAtK = Math.round((sa.passAtK[totalRuns - 1] ?? 0) * 100);
				const passHatK = Math.round((sa.passHatK[totalRuns - 1] ?? 0) * 100);
				console.log(
					`  ${sa.scenario.name}: ${String(sa.passCount)}/${String(totalRuns)} passed` +
						` | pass@${String(totalRuns)}: ${String(passAtK)}% | pass^${String(totalRuns)}: ${String(passHatK)}%`,
				);
			} else {
				const sr = sa.runs[0];
				const icon = sr.success ? '✓' : '✗';
				console.log(
					`  ${icon} ${sr.scenario.name}: ${sr.success ? 'PASS' : 'FAIL'} (${String(sr.score * 100)}%)`,
				);
				if (!sr.success) {
					console.log(`    ${sr.reasoning.slice(0, 120)}`);
				}
			}
		}
	}

	// Aggregate metrics for multi-run
	if (multiRun) {
		const allScenarios = testCases.flatMap((tc) => tc.scenarios);
		const total = allScenarios.length;
		const avgPassAtK =
			total > 0
				? Math.round(
						(allScenarios.reduce((sum, s) => sum + (s.passAtK[totalRuns - 1] ?? 0), 0) / total) *
							100,
					)
				: 0;
		const avgPassHatK =
			total > 0
				? Math.round(
						(allScenarios.reduce((sum, s) => sum + (s.passHatK[totalRuns - 1] ?? 0), 0) / total) *
							100,
					)
				: 0;

		console.log('\n=== Aggregate Metrics ===\n');
		console.log(`  pass@${String(totalRuns)}: ${String(avgPassAtK)}%`);
		console.log(`  pass^${String(totalRuns)}: ${String(avgPassHatK)}%`);
	}

	// Totals
	const allScenarios = testCases.flatMap((tc) => tc.scenarios);
	const total = allScenarios.length;
	const built = testCases.filter((tc) => tc.buildSuccessCount > 0).length;
	const passedTotal = multiRun
		? allScenarios.reduce((sum, s) => sum + s.passCount, 0)
		: allScenarios.filter((s) => s.runs[0]?.success).length;
	const totalAttempts = multiRun ? total * totalRuns : total;

	console.log(
		`\n${String(built)}/${String(testCases.length)} built | ${String(passedTotal)}/${String(totalAttempts)} passed (${String(totalAttempts > 0 ? Math.round((passedTotal / totalAttempts) * 100) : 0)}%)`,
	);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
