#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Instance AI workflow eval CLI
//
// Runs workflow execution evaluations. When LANGSMITH_API_KEY is set, uses
// LangSmith's evaluate() for experiment tracking and tracing. Otherwise
// falls back to a direct loop with the same eval-results.json output.
// ---------------------------------------------------------------------------

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mkdirSync, writeFileSync } from 'fs';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Example, Run } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';
import pLimit from 'p-limit';
import { join } from 'path';
import { z } from 'zod';

import { parseCliArgs } from './args';
import { buildCIMetadata, computeExperimentPrefix } from './ci-metadata';
import { N8nClient } from '../clients/n8n-client';
import { seedCredentials, cleanupCredentials } from '../credentials/seeder';
import { loadWorkflowTestCasesWithFiles } from '../data/workflows';
import { createLogger } from '../harness/logger';
import type { EvalLogger } from '../harness/logger';
import {
	buildWorkflow,
	executeScenario,
	cleanupBuild,
	runWorkflowTestCase,
	runWithConcurrency,
	type BuildResult,
} from '../harness/runner';
import { syncDataset, type DatasetExampleInputs } from '../langsmith/dataset-sync';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import { writeWorkflowReport } from '../report/workflow-report';
import type { ScenarioResult, TestScenario, WorkflowTestCaseResult } from '../types';

// n8n degrades above ~4 concurrent builds.
const MAX_CONCURRENT_BUILDS = 4;

const targetOutputSchema = z.object({
	buildSuccess: z.boolean().default(false),
	passed: z.boolean().default(false),
	score: z.number().default(0),
	reasoning: z.string().default(''),
	workflowId: z.string().optional(),
	failureCategory: z.string().optional(),
	rootCause: z.string().optional(),
	execErrors: z.array(z.string()).default([]),
	evalResult: z.unknown().optional(),
	/** Only set on the scenario that initiated the build. */
	buildDurationMs: z.number().optional(),
	execDurationMs: z.number().default(0),
	nodeCount: z.number().default(0),
});

type TargetOutput = Omit<z.infer<typeof targetOutputSchema>, 'evalResult'> & {
	evalResult?: InstanceAiEvalExecutionResult;
};

function isEvalResult(v: unknown): v is InstanceAiEvalExecutionResult {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseTargetOutput(raw: unknown): TargetOutput {
	const parsed = targetOutputSchema.parse(raw ?? {});
	return {
		...parsed,
		evalResult: isEvalResult(parsed.evalResult) ? parsed.evalResult : undefined,
	};
}

const runInputsSchema = z
	.object({
		prompt: z.string().default(''),
		testCaseFile: z.string().default(''),
		scenarioName: z.string().default(''),
	})
	.passthrough();

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	const client = new N8nClient(args.baseUrl);
	logger.info(`Authenticating with ${args.baseUrl}...`);
	await client.login(args.email, args.password);
	logger.success('Authenticated');

	logger.info('Seeding credentials...');
	const seedResult = await seedCredentials(client, undefined, logger);
	logger.info(`Seeded ${String(seedResult.credentialIds.length)} credential(s)`);

	const preRunWorkflowIds = await snapshotWorkflowIds(client);
	const claimedWorkflowIds = new Set<string>();

	const startTime = Date.now();

	try {
		const hasLangSmith = Boolean(process.env.LANGSMITH_API_KEY);

		let results: CollectedResult[];

		if (hasLangSmith) {
			logger.info('LangSmith API key detected, using evaluate() with experiment tracking');
			results = await runWithLangSmith({
				args,
				client,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
				seedResult,
			});
		} else {
			logger.info('No LANGSMITH_API_KEY, running direct loop (results in eval-results.json only)');
			results = await runDirectLoop({
				args,
				client,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
				seedResult,
			});
		}

		const totalDuration = Date.now() - startTime;
		const outputPath = writeEvalResults(results, totalDuration, args.outputDir);
		console.log(`Results: ${outputPath}`);
		const htmlPath = writeWorkflowReport(reshapeForReport(results));
		console.log(`Report:  ${htmlPath}`);
		printSummary(results);
	} finally {
		await cleanupCredentials(client, seedResult.credentialIds).catch(() => {});
	}
}

// ---------------------------------------------------------------------------
// LangSmith mode: evaluate() with dataset sync, tracing, experiments
// ---------------------------------------------------------------------------

interface RunConfig {
	args: ReturnType<typeof parseCliArgs>;
	client: N8nClient;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	logger: EvalLogger;
	seedResult: { seededTypes: string[]; credentialIds: string[] };
}

async function runWithLangSmith(config: RunConfig): Promise<CollectedResult[]> {
	const { args, client, preRunWorkflowIds, claimedWorkflowIds, logger } = config;

	const lsClient = new Client();

	const datasetName = await syncDataset(lsClient, args.dataset, logger, args.filter);

	const buildLimiter = pLimit(MAX_CONCURRENT_BUILDS);
	const buildCache = new Map<string, Promise<BuildResult>>();
	const buildDurations = new Map<string, number>();

	async function getOrBuild(
		prompt: string,
	): Promise<{ build: BuildResult; buildDurationMs?: number }> {
		const existing = buildCache.get(prompt);
		if (existing) return { build: await existing };
		// Timer runs inside the limiter so queue-wait isn't counted as build time.
		const promise = buildLimiter(async () => {
			const start = Date.now();
			const build = await buildWorkflow({
				client,
				prompt,
				timeoutMs: args.timeoutMs,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
			});
			buildDurations.set(prompt, Date.now() - start);
			return build;
		});
		buildCache.set(prompt, promise);
		const build = await promise;
		return { build, buildDurationMs: buildDurations.get(prompt) };
	}

	// Created once to avoid AsyncLocalStorage context leaks across concurrent runs.
	const traceableBuild = traceable(async (prompt: string) => await getOrBuild(prompt), {
		name: 'workflow_build',
		run_type: 'chain',
		client: lsClient,
	});

	const traceableExecute = traceable(
		async (execArgs: {
			workflowId: string;
			scenario: TestScenario;
			workflowJsons: BuildResult['workflowJsons'];
		}) =>
			await executeScenario(
				client,
				execArgs.workflowId,
				execArgs.scenario,
				execArgs.workflowJsons,
				logger,
			),
		{ name: 'scenario_execution', run_type: 'chain', client: lsClient },
	);

	const target = async (inputs: DatasetExampleInputs): Promise<TargetOutput> => {
		const scenario: TestScenario = {
			name: inputs.scenarioName,
			description: inputs.scenarioDescription,
			dataSetup: inputs.dataSetup,
			successCriteria: inputs.successCriteria,
		};

		const { build, buildDurationMs } = await traceableBuild(inputs.prompt);

		if (!build.success || !build.workflowId) {
			return {
				buildSuccess: false,
				passed: false,
				score: 0,
				reasoning: `Build failed: ${build.error ?? 'unknown'}`,
				failureCategory: 'build_failure',
				execErrors: build.error ? [build.error] : [],
				buildDurationMs,
				execDurationMs: 0,
				nodeCount: 0,
			};
		}

		const execStart = Date.now();
		const result = await traceableExecute({
			workflowId: build.workflowId,
			scenario,
			workflowJsons: build.workflowJsons,
		});
		const execDurationMs = Date.now() - execStart;

		// Strip failure fields on pass: the verifier sometimes returns "."
		// placeholders instead of omitting them.
		const failureCategory = result.success ? undefined : result.failureCategory;
		const rootCause = result.success ? undefined : result.rootCause;

		return {
			buildSuccess: true,
			workflowId: build.workflowId,
			passed: result.success,
			score: result.score,
			reasoning: result.reasoning,
			failureCategory,
			rootCause,
			execErrors: result.evalResult?.errors ?? [],
			evalResult: result.evalResult,
			buildDurationMs,
			execDurationMs,
			nodeCount: build.workflowJsons[0]?.nodes.length ?? 0,
		};
	};

	const feedbackExtractor = ({ run }: { run: Run }): EvaluationResult[] => {
		const output = parseTargetOutput(run.outputs);
		// 'none' for passed scenarios so the column shows a full categorical
		// breakdown instead of blank cells.
		const failureCategory = output.passed ? 'none' : (output.failureCategory ?? 'unknown');
		const feedback: EvaluationResult[] = [
			{
				key: 'scenario_pass',
				score: output.score,
				comment: output.reasoning || undefined,
			},
			{
				key: 'failure_category',
				value: failureCategory,
			},
			{
				key: 'exec_duration_s',
				score: output.execDurationMs / 1000,
			},
			{
				key: 'node_count',
				score: output.nodeCount,
			},
		];
		if (output.buildDurationMs !== undefined) {
			feedback.push({ key: 'build_duration_s', score: output.buildDurationMs / 1000 });
		}
		return feedback;
	};

	const experimentPrefix = args.experimentName ?? computeExperimentPrefix();

	logger.info(
		`Starting evaluate() with concurrency=${String(args.concurrency)}, builds limited to ${String(MAX_CONCURRENT_BUILDS)}`,
	);

	const evaluateData = args.filter
		? filteredExamplesIterable(lsClient, datasetName, args.filter, logger)
		: datasetName;

	try {
		const evaluateStart = Date.now();
		const experimentResults = await evaluate(target, {
			data: evaluateData,
			evaluators: [feedbackExtractor],
			experimentPrefix,
			maxConcurrency: args.concurrency,
			client: lsClient,
			metadata: {
				filter: args.filter ?? 'all',
				concurrency: args.concurrency,
				maxBuilds: MAX_CONCURRENT_BUILDS,
				...buildCIMetadata(),
			},
		});
		const totalDurationMs = Date.now() - evaluateStart;

		logger.info(`Experiment: ${experimentResults.experimentName}`);
		await lsClient.awaitPendingTraceBatches();

		await updateExperimentAggregates({
			lsClient,
			experimentName: experimentResults.experimentName,
			runs: experimentResults.results,
			buildDurations,
			totalDurationMs,
			logger,
		});

		return collectResultsFromExperiment(experimentResults.results);
	} finally {
		if (!args.keepWorkflows) {
			await Promise.all(
				[...buildCache.values()].map(async (buildPromise) => {
					try {
						const build = await buildPromise;
						await cleanupBuild(client, build, logger);
					} catch {
						// Best-effort
					}
				}),
			);
		}
	}
}

function filteredExamplesIterable(
	lsClient: Client,
	datasetName: string,
	filter: string,
	logger: EvalLogger,
): AsyncIterable<Example> {
	const slugs = loadWorkflowTestCasesWithFiles(filter).map((tc) => tc.fileSlug);
	if (slugs.length === 0) {
		logger.info(`Filter "${filter}" matched no local test case files`);
		return (async function* () {})();
	}
	logger.info(`Filter "${filter}" matched ${String(slugs.length)} split(s): ${slugs.join(', ')}`);
	return lsClient.listExamples({ datasetName, splits: slugs });
}

async function updateExperimentAggregates(config: {
	lsClient: Client;
	experimentName: string;
	runs: Array<{ run: Run }>;
	buildDurations: Map<string, number>;
	totalDurationMs: number;
	logger: EvalLogger;
}): Promise<void> {
	const { lsClient, experimentName, runs, buildDurations, totalDurationMs, logger } = config;

	const buildTimes = [...buildDurations.values()];
	const uniqueBuilds = buildTimes.length;
	const avgBuildMs =
		uniqueBuilds > 0 ? buildTimes.reduce((sum, d) => sum + d, 0) / uniqueBuilds : 0;

	const execTimes = runs.map(({ run }) => parseTargetOutput(run.outputs).execDurationMs);
	const avgExecMs =
		execTimes.length > 0 ? execTimes.reduce((sum, d) => sum + d, 0) / execTimes.length : 0;

	const aggregates = {
		duration_s: Math.round(totalDurationMs / 100) / 10,
		avg_build_s: Math.round(avgBuildMs / 100) / 10,
		avg_exec_s: Math.round(avgExecMs / 100) / 10,
		unique_builds: uniqueBuilds,
	};

	try {
		const project = await lsClient.readProject({ projectName: experimentName });
		// `updateProject` replaces `extra` wholesale — preserve it so auto-set
		// fields (splits, etc.) survive.
		const existingExtra = (project.extra ?? {}) as Record<string, unknown>;
		const existingMetadata = (existingExtra.metadata ?? {}) as Record<string, unknown>;
		await lsClient.updateProject(project.id, {
			projectExtra: existingExtra,
			metadata: { ...existingMetadata, ...aggregates },
		});
		logger.verbose(`Updated experiment metadata: ${JSON.stringify(aggregates)}`);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		logger.verbose(`Could not update experiment metadata: ${msg}`);
	}
}

// ---------------------------------------------------------------------------
// Direct mode: simple loop, no LangSmith dependency
// ---------------------------------------------------------------------------

async function runDirectLoop(config: RunConfig): Promise<CollectedResult[]> {
	const { args, client, preRunWorkflowIds, claimedWorkflowIds, logger, seedResult } = config;

	const testCasesWithFiles = loadWorkflowTestCasesWithFiles(args.filter);
	if (testCasesWithFiles.length === 0) {
		console.log('No workflow test cases found in evaluations/data/workflows/');
		return [];
	}

	const totalScenarios = testCasesWithFiles.reduce(
		(sum, { testCase }) => sum + testCase.scenarios.length,
		0,
	);
	logger.info(
		`Running ${String(testCasesWithFiles.length)} test case(s) with ${String(totalScenarios)} scenario(s)`,
	);

	const results = await runWithConcurrency(
		testCasesWithFiles,
		async ({ testCase, fileSlug }) => ({
			fileSlug,
			result: await runWorkflowTestCase({
				client,
				testCase,
				timeoutMs: args.timeoutMs,
				seededCredentialTypes: seedResult.seededTypes,
				preRunWorkflowIds,
				claimedWorkflowIds,
				logger,
				keepWorkflows: args.keepWorkflows,
			}),
		}),
		MAX_CONCURRENT_BUILDS,
	);

	return collectResultsFromTestCases(results);
}

// ---------------------------------------------------------------------------
// Results collection (both paths produce the same CollectedResult[])
// ---------------------------------------------------------------------------

interface CollectedResult {
	testCaseFile: string;
	prompt: string;
	scenarioName: string;
	buildSuccess: boolean;
	buildError?: string;
	workflowId?: string;
	passed: boolean;
	score: number;
	reasoning: string;
	failureCategory?: string;
	rootCause?: string;
	execErrors: string[];
	evalResult?: InstanceAiEvalExecutionResult;
}

function collectResultsFromExperiment(rows: Array<{ run: Run }>): CollectedResult[] {
	return rows.map((row) => {
		const output = parseTargetOutput(row.run.outputs);
		const inputs = runInputsSchema.parse(row.run.inputs ?? {});
		return {
			testCaseFile: inputs.testCaseFile,
			prompt: inputs.prompt,
			scenarioName: inputs.scenarioName,
			buildSuccess: output.buildSuccess,
			buildError: output.buildSuccess ? undefined : output.reasoning,
			workflowId: output.workflowId,
			passed: output.passed,
			score: output.score,
			reasoning: output.reasoning,
			failureCategory: output.failureCategory,
			rootCause: output.rootCause,
			execErrors: output.execErrors,
			evalResult: output.evalResult,
		};
	});
}

function collectResultsFromTestCases(
	entries: Array<{ result: WorkflowTestCaseResult; fileSlug: string }>,
): CollectedResult[] {
	return entries.flatMap(({ result: r, fileSlug }) => {
		const base = {
			testCaseFile: fileSlug,
			prompt: r.testCase.prompt,
			buildSuccess: r.workflowBuildSuccess,
			buildError: r.buildError,
			workflowId: r.workflowId,
		};

		if (!r.workflowBuildSuccess || r.scenarioResults.length === 0) {
			return r.testCase.scenarios.map(
				(s): CollectedResult => ({
					...base,
					scenarioName: s.name,
					passed: false,
					score: 0,
					reasoning: r.buildError ?? 'Build failed',
					failureCategory: 'build_failure',
					execErrors: r.buildError ? [r.buildError] : [],
				}),
			);
		}

		return r.scenarioResults.map(
			(sr): CollectedResult => ({
				...base,
				scenarioName: sr.scenario.name,
				passed: sr.success,
				score: sr.score,
				reasoning: sr.reasoning,
				failureCategory: sr.failureCategory,
				rootCause: sr.rootCause,
				execErrors: sr.evalResult?.errors ?? [],
				evalResult: sr.evalResult,
			}),
		);
	});
}

function reshapeForReport(collectedResults: CollectedResult[]): WorkflowTestCaseResult[] {
	const testCasesWithFiles = loadWorkflowTestCasesWithFiles();
	const byFile = new Map<string, CollectedResult[]>();
	for (const cr of collectedResults) {
		const group = byFile.get(cr.testCaseFile) ?? [];
		group.push(cr);
		byFile.set(cr.testCaseFile, group);
	}

	const output: WorkflowTestCaseResult[] = [];
	for (const { testCase, fileSlug } of testCasesWithFiles) {
		const group = byFile.get(fileSlug);
		if (!group || group.length === 0) continue;
		const first = group[0];
		const scenarioResults: ScenarioResult[] = group.map((cr) => ({
			scenario: testCase.scenarios.find((s) => s.name === cr.scenarioName) ?? {
				name: cr.scenarioName,
				description: '',
				dataSetup: '',
				successCriteria: '',
			},
			success: cr.passed,
			evalResult: cr.evalResult,
			score: cr.score,
			reasoning: cr.reasoning,
			failureCategory: cr.failureCategory,
			rootCause: cr.rootCause,
		}));
		output.push({
			testCase,
			workflowBuildSuccess: first.buildSuccess,
			workflowId: first.workflowId,
			scenarioResults,
			buildError: first.buildError,
		});
	}
	return output;
}

// ---------------------------------------------------------------------------
// eval-results.json output (same shape as CI PR comment expects)
// ---------------------------------------------------------------------------

function writeEvalResults(
	results: CollectedResult[],
	duration: number,
	outputDir?: string,
): string {
	const byTestCase = new Map<string, CollectedResult[]>();
	for (const r of results) {
		const key = r.testCaseFile || r.prompt.slice(0, 70);
		const group = byTestCase.get(key) ?? [];
		group.push(r);
		byTestCase.set(key, group);
	}

	const passed = results.filter((r) => r.passed).length;
	const testCaseEntries = [...byTestCase.entries()].map(([name, scenarios]) => ({
		name,
		built: scenarios.some((s) => s.buildSuccess),
		buildError: scenarios.find((s) => !s.buildSuccess)?.buildError,
		workflowId: scenarios.find((s) => s.workflowId)?.workflowId,
		scenarios: scenarios.map((s) => ({
			name: s.scenarioName,
			passed: s.passed,
			score: s.score,
			reasoning: s.reasoning,
			failureCategory: s.failureCategory,
			rootCause: s.rootCause,
			execErrors: s.execErrors,
			evalResult: s.evalResult,
		})),
	}));

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		summary: {
			testCases: testCaseEntries.length,
			built: testCaseEntries.filter((tc) => tc.built).length,
			scenariosTotal: results.length,
			scenariosPassed: passed,
			passRate: results.length > 0 ? passed / results.length : 0,
		},
		testCases: testCaseEntries,
	};

	const targetDir = outputDir ?? process.cwd();
	mkdirSync(targetDir, { recursive: true });
	const outputPath = join(targetDir, 'eval-results.json');
	writeFileSync(outputPath, JSON.stringify(report, null, 2));
	return outputPath;
}

// ---------------------------------------------------------------------------
// Console summary
// ---------------------------------------------------------------------------

function printSummary(results: CollectedResult[]): void {
	const byTestCase = new Map<string, CollectedResult[]>();
	for (const r of results) {
		const key = r.testCaseFile || r.prompt.slice(0, 70);
		const group = byTestCase.get(key) ?? [];
		group.push(r);
		byTestCase.set(key, group);
	}

	console.log('\n=== Workflow Eval Results ===\n');
	for (const [name, scenarios] of byTestCase) {
		const built = scenarios.some((s) => s.buildSuccess);
		const buildStatus = built ? 'BUILT' : 'BUILD FAILED';
		const workflowId = scenarios.find((s) => s.workflowId)?.workflowId;
		console.log(`${name}`);
		console.log(`  Workflow: ${buildStatus}${workflowId ? ` (${workflowId})` : ''}`);

		for (const s of scenarios) {
			const icon = s.passed ? '\u2713' : '\u2717';
			const category = s.failureCategory ? ` [${s.failureCategory}]` : '';
			console.log(
				`  ${icon} ${s.scenarioName}: ${s.passed ? 'PASS' : 'FAIL'}${category} (${String(s.score * 100)}%)`,
			);
			if (!s.passed) {
				if (s.execErrors.length > 0) {
					console.log(`    Error: ${s.execErrors.join('; ').slice(0, 200)}`);
				}
				console.log(`    Diagnosis: ${s.reasoning.slice(0, 200)}`);
			}
		}
		console.log('');
	}

	const passed = results.filter((r) => r.passed).length;
	const builtCount = new Set(results.filter((r) => r.buildSuccess).map((r) => r.testCaseFile)).size;
	const totalTestCases = new Set(results.map((r) => r.testCaseFile)).size;
	console.log(
		`${String(builtCount)}/${String(totalTestCases)} built | ${String(passed)}/${String(results.length)} passed (${String(results.length > 0 ? Math.round((passed / results.length) * 100) : 0)}%)`,
	);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
