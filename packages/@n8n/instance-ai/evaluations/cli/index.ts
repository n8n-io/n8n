#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Instance AI workflow eval CLI
//
// Runs workflow execution evaluations. When LANGSMITH_API_KEY is set, uses
// LangSmith's evaluate() for experiment tracking and tracing. Otherwise
// falls back to a direct loop with the same eval-results.json output.
// ---------------------------------------------------------------------------

import type { InstanceAiRunDebugResponse } from '@n8n/api-types';
import { mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { EvaluationResult } from 'langsmith/evaluation';
import type { Example, Run } from 'langsmith/schemas';
import { traceable } from 'langsmith/traceable';
import { join } from 'path';

import { aggregateResults, passAtK, passHatK } from './aggregator';
import { parseCliArgs, partialIsolationWarning } from './args';
import type { CliArgs } from './args';
import { buildCIMetadata, computeExperimentPrefix } from './ci-metadata';
import { LaneAllocator } from './lane-allocator';
import { expandWithIterations, partitionRoundRobin } from './lanes';
import {
	buildWorkflowViaMcp,
	stageLaneMcpConfig,
	unsupportedMcpBuildSetupFields,
	type McpBuildSettings,
} from './mcp-builder';
import {
	isPlainObject,
	parseTargetOutput,
	reshapeLangSmithRuns,
	sentinelOutcomeFromVerdicts,
	type TargetOutput,
} from './reshape';
import { aggregateWorkflowChecks, statusMap } from '../binaryChecks/aggregate';
import { selectAuthorExpectations } from '../build-expectations/select';
import { allFailVerdicts, verifyBuildExpectations } from '../build-expectations/verifier';
import { N8nClient } from '../clients/n8n-client';
import { bucketFromEvaluation } from '../comparison/bucket-from-evaluation';
import {
	compareBuckets,
	type ComparisonOutcome,
	type ComparisonResult,
} from '../comparison/compare';
import { fetchBaselineBucket, findLatestBaseline } from '../comparison/fetch-baseline';
import {
	formatComparisonMarkdown,
	formatComparisonTerminal,
	type RerunHint,
} from '../comparison/format';
import { evaluateGate, isGatedTier, type GateResult } from '../comparison/gate';
import { cleanupCredentials } from '../credentials/seeder';
import { loadTestCases } from '../data/source';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import { captureThreadRunDebug } from '../harness/capture-run-debug';
import { EVAL_WORKSPACE_NAME, resolveEvalWorkspaceId } from '../harness/langsmith-seed';
import { createLogger } from '../harness/logger';
import type { EvalLogger } from '../harness/logger';
import {
	cleanupPrebuiltWorkflows,
	fetchPrebuiltBuild,
	loadPrebuiltManifest,
	partitionByPrebuiltCoverage,
	pickPrebuiltWorkflowId,
	type PrebuiltManifest,
} from '../harness/prebuilt-workflows';
import {
	abortedWorkflowTestCaseResult,
	buildWorkflow,
	executeScenario,
	cleanupBuild,
	runWorkflowChecks,
	effectiveTimeoutMs,
	runWorkflowTestCase,
	runWithConcurrency,
	workflowExpectedForCase,
	type BuildResult,
} from '../harness/runner';
import {
	classifyScenarioExecutionError,
	extractErrorMessage,
	isTransientNetworkError,
	MAX_EXEC_ATTEMPTS,
	shouldRetryScenarioExecution,
} from '../harness/transient-error';
import {
	BUILD_ONLY_SCENARIO_NAME,
	syncDataset,
	type DatasetExampleInputs,
} from '../langsmith/dataset-sync';
import { seedMcpRegistry } from '../mcp-registry/seeder';
import { snapshotWorkflowIds } from '../outcome/workflow-discovery';
import { writeRunDebugReport } from '../report/run-debug-report';
import { writeWorkflowReport } from '../report/workflow-report';
import { rollupCaseVerification } from '../summary';
import type {
	BuildExpectationResult,
	MultiRunEvaluation,
	ExecutionScenario,
	TranscriptTurn,
	WorkflowTestCase,
	WorkflowTestCaseResult,
} from '../types';
import { caseDisplayPrompt, conversationUserTurnsAsText } from '../utils/conversation-text';

// n8n degrades above ~4 concurrent builds.
const MAX_CONCURRENT_BUILDS = 4;

/** Attempts (initial + retries) for a build hitting transient network errors. */
const MAX_BUILD_ATTEMPTS = 3;

/** Framework-noise share above which a baseline capture gets a quality warning. */
const BASELINE_MAX_FRAMEWORK_NOISE_RATE = 0.05;

/** Count framework-noise trials and cases that failed on nothing but noise. */
function assessFrameworkNoise(
	evaluation: MultiRunEvaluation,
	slugByTestCase?: Map<WorkflowTestCase, string>,
): { frameworkTrials: number; totalTrials: number; fullyNoisyCases: string[] } {
	let frameworkTrials = 0;
	let totalTrials = 0;
	const fullyNoisyCases: string[] = [];
	for (const tc of evaluation.testCases) {
		let caseFramework = 0;
		let caseTotal = 0;
		for (const sa of tc.executionScenarios) {
			for (const run of sa.runs) {
				if (run.incomplete) continue;
				caseTotal++;
				if (!run.success && run.failureCategory === 'framework_issue') caseFramework++;
			}
		}
		frameworkTrials += caseFramework;
		totalTrials += caseTotal;
		if (caseTotal > 0 && caseFramework === caseTotal) {
			fullyNoisyCases.push(slugByTestCase?.get(tc.testCase) ?? caseDisplayPrompt(tc.testCase));
		}
	}
	return { frameworkTrials, totalTrials, fullyNoisyCases };
}

/** Target input shape with the iteration index we inject for multi-run. */
type TargetInputs = DatasetExampleInputs & { _iteration?: number };

interface Lane {
	client: N8nClient;
	/** Base URL the client was constructed with, forwarded for the HTML report. */
	baseUrl: string;
	preRunWorkflowIds: Set<string>;
	claimedWorkflowIds: Set<string>;
	/** Credentials created for test cases on this lane; cleaned up after the run. */
	createdCredentialIds: Set<string>;
	/** Workflows built/fetched on THIS lane to delete after the run (opt-in). Kept
	 *  per-lane because prebuilt/MCP-built workflows only exist on their own lane —
	 *  deleting them via another lane's client would 404. */
	workflowIdsToDelete: Set<string>;
	/** Staged `claude` MCP config for this lane (`--build-via-mcp` only). Points
	 *  `claude -p` at this lane's own MCP server + minted API key. Cleaned up on exit. */
	mcpConfigPath?: string;
}

/** One `claude` build's Anthropic spend (`--build-via-mcp` only). Mirrors
 *  McpBuildResult: the numbers cover the LAST attempt, so totals are a lower
 *  bound when retries happened (same semantics as the manifest flow's stats). */
interface McpBuildSpend {
	costUsd: number;
	turns: number;
}

interface RunConfig {
	args: CliArgs;
	lanes: Lane[];
	logger: EvalLogger;
	testCasesWithFiles: WorkflowTestCaseWithFile[];
	prebuiltManifest?: PrebuiltManifest;
	/** When true, workflows built/fetched this run are deleted afterwards: prebuilt
	 *  workflows opted in via --delete-prebuilt-workflows, or throwaway workflows
	 *  built by --build-via-mcp (unless --keep-workflows). Tracked per-lane on
	 *  `lane.workflowIdsToDelete`. */
	cleanupBuiltWorkflows: boolean;
	/** Directory for per-build `claude` logs (`--build-via-mcp` only). */
	mcpBuildLogDir?: string;
	/** Per-build `claude` spend, appended by buildWorkflowViaMcpOnLane across all
	 *  lanes (`--build-via-mcp` only; stays empty otherwise). Aggregated into
	 *  LangSmith experiment metadata and eval-results.json — the run's only spend
	 *  record beyond raw session logs, for a suite that's manual-only due to cost. */
	mcpBuildSpend: McpBuildSpend[];
	/** Optional sink the direct loop pushes each completed iteration's results into
	 *  as they finish, so an abort that rejects the run still leaves the caller
	 *  (runEvalAndPersist) with the scenarios that already completed. */
	partialResults?: WorkflowTestCaseResult[][];
}

/** Map eval CLI args to the shared MCP builder's settings. */
function mcpBuildSettingsFromArgs(args: CliArgs): McpBuildSettings {
	return {
		serverName: args.mcpServerName,
		model: args.buildModel,
		maxAttempts: args.buildMaxAttempts,
		mcpTimeoutMs: args.buildMcpTimeoutMs,
		buildTimeoutMs: args.buildTimeoutMs,
		buildCwd: args.buildCwd,
	};
}

/**
 * Build a workflow on `lane` by driving that lane's MCP server with `claude -p`,
 * then adapt it into a BuildResult by fetching it back (prebuilt-style) — so the
 * verify path is identical to `--prebuilt-workflows`. Never throws: a failed
 * build resolves to an unsuccessful BuildResult. The workflow lives on `lane`,
 * so the caller must verify it on that same lane.
 */
async function buildWorkflowViaMcpOnLane(config: {
	lane: Lane;
	conversation: WorkflowTestCase['conversation'];
	slug: string;
	iteration: number;
	args: CliArgs;
	logDir: string;
	logger: EvalLogger;
	/** Run-wide spend collector; every attempt is recorded, success or not. */
	buildSpend: McpBuildSpend[];
}): Promise<BuildResult> {
	const { lane, conversation, slug, iteration, args, logDir, logger, buildSpend } = config;
	if (!lane.mcpConfigPath) {
		return {
			success: false,
			error: `Lane ${lane.baseUrl} has no staged MCP config — cannot build via MCP`,
			workflowJsons: [],
			createdWorkflowIds: [],
			createdDataTableIds: [],
		};
	}

	const result = await buildWorkflowViaMcp({
		conversation: conversation ?? [],
		slug,
		iteration,
		mcpConfigPath: lane.mcpConfigPath,
		settings: mcpBuildSettingsFromArgs(args),
		logDir,
		log: (message) => logger.info(message),
	});

	// Record spend whether or not the build produced a workflow — failed builds
	// cost money too, and this is the run's spend record.
	buildSpend.push({ costUsd: result.cost, turns: result.turns });

	// Register for cleanup the moment the id exists. If the fetch-back below
	// fails, the failure BuildResult carries no workflowId, so success-guarded
	// bookkeeping at the call sites would never see it and the workflow would
	// survive the run despite cleanup being on. On this path cleanup is exactly
	// !keepWorkflows (--delete-prebuilt-workflows is rejected with --build-via-mcp).
	if (result.workflowId && !args.keepWorkflows) {
		lane.workflowIdsToDelete.add(result.workflowId);
	}

	if (!result.workflowId) {
		return {
			success: false,
			error: `MCP build produced no workflow (${result.failureReason ?? 'unknown'})`,
			workflowJsons: [],
			createdWorkflowIds: [],
			createdDataTableIds: [],
		};
	}

	return await fetchPrebuiltBuild(lane.client, result.workflowId, logger);
}

async function main(): Promise<void> {
	const args = parseCliArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	let testCasesWithFiles = await loadTestCases(args, logger);

	const prebuiltManifest = args.prebuiltWorkflows
		? loadPrebuiltManifest(args.prebuiltWorkflows)
		: undefined;
	if (prebuiltManifest) {
		// Multi-lane is for distributing the orchestrator build phase across
		// n8n instances. Prebuilt workflows live on a single instance — fetching
		// them from any other lane's URL would 404 — and prebuilt mode skips
		// builds anyway, so multi-lane buys nothing. Refuse the combination
		// rather than silently fetching from one lane and ignoring the rest.
		if (args.baseUrls.length > 1) {
			throw new Error(
				'--prebuilt-workflows is incompatible with multiple --base-url values. Prebuilt workflows live on a single n8n instance; pass exactly one --base-url.',
			);
		}
		const slugCount = Object.keys(prebuiltManifest).length;
		logger.info(`Loaded prebuilt manifest: ${String(slugCount)} test case(s)`);

		// Typo-check manifest slugs against known cases; skip when filtered (a
		// deselected slug isn't a typo, else we'd warn on every filtered-out entry).
		if (!args.filter && !args.exclude && !args.tier) {
			const knownSlugs = new Set(testCasesWithFiles.map((tc) => tc.fileSlug));
			const orphanSlugs = Object.keys(prebuiltManifest).filter((slug) => !knownSlugs.has(slug));
			if (orphanSlugs.length > 0) {
				logger.warn(
					`Prebuilt manifest references ${String(orphanSlugs.length)} slug(s) with no matching test case (will be ignored): ${orphanSlugs.join(', ')}`,
				);
			}
		}

		// Skip selected cases the manifest has no build for, rather than silently
		// orchestrator-building them (which would mix builders in one result set).
		const { covered, skipped } = partitionByPrebuiltCoverage(testCasesWithFiles, prebuiltManifest);
		if (skipped.length > 0) {
			logger.warn(
				`Prebuilt: skipping ${String(skipped.length)} selected case(s) with no workflow in the manifest: ${skipped.map((tc) => tc.fileSlug).join(', ')}`,
			);
		}
		if (covered.length === 0) {
			throw new Error('Prebuilt manifest covers none of the selected test cases — nothing to run.');
		}
		testCasesWithFiles = covered;
	}

	// `claude -p` builds get only the flattened conversation — build-side setup
	// (credentials, seeds) is orchestrator-only. Skip cases that declare it
	// rather than building them without prerequisites and reporting misleading
	// failures (mirrors the prebuilt-coverage partition above).
	if (args.buildViaMcp) {
		const skippedMcp: string[] = [];
		testCasesWithFiles = testCasesWithFiles.filter(({ testCase, fileSlug }) => {
			const fields = unsupportedMcpBuildSetupFields(testCase);
			if (fields.length === 0) return true;
			skippedMcp.push(`${fileSlug} (${fields.join(', ')})`);
			return false;
		});
		if (skippedMcp.length > 0) {
			logger.warn(
				`MCP build: skipping ${String(skippedMcp.length)} selected case(s) with setup fields the \`claude\` build path cannot honor: ${skippedMcp.join('; ')}`,
			);
		}
		if (testCasesWithFiles.length === 0) {
			throw new Error(
				'--build-via-mcp supports none of the selected test cases (all declare orchestrator-only setup fields) — nothing to run.',
			);
		}
	}

	// Per-build `claude` logs (--build-via-mcp only). One shared dir; filenames
	// are slug/iteration/attempt-scoped so concurrent lanes never collide.
	const mcpBuildLogDir = args.buildViaMcp
		? join(args.outputDir ?? process.cwd(), 'mcp-build-logs')
		: undefined;
	if (mcpBuildLogDir) mkdirSync(mcpBuildLogDir, { recursive: true });

	// Remove staged MCP configs (they embed the lane's bearer token) on exit,
	// belt-and-suspenders alongside the explicit finally cleanup below.
	// Registered before lane init and populated as configs are staged, so a
	// lane failing setup can't strand another lane's already-staged token file.
	const stagedMcpConfigPaths: string[] = [];
	const cleanupStagedMcpConfigs = () => {
		for (const path of stagedMcpConfigPaths) {
			try {
				unlinkSync(path);
			} catch {
				// best-effort
			}
		}
	};
	if (args.buildViaMcp) process.on('exit', cleanupStagedMcpConfigs);

	// One lane per base URL. The LangSmith path then uses a work-stealing
	// allocator (lane-allocator.ts) to dispatch builds across lanes; the direct
	// path partitions test cases statically per lane.
	const lanes: Lane[] = await Promise.all(
		args.baseUrls.map(async (baseUrl, idx) => {
			const tag =
				args.baseUrls.length > 1
					? ` [lane ${String(idx + 1)}/${String(args.baseUrls.length)}]`
					: '';
			const client = new N8nClient(baseUrl);
			logger.info(`Authenticating with ${baseUrl}...${tag}`);
			await client.login(args.email, args.password);
			logger.success(`Authenticated${tag}`);

			logger.info(`Seeding MCP registry...${tag}`);
			const mcpSeedResult = await seedMcpRegistry(client, logger);
			if (mcpSeedResult.seeded) {
				logger.info(`Seeded ${String(mcpSeedResult.count)} MCP registry server(s)${tag}`);
			} else {
				logger.info(`Skipped MCP registry seed (test endpoint unavailable)${tag}`);
			}

			// --build-via-mcp: enable MCP, mint this lane's own API key, and stage a
			// `claude` MCP config pointing at this lane's MCP server. Each lane is a
			// self-contained build+verify target — a workflow built here is verified
			// here, so N lanes parallelize the whole pipeline within one process.
			let mcpConfigPath: string | undefined;
			if (args.buildViaMcp) {
				await client.enableMcpAccess();
				const apiKey = await client.rotateMcpApiKey();
				mcpConfigPath = stageLaneMcpConfig({
					serverName: args.mcpServerName,
					url: `${baseUrl}/mcp-server/http`,
					apiKey,
				});
				stagedMcpConfigPaths.push(mcpConfigPath);
				logger.info(`Staged MCP build config${tag}`);
			}

			const preRunWorkflowIds = await snapshotWorkflowIds(client);
			const claimedWorkflowIds = new Set<string>();
			const createdCredentialIds = new Set<string>();
			const workflowIdsToDelete = new Set<string>();
			return {
				client,
				baseUrl,
				preRunWorkflowIds,
				claimedWorkflowIds,
				createdCredentialIds,
				workflowIdsToDelete,
				mcpConfigPath,
			};
		}),
	);

	const startTime = Date.now();
	// Delete workflows after the run when they're throwaway: prebuilt opt-in
	// (--delete-prebuilt-workflows) or MCP builds (--build-via-mcp, unless
	// --keep-workflows). Tracked per-lane on lane.workflowIdsToDelete.
	const cleanupBuiltWorkflows =
		args.deletePrebuiltWorkflows || (args.buildViaMcp && !args.keepWorkflows);

	const mcpBuildSpend: McpBuildSpend[] = [];
	const commitSha = process.env.LANGSMITH_REVISION_ID ?? process.env.GITHUB_SHA;

	try {
		const hasLangSmith = Boolean(process.env.LANGSMITH_API_KEY);

		// runEvalAndPersist owns the always-write guarantee: it writes
		// eval-results.json even if the run below throws (a budget/timeout abort, a
		// lane meltdown, an OOM), aggregating whatever completed scenarios were
		// pushed into `partialResults` so the dispatcher never finds no file.
		const { evaluation, slugByTestCase, outcome, gate, jsonPath, prCommentPath } =
			await runEvalAndPersist(
				{
					logger,
					outputDir: args.outputDir,
					startTime,
					iterations: args.iterations,
					tier: args.tier,
					commitSha,
					rerun: ciRerunHint(),
					mcpBuildSpend,
				},
				async (partialResults) => {
					if (hasLangSmith) {
						logger.info('LangSmith API key detected, using evaluate() with experiment tracking');
						const langsmithRun = await runWithLangSmith({
							args,
							lanes,
							logger,
							testCasesWithFiles,
							prebuiltManifest,
							cleanupBuiltWorkflows,
							mcpBuildLogDir,
							mcpBuildSpend,
						});
						return {
							evaluation: langsmithRun.evaluation,
							experimentName: langsmithRun.experimentName,
							experimentUrl: langsmithRun.experimentUrl,
							outcome: langsmithRun.outcome,
							slugByTestCase: langsmithRun.slugByTestCase,
						};
					}
					logger.info(
						'No LANGSMITH_API_KEY, running direct loop (results in eval-results.json only)',
					);
					const directRun = await runDirectLoop({
						args,
						lanes,
						logger,
						testCasesWithFiles,
						prebuiltManifest,
						cleanupBuiltWorkflows,
						mcpBuildLogDir,
						mcpBuildSpend,
						partialResults,
					});
					return { evaluation: directRun.evaluation, slugByTestCase: directRun.slugByTestCase };
				},
			);

		console.log(`Results:    ${jsonPath}`);
		console.log(`PR comment: ${prCommentPath}`);
		const reportResults = flattenRunsForReport(evaluation);
		const htmlPath = writeWorkflowReport(reportResults);
		console.log(`Report:     ${htmlPath}`);
		const debugHtmlPath = writeRunDebugReport(reportResults);
		console.log(`LLM debug:  ${debugHtmlPath}`);
		console.log(
			'\n' + formatComparisonTerminal(evaluation, outcome, { commitSha, slugByTestCase, gate }),
		);

		// Advisory only: findLatestBaseline trusts the newest experiment by
		// prefix, so surface elevated harness noise for the humans reading the log.
		if (args.experimentName?.startsWith('instance-ai-baseline')) {
			const { frameworkTrials, totalTrials, fullyNoisyCases } = assessFrameworkNoise(
				evaluation,
				slugByTestCase,
			);
			const noiseRate = totalTrials > 0 ? frameworkTrials / totalTrials : 0;
			if (noiseRate > BASELINE_MAX_FRAMEWORK_NOISE_RATE || fullyNoisyCases.length > 0) {
				console.warn(
					`Baseline quality warning: ${String(frameworkTrials)}/${String(totalTrials)} trials (${(noiseRate * 100).toFixed(1)}%) failed for harness reasons` +
						' (lane transport, seeding, timeouts) rather than agent behavior' +
						(fullyNoisyCases.length > 0
							? `; cases with only framework failures: ${fullyNoisyCases.join(', ')}`
							: '') +
						'. This experiment becomes the comparison target for future runs, but those scenarios will' +
						' under-count the agent — deltas against them may reflect harness noise, not regressions or' +
						' improvements. Consider fixing the noise and re-capturing.',
				);
			}
		}
	} finally {
		// Per-lane cleanup: each lane only holds the workflows built/fetched on it,
		// so delete them via that lane's own client (multi-lane MCP builds spread
		// workflows across lanes; a single-lane cleanup would 404 on the rest).
		await Promise.all(
			lanes.map(async (lane) => {
				if (cleanupBuiltWorkflows && lane.workflowIdsToDelete.size > 0) {
					await cleanupPrebuiltWorkflows(lane.client, lane.workflowIdsToDelete, logger);
				}
				await cleanupCredentials(lane.client, [...lane.createdCredentialIds]).catch(() => {});
			}),
		);
		cleanupStagedMcpConfigs();
	}
}

// ---------------------------------------------------------------------------
// LangSmith mode: evaluate() with dataset sync, tracing, experiments
// ---------------------------------------------------------------------------

async function runWithLangSmith(config: RunConfig): Promise<{
	evaluation: MultiRunEvaluation;
	experimentName: string;
	experimentUrl: string | undefined;
	outcome: ComparisonOutcome | undefined;
	slugByTestCase: Map<WorkflowTestCase, string>;
}> {
	const {
		args,
		lanes,
		logger,
		testCasesWithFiles,
		prebuiltManifest,
		cleanupBuiltWorkflows,
		mcpBuildLogDir,
		mcpBuildSpend,
	} = config;

	if (testCasesWithFiles.length === 0) {
		logger.info('No workflow test cases selected (check --source / --filter / --exclude / --tier)');
		return {
			evaluation: { totalRuns: 0, testCases: [] },
			experimentName: '',
			experimentUrl: undefined,
			outcome: { kind: 'no_baseline' },
			slugByTestCase: new Map(),
		};
	}

	// A dedicated dataset and baseline prefix are the two halves of cohort
	// isolation; overriding only one silently touches shared Instance AI data.
	const isolationWarning = partialIsolationWarning(args.dataset, args.baselinePrefix);
	if (isolationWarning) logger.warn(isolationWarning);

	// Pin eval writes to the eval workspace; our PAT would otherwise default to Prod.
	const workspaceId = await resolveEvalWorkspaceId();
	if (workspaceId) {
		logger.info(
			`Pinning eval experiments to LangSmith workspace "${EVAL_WORKSPACE_NAME}" (${workspaceId})`,
		);
	}
	const lsClient = new Client(workspaceId ? { workspaceId } : {});
	const datasetName = await syncDataset(lsClient, args.dataset, logger, testCasesWithFiles);

	// Stash transcripts by threadId so reshapeLangSmithRuns can merge them in —
	// the LangSmith target() output schema doesn't carry the full transcript.
	const transcriptByThreadId = new Map<string, TranscriptTurn[]>();
	// Build-expectation verdicts, judged once per build and merged by the build-cache
	// key (`iteration:fileSlug`) rather than threadId — so prebuilt/MCP builds, which
	// have no threadId, still get their outcome expectations judged and counted.
	// Fired during getOrBuild, awaited before reshapeLangSmithRuns.
	const buildExpectationsByKey = new Map<string, Promise<BuildExpectationResult[]>>();
	const runDebugByThreadId = new Map<string, Promise<InstanceAiRunDebugResponse[]>>();

	// LangSmith dataset rows carry only per-scenario fields. The build-side
	// fields (conversation, expectations, declared credentials) are sourced
	// locally, keyed by fileSlug.
	const testCaseByFileSlug = new Map<string, WorkflowTestCase>();
	for (const { testCase, fileSlug } of testCasesWithFiles) {
		testCaseByFileSlug.set(fileSlug, testCase);
	}

	// LaneState carries the allocator-managed counters (activeBuilds,
	// inflightKeys) plus the lane's traced LangSmith wrappers. `runner` is
	// the underlying Lane (n8n client, credential state) — named distinctly so
	// it doesn't shadow the iteration variable `lane` in lanes.map().
	type BuildArgs = Pick<
		WorkflowTestCase,
		| 'conversation'
		| 'messageBudget'
		| 'credentials'
		| 'seedFile'
		| 'priorConversation'
		| 'seedThread'
		| 'executionScenarios'
		| 'outcomeExpectations'
	> & { timeoutMs: number };
	interface LaneState {
		runner: Lane;
		laneNum: number;
		activeBuilds: number;
		inflightKeys: Set<string>;
		tracedBuild: (buildArgs: BuildArgs) => Promise<BuildResult>;
		tracedExecute: (execArgs: {
			workflowId: string;
			scenario: ExecutionScenario;
			workflowJsons: BuildResult['workflowJsons'];
			buildTrace?: BuildResult['buildTrace'];
			timeoutMs: number;
		}) => Promise<Awaited<ReturnType<typeof executeScenario>>>;
	}

	const laneStates: LaneState[] = lanes.map((lane, idx) => {
		const laneNum = idx + 1;
		const laneTag = lanes.length > 1 ? ` [lane ${String(laneNum)}/${String(lanes.length)}]` : '';
		return {
			runner: lane,
			laneNum,
			activeBuilds: 0,
			inflightKeys: new Set<string>(),
			tracedBuild: traceable(
				async (buildArgs: BuildArgs) =>
					await buildWorkflow({
						client: lane.client,
						conversation: buildArgs.conversation,
						messageBudget: buildArgs.messageBudget,
						credentials: buildArgs.credentials,
						seedFile: buildArgs.seedFile,
						priorConversation: buildArgs.priorConversation,
						seedThread: buildArgs.seedThread,
						createdCredentialIds: lane.createdCredentialIds,
						timeoutMs: buildArgs.timeoutMs,
						preRunWorkflowIds: lane.preRunWorkflowIds,
						claimedWorkflowIds: lane.claimedWorkflowIds,
						logger,
						laneTag,
						workflowExpected: workflowExpectedForCase(buildArgs),
					}),
				{
					name: 'workflow_build',
					run_type: 'chain',
					client: lsClient,
					metadata: { lane: laneNum },
				},
			),
			tracedExecute: traceable(
				async (execArgs: {
					workflowId: string;
					scenario: ExecutionScenario;
					workflowJsons: BuildResult['workflowJsons'];
					buildTrace?: BuildResult['buildTrace'];
					timeoutMs: number;
				}) =>
					await executeScenario(
						lane.client,
						execArgs.workflowId,
						execArgs.scenario,
						execArgs.workflowJsons,
						logger,
						execArgs.timeoutMs,
						undefined,
						execArgs.buildTrace,
						args.pinAiRoots,
					),
				{
					name: 'scenario_execution',
					run_type: 'chain',
					client: lsClient,
					metadata: { lane: laneNum },
				},
			),
		};
	});

	// Direct fetch (not N8nClient) so a hung lane can't stall the probe.
	async function laneHealthy(lane: LaneState): Promise<boolean> {
		try {
			const res = await fetch(`${lane.runner.baseUrl}/healthz/readiness`, {
				signal: AbortSignal.timeout(5_000),
			});
			return res.ok;
		} catch {
			return false;
		}
	}

	// A build that sat out its timeout against a dead lane reports "Run timed
	// out", not "fetch failed" — so any failed build also health-probes its lane.
	async function isTransportFailure(build: BuildResult, lane: LaneState): Promise<boolean> {
		if (build.success) return false;
		if (build.error !== undefined && isTransientNetworkError(build.error)) return true;
		return !(await laneHealthy(lane));
	}

	// Work-stealing: each build acquires a lane that isn't already running its
	// fileSlug, runs there (capped per-lane), then releases. Scenarios re-use
	// the lane that built their workflow. Health options quarantine a dead lane
	// instead of letting its instant failures attract the whole queue.
	const allocator = new LaneAllocator(laneStates, MAX_CONCURRENT_BUILDS, {
		probe: laneHealthy,
		onQuarantine: (lane) =>
			logger.error(
				`[lane ${String(lane.laneNum)}] quarantined after consecutive transport failures; probing ${lane.runner.baseUrl} for recovery`,
			),
		onReadmit: (lane) => logger.info(`[lane ${String(lane.laneNum)}] healthy again — re-admitted`),
		onAllQuarantined: () =>
			logger.error('All lanes quarantined — builds paused pending lane recovery'),
	});
	const buildCache = new Map<
		string,
		Promise<{ build: BuildResult; lane: LaneState; buildDurationMs: number }>
	>();
	// Transport-evicted builds leave buildCache before any cleanup pass sees
	// them, but their artifacts (restored workflows, data tables, thread — and
	// with it the sandbox) are real. Stash them for the end-of-run drain; the
	// lane may be mid-restart at eviction time, so immediate cleanup can't work.
	const orphanedBuilds: Array<{ build: BuildResult; client: N8nClient }> = [];
	const buildDurations = new Map<string, number>();

	async function getOrBuild(
		iteration: number,
		fileSlug: string,
	): Promise<{ build: BuildResult; lane: LaneState; buildDurationMs: number }> {
		// Cache key on (iteration, fileSlug) — every scenario in a test-case file
		// shares this build, and prebuilt + orchestrator-built paths use the same key.
		const key = `${String(iteration)}:${fileSlug}`;
		const existing = buildCache.get(key);
		if (existing) return await existing;
		const promise = (async () => {
			if (args.buildViaMcp) {
				// Fused MCP build: acquire a lane (work-stealing, capped per-lane),
				// drive its MCP server with `claude` to build the workflow, then
				// verify on that SAME lane. This is what lets N lanes parallelize the
				// whole build+verify pipeline in one process (no manifest, no merge).
				const entry = testCaseByFileSlug.get(fileSlug);
				if (!entry) throw new Error(`No conversation found for fileSlug=${fileSlug}`);
				const lane = await allocator.acquire(fileSlug);
				const start = Date.now();
				let build: BuildResult;
				try {
					build = await buildWorkflowViaMcpOnLane({
						lane: lane.runner,
						conversation: entry.conversation,
						slug: fileSlug,
						iteration,
						args,
						logDir: mcpBuildLogDir ?? process.cwd(),
						logger,
						buildSpend: mcpBuildSpend,
					});
				} finally {
					// Release as soon as the build (incl. fetch-back) is done — the
					// LLM-judged bookkeeping below needs only the fetched JSON, and
					// holding the slot through it would idle the lane's build capacity.
					allocator.release(lane, fileSlug);
				}
				{
					const transient = await isTransportFailure(build, lane);
					if (!build.success) build.transportFailure = transient;
					allocator.reportBuildOutcome(lane, transient ? 'transient-failure' : 'ok');
				}
				const buildDurationMs = Date.now() - start;
				// Cleanup registration happens inside buildWorkflowViaMcpOnLane (as soon
				// as `claude` reports the id), so even a failed fetch-back is covered.
				buildDurations.set(key, buildDurationMs);
				stashTranscript(build);
				// isPrebuilt=true: MCP builds have no build transcript, so only
				// outcome expectations are judged (against the workflow), like prebuilt.
				stashBuildExpectations(key, fileSlug, build, true);
				stashRunDebug(lane.runner.client, build);
				if (build.success && !build.workflowChecks) {
					build.workflowChecks = await runWorkflowChecks({
						workflow: build.workflowJsons[0],
						prompt: conversationUserTurnsAsText(entry.conversation ?? []),
						agentText: undefined,
						logger,
					});
				}
				return { build, lane, buildDurationMs };
			}
			const prebuiltId = pickPrebuiltWorkflowId(prebuiltManifest, fileSlug, iteration);
			if (prebuiltId !== undefined) {
				// Prebuilt path: no orchestrator concurrency to manage — just
				// fetch the workflow. main() rejects multi-lane + prebuilt at
				// startup, so laneStates always has exactly one entry here.
				const lane = laneStates[0];
				const start = Date.now();
				const build = await fetchPrebuiltBuild(lane.runner.client, prebuiltId, logger);
				if (cleanupBuiltWorkflows && build.success && build.workflowId) {
					lane.runner.workflowIdsToDelete.add(build.workflowId);
				}
				const buildDurationMs = Date.now() - start;
				buildDurations.set(key, buildDurationMs);
				stashTranscript(build);
				stashBuildExpectations(key, fileSlug, build, true);
				stashRunDebug(lane.runner.client, build);
				if (build.success && !build.workflowChecks) {
					// No transcript in prebuilt mode, but the authored conversation still
					// carries the user's request — feed it so prompt-aware checks (e.g.
					// fulfills_user_request) grade against real intent instead of "".
					const conversation = testCaseByFileSlug.get(fileSlug)?.conversation ?? [];
					build.workflowChecks = await runWorkflowChecks({
						workflow: build.workflowJsons[0],
						prompt: conversationUserTurnsAsText(conversation),
						agentText: undefined,
						logger,
					});
				}
				return { build, lane, buildDurationMs };
			}
			// Orchestrator path: allocator spreads distinct fileSlugs across lanes;
			// the build cache dedupes scenarios within one file.
			const entry = testCaseByFileSlug.get(fileSlug);
			if (!entry) throw new Error(`No conversation found for fileSlug=${fileSlug}`);
			const timeoutMs = effectiveTimeoutMs(entry.complexity, args.timeoutMs);
			if (timeoutMs !== args.timeoutMs) {
				logger.info(
					`  Complex case: per-iteration budget ${String(Math.round(timeoutMs / 1000))}s [${fileSlug}]`,
				);
			}
			// Transport failures are not agent verdicts — retry on a different lane
			// instead of recording 0-score rows for every scenario of the case.
			let lane = await allocator.acquire(fileSlug);
			let build: BuildResult;
			let buildDurationMs: number;
			for (let attempt = 1; ; attempt++) {
				const start = Date.now();
				try {
					build = await lane.tracedBuild({
						conversation: entry.conversation,
						messageBudget: entry.messageBudget,
						credentials: entry.credentials,
						seedFile: entry.seedFile,
						priorConversation: entry.priorConversation,
						seedThread: entry.seedThread,
						executionScenarios: entry.executionScenarios,
						outcomeExpectations: entry.outcomeExpectations,
						timeoutMs,
					});
				} finally {
					allocator.release(lane, fileSlug);
				}
				buildDurationMs = Date.now() - start;
				const transient =
					(await isTransportFailure(build, lane)) ||
					(!build.success && allocator.wasQuarantinedSince(lane, start));
				if (!build.success) build.transportFailure = transient;
				allocator.reportBuildOutcome(lane, transient ? 'transient-failure' : 'ok');
				if (!transient || attempt >= MAX_BUILD_ATTEMPTS) break;
				logger.warn(
					`Build ${fileSlug} attempt ${String(attempt)}/${String(MAX_BUILD_ATTEMPTS)} failed transiently on lane ${String(lane.laneNum)} (${build.error ?? 'unknown'}); retrying on another lane`,
				);
				lane = await allocator.acquire(fileSlug, { not: lane });
			}
			buildDurations.set(key, buildDurationMs);
			stashTranscript(build);
			stashBuildExpectations(key, fileSlug, build, false);
			stashRunDebug(lane.runner.client, build);
			logger.info(
				`[lane ${String(lane.laneNum)}] built ${fileSlug} (iteration ${String(iteration)}) thread=${build.threadId ?? 'none'} success=${String(build.success)}`,
			);
			// Only the pairwise flow reads captured events — drop the largest chunk
			// of each BuildResult from the run-long cache.
			build.events = undefined;
			return { build, lane, buildDurationMs };
		})();
		buildCache.set(key, promise);
		// Evict transport-failed builds so a later scenario rebuilds. Agent build
		// failures stay cached — they are the verdict; rebuilding just multiplies cost.
		void promise.then(
			({ build, lane }) => {
				if (build.transportFailure) {
					orphanedBuilds.push({ build, client: lane.runner.client });
					buildCache.delete(key);
				}
			},
			() => buildCache.delete(key),
		);
		return await promise;
	}

	function stashTranscript(build: BuildResult): void {
		if (build.threadId && build.transcript) {
			transcriptByThreadId.set(build.threadId, build.transcript);
		}
	}

	function stashRunDebug(client: N8nClient, build: BuildResult): void {
		if (!build.threadId) return;
		runDebugByThreadId.set(build.threadId, captureThreadRunDebug(client, build.threadId, logger));
	}

	// Judge author expectations once per build (off the scenario critical path);
	// reshapeLangSmithRuns awaits and merges the verdicts by the build-cache key,
	// and target() embeds them in run outputs so baseline fetches can score them.
	// Full builds judge process + outcome against the real transcript; prebuilt/MCP
	// builds (no transcript) judge only outcome expectations against the workflow,
	// with the authored conversation as request context — mirroring the direct loop.
	function stashBuildExpectations(
		key: string,
		fileSlug: string,
		build: BuildResult,
		isPrebuilt: boolean,
	): void {
		const testCase = testCaseByFileSlug.get(fileSlug);
		if (!testCase) return;
		const { expectations, transcript } = selectAuthorExpectations({
			testCase,
			transcript: build.transcript,
			buildSucceeded: build.success,
			isPrebuilt,
			logger,
		});
		if (expectations.length === 0) return;
		buildExpectationsByKey.set(
			key,
			verifyBuildExpectations(expectations, {
				transcript,
				workflowJson: build.workflowJsons[0],
				metrics: build.conversationMetrics,
			}).catch((error: unknown) =>
				allFailVerdicts(
					expectations,
					`judge error: ${error instanceof Error ? error.message : String(error)}`,
				),
			),
		);
	}

	// Rows remaining per `iteration:fileSlug` build. When the last row of a
	// build finishes, its backend artifacts (workflow, data tables, thread — and
	// with the thread its sandbox) are deleted right away instead of at the end
	// of the run: sandboxes have no auto-cleanup, so end-of-run-only deletion
	// let the sandbox runner grow to ~15 GB over a full N=10 baseline.
	// --keep-workflows deliberately keeps everything, thread/sandbox included —
	// it's a debugging flag for small filtered runs, not baselines.
	const remainingRowsByKey = new Map<string, number>();

	function rowsPerCase(fileSlug: string): number {
		const scenarios = testCaseByFileSlug.get(fileSlug)?.executionScenarios?.length ?? 0;
		return Math.max(1, scenarios); // scenario-less cases get one build-only row
	}

	async function releaseCaseRow(iteration: number, fileSlug: string): Promise<void> {
		const key = `${String(iteration)}:${fileSlug}`;
		const remaining = (remainingRowsByKey.get(key) ?? rowsPerCase(fileSlug)) - 1;
		remainingRowsByKey.set(key, remaining);
		if (remaining > 0 || args.keepWorkflows) return;
		const cached = buildCache.get(key);
		if (!cached) return; // evicted (transport failure) — nothing to clean
		try {
			const { build, lane } = await cached;
			// Run-debug capture reads the thread — let it settle before deletion.
			if (build.threadId) await runDebugByThreadId.get(build.threadId)?.catch(() => {});
			const clean = await cleanupBuild(lane.runner.client, build, logger);
			if (!clean) {
				// Leave the entry in buildCache — the end-of-run pass retries it.
				logger.verbose(
					`  [cleanup] ${fileSlug} (iteration ${String(iteration)}) incomplete, retrying at end of run`,
				);
				return;
			}
			buildCache.delete(key);
			logger.verbose(`  [cleanup] ${fileSlug} (iteration ${String(iteration)}) artifacts deleted`);
		} catch {
			// Best-effort — a failed cleanup must never fail the row.
		}
	}

	const target = async (inputs: TargetInputs): Promise<TargetOutput> => {
		const iteration = inputs._iteration ?? 0;
		try {
			return await targetRow(inputs, iteration);
		} catch (error: unknown) {
			// targetRow guards scenario execution internally, but a build-phase throw
			// (getOrBuild) or a budget abort must not reject up to evaluate() and
			// abort the whole experiment — that would discard every OTHER row's
			// completed results. Record this row as an aborted (framework_issue)
			// output instead so evaluate() finalizes and writeEvalResults still runs.
			const message = extractErrorMessage(error);
			logger.error(`    ERROR [${inputs.scenarioName}] (${inputs.testCaseFile}): ${message}`);
			const classified = classifyScenarioExecutionError(message);
			return {
				buildSuccess: false,
				passed: false,
				score: 0,
				reasoning: classified.reasoning,
				failureCategory: classified.failureCategory,
				rootCause: classified.rootCause,
				execErrors: [message],
				buildDurationMs: 0,
				execDurationMs: 0,
				nodeCount: 0,
			};
		} finally {
			await releaseCaseRow(iteration, inputs.testCaseFile);
		}
	};

	const targetRow = async (inputs: TargetInputs, iteration: number): Promise<TargetOutput> => {
		const scenario: ExecutionScenario = {
			name: inputs.scenarioName,
			description: inputs.scenarioDescription,
			dataSetup: inputs.dataSetup,
			successCriteria: inputs.successCriteria,
		};

		const {
			build,
			lane: builtOnLane,
			buildDurationMs,
		} = await getOrBuild(iteration, inputs.testCaseFile);

		// Stashed at build time with a `.catch` attached, so awaiting never rejects.
		// Awaited only after each branch's own work is done, keeping the judge off
		// the scenario critical path while persisting verdicts to run outputs.
		const verdictsPromise = buildExpectationsByKey.get(
			`${String(iteration)}:${inputs.testCaseFile}`,
		);
		const attachExpectations = async (output: TargetOutput): Promise<TargetOutput> => {
			const verdicts = await verdictsPromise;
			return verdicts && verdicts.length > 0 ? { ...output, expectationResults: verdicts } : output;
		};

		// Build-only case — the build plus its expectation judging (in getOrBuild) is the
		// whole test; skip execution. The sentinel's outcome IS the expectation verdicts,
		// so LangSmith pass metrics stay truthful for scenario-less cases. Checked before
		// the workflowId guard because answer-only cases legitimately end without a
		// workflow (workflowExpectedForCase).
		if (inputs.scenarioName === BUILD_ONLY_SCENARIO_NAME && build.success) {
			const verdicts = await verdictsPromise;
			const outcome = sentinelOutcomeFromVerdicts(verdicts);
			return {
				buildSuccess: true,
				workflowId: build.workflowId,
				passed: outcome.passed,
				score: outcome.score,
				reasoning: outcome.reasoning,
				failureCategory: outcome.failureCategory,
				...(outcome.incomplete ? { incomplete: true } : {}),
				execErrors: [],
				buildDurationMs,
				execDurationMs: 0,
				nodeCount: build.workflowJsons[0]?.nodes.length ?? 0,
				threadId: build.threadId,
				workflowChecks: build.workflowChecks,
				workflowJson: build.workflowJsons[0],
				buildTrace: build.buildTrace,
				...(verdicts && verdicts.length > 0 ? { expectationResults: verdicts } : {}),
			};
		}

		if (!build.success || !build.workflowId) {
			return await attachExpectations({
				buildSuccess: false,
				passed: false,
				score: 0,
				reasoning: `Build failed: ${build.error ?? 'unknown'}`,
				// Seeding and transport failures are harness problems, not agent build
				// failures — keep them out of the agent's build_failure bucket.
				failureCategory:
					build.seedingFailed || build.transportFailure ? 'framework_issue' : 'build_failure',
				execErrors: build.error ? [build.error] : [],
				buildDurationMs,
				execDurationMs: 0,
				nodeCount: 0,
				threadId: build.threadId,
				workflowChecks: build.workflowChecks,
				buildTrace: build.buildTrace,
				planRejections: build.proxyDecisionStats?.rejection ?? 0,
			});
		}

		const execStart = Date.now();
		const nodeCount = build.workflowJsons[0]?.nodes.length ?? 0;
		let result;
		for (let attempt = 1; ; attempt++) {
			try {
				result = await builtOnLane.tracedExecute({
					workflowId: build.workflowId,
					scenario,
					workflowJsons: build.workflowJsons,
					buildTrace: build.buildTrace,
					timeoutMs: effectiveTimeoutMs(
						testCaseByFileSlug.get(inputs.testCaseFile)?.complexity,
						args.timeoutMs,
					),
				});
				break;
			} catch (error: unknown) {
				const errorMessage = extractErrorMessage(error);
				if (shouldRetryScenarioExecution(errorMessage, attempt)) {
					logger.warn(
						`    [${scenario.name}] execution attempt ${attempt}/${MAX_EXEC_ATTEMPTS} failed (${errorMessage}); retrying`,
					);
					await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
					continue;
				}
				// Mirror direct mode's per-scenario guard — without this, n8n API errors,
				// verifier timeouts, or a per-iteration budget abort from
				// executeWithLlmMock / verifyChecklist would escape to LangSmith, come
				// back as a Run with null outputs, and be misclassified as builder
				// regressions by the feedback extractor. classifyScenarioExecutionError
				// stamps framework_issue + a timeout-flavoured rootCause for budget aborts.
				logger.error(`    ERROR [${scenario.name}]: ${errorMessage}`);
				const classified = classifyScenarioExecutionError(errorMessage);
				return await attachExpectations({
					buildSuccess: true,
					workflowId: build.workflowId,
					passed: false,
					score: 0,
					reasoning: classified.reasoning,
					failureCategory: classified.failureCategory,
					rootCause: classified.rootCause,
					execErrors: [errorMessage],
					buildDurationMs,
					execDurationMs: Date.now() - execStart,
					nodeCount,
					threadId: build.threadId,
					workflowChecks: build.workflowChecks,
					workflowJson: build.workflowJsons[0],
					buildTrace: build.buildTrace,
					planRejections: build.proxyDecisionStats?.rejection ?? 0,
				});
			}
		}
		const execDurationMs = Date.now() - execStart;

		// Strip failure fields on pass: the verifier sometimes returns "."
		// placeholders instead of omitting them.
		const failureCategory = result.success ? undefined : result.failureCategory;
		const rootCause = result.success ? undefined : result.rootCause;

		return await attachExpectations({
			buildSuccess: true,
			workflowId: build.workflowId,
			scenarioWorkflowId: result.workflowId,
			passed: result.success,
			score: result.score,
			reasoning: result.reasoning,
			failureCategory,
			rootCause,
			...(result.incomplete ? { incomplete: true } : {}),
			execErrors: result.evalResult?.errors ?? [],
			evalResult: result.evalResult,
			buildDurationMs,
			execDurationMs,
			nodeCount,
			threadId: build.threadId,
			workflowChecks: build.workflowChecks,
			workflowJson: build.workflowJsons[0],
			buildTrace: build.buildTrace,
			planRejections: build.proxyDecisionStats?.rejection ?? 0,
		});
	};

	const feedbackExtractor = ({ run }: { run: Run }): EvaluationResult[] => {
		const output = parseTargetOutput(run.outputs);
		if (!output) return [];
		// 'none' for passed scenarios so the column shows a full categorical
		// breakdown instead of blank cells.
		const failureCategory = output.passed ? 'none' : (output.failureCategory ?? 'unknown');
		// Verifier-incomplete runs get no scenario_pass score so LangSmith
		// experiment averages match the local evaluated-only pass rate.
		const feedback: EvaluationResult[] = [
			...(output.incomplete
				? []
				: [
						{
							key: 'scenario_pass',
							score: output.score,
							comment: output.reasoning || undefined,
						},
					]),
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
		// Deterministic conversation counter (per evals rubric) — a navigation/feature
		// signal for the HOW judges, not a gating check.
		if (output.planRejections !== undefined) {
			feedback.push({ key: 'plan_rejection_count', score: output.planRejections });
		}
		// Skip N/A so LangSmith column averages reduce to per-check pass-rate.
		if (output.workflowChecks) {
			for (const outcome of output.workflowChecks) {
				if (outcome.status === 'n_a' || outcome.status === 'error') continue;
				feedback.push({
					key: `evals.workflows.${outcome.dimension}.${outcome.name}`,
					score: outcome.status === 'pass' ? 1 : 0,
					comment: outcome.comment ?? undefined,
				});
			}
		}
		return feedback;
	};

	const experimentPrefix = args.experimentName ?? computeExperimentPrefix();

	logger.info(
		`Starting evaluate() with concurrency=${String(args.concurrency)}, ${String(lanes.length)} lane(s) × ${String(MAX_CONCURRENT_BUILDS)} concurrent builds, iterations=${String(args.iterations)}`,
	);

	// Filter the dataset to the selected slugs — the sync is additive, so orphans
	// accumulate and we only want scenarios for currently-selected cases.
	const sourceExamples = filteredExamplesIterable(
		lsClient,
		datasetName,
		testCasesWithFiles.map((tc) => tc.fileSlug),
		logger,
	);
	const evaluateData =
		args.iterations > 1
			? expandExamplesForIterations(sourceExamples, args.iterations)
			: sourceExamples;

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
				exclude: args.exclude ?? null,
				tier: args.tier ?? null,
				prebuilt: prebuiltManifest !== undefined,
				baselinePrefix: args.baselinePrefix,
				concurrency: args.concurrency,
				maxBuilds: MAX_CONCURRENT_BUILDS,
				lanes: lanes.length,
				iterations: args.iterations,
				...buildCIMetadata(),
			},
		});
		const totalDurationMs = Date.now() - evaluateStart;

		logger.info(`Experiment: ${experimentResults.experimentName}`);
		await lsClient.awaitPendingTraceBatches();

		const buildExpectationsResolved = new Map<string, BuildExpectationResult[]>();
		for (const [key, verdictsPromise] of buildExpectationsByKey) {
			buildExpectationsResolved.set(key, await verdictsPromise);
		}
		const runDebugResolved = new Map<string, InstanceAiRunDebugResponse[]>();
		for (const [threadId, runDebugPromise] of runDebugByThreadId) {
			runDebugResolved.set(threadId, await runDebugPromise);
		}
		const allRunResults = reshapeLangSmithRuns(
			experimentResults.results,
			testCasesWithFiles,
			args.iterations,
			transcriptByThreadId,
			buildExpectationsResolved,
			lanes[0]?.baseUrl,
			runDebugResolved,
		);
		const evaluation = aggregateResults(allRunResults, args.iterations);

		await updateExperimentAggregates({
			lsClient,
			experimentName: experimentResults.experimentName,
			runs: experimentResults.results,
			evaluation,
			buildDurations,
			totalDurationMs,
			logger,
			// Only meaningful when we drove the build via MCP; otherwise the builder
			// is the in-n8n agent and args.buildModel is unused.
			buildModel: args.buildViaMcp ? args.buildModel : undefined,
			mcpBuildSpend,
		});

		await writePerRunPassMetrics({
			lsClient,
			runs: experimentResults.results,
			logger,
		});

		// Gated tiers (e.g. `pr`) assert an absolute green bar instead of comparing
		// to a baseline — skip the comparison entirely.
		const outcome = isGatedTier(args.tier)
			? undefined
			: await tryRunComparison({
					lsClient,
					prExperimentName: experimentResults.experimentName,
					evaluation,
					testCasesWithFiles,
					baselinePrefix: args.baselinePrefix,
					logger,
				});

		const slugByTestCase = new Map<WorkflowTestCase, string>(
			testCasesWithFiles.map(({ testCase, fileSlug }) => [testCase, fileSlug]),
		);

		// Best-effort: the report link is nice-to-have, never run-fatal.
		const experimentUrl = await lsClient
			.getProjectUrl({ projectName: experimentResults.experimentName })
			.catch(() => undefined);

		return {
			evaluation,
			experimentName: experimentResults.experimentName,
			experimentUrl,
			outcome,
			slugByTestCase,
		};
	} finally {
		if (!args.keepWorkflows) {
			// Entries still here had no rows run, or their per-case cleanup failed
			// (releaseCaseRow leaves those cached so this pass can retry them).
			await Promise.all(
				[...buildCache.values()].map(async (promise) => {
					try {
						const { build, lane } = await promise;
						await cleanupBuild(lane.runner.client, build, logger);
					} catch {
						// Best-effort
					}
				}),
			);
			await Promise.all(
				orphanedBuilds.map(async ({ build, client }) => {
					try {
						await cleanupBuild(client, build, logger);
					} catch {
						// Best-effort — the lane may still be unreachable
					}
				}),
			);
		}
	}
}

/**
 * Expand a source example stream into N copies, tagging each with `_iteration`.
 * Round-robins scenarios across test cases and iter-interleaves per scenario
 * so the in-flight set spans both dimensions. Concentration is handled by the
 * work-stealing allocator at build time.
 */
async function* expandExamplesForIterations(
	source: AsyncIterable<Example>,
	iterations: number,
): AsyncIterable<Example> {
	const cached: Example[] = [];
	for await (const ex of source) cached.push(ex);
	yield* expandWithIterations(
		cached,
		(ex) => (typeof ex.inputs?.testCaseFile === 'string' ? ex.inputs.testCaseFile : 'unknown'),
		iterations,
		(ex, i) => ({ ...ex, inputs: { ...ex.inputs, _iteration: i } }),
	);
}

function filteredExamplesIterable(
	lsClient: Client,
	datasetName: string,
	slugs: string[],
	logger: EvalLogger,
): AsyncIterable<Example> {
	if (slugs.length === 0) {
		logger.info('No test cases selected — nothing to evaluate');
		return (async function* () {})();
	}
	logger.info(`Selected ${String(slugs.length)} split(s): ${slugs.join(', ')}`);
	return lsClient.listExamples({ datasetName, splits: slugs });
}

async function updateExperimentAggregates(config: {
	lsClient: Client;
	experimentName: string;
	runs: Array<{ run: Run }>;
	evaluation: MultiRunEvaluation;
	buildDurations: Map<string, number>;
	totalDurationMs: number;
	logger: EvalLogger;
	/** MCP build model (only meaningful for --build-via-mcp). Recorded as
	 *  experiment metadata so LangSmith can surface/filter it as a column — the
	 *  built-in "Models" column stays empty because the external `claude` build
	 *  isn't traced as an LLM run. */
	buildModel?: string;
	/** Per-build `claude` spend (--build-via-mcp only; empty otherwise). Recorded
	 *  next to build_model so the experiment carries its own cost record — the
	 *  external build isn't traced, so LangSmith can't compute this itself. */
	mcpBuildSpend?: McpBuildSpend[];
}): Promise<void> {
	const { lsClient, experimentName, runs, evaluation, buildDurations, totalDurationMs, logger } =
		config;

	const buildTimes = [...buildDurations.values()];
	const uniqueBuilds = buildTimes.length;
	const avgBuildMs =
		uniqueBuilds > 0 ? buildTimes.reduce((sum, d) => sum + d, 0) / uniqueBuilds : 0;

	const execTimes = runs
		.map(({ run }) => parseTargetOutput(run.outputs)?.execDurationMs)
		.filter((ms): ms is number => typeof ms === 'number');
	const avgExecMs =
		execTimes.length > 0 ? execTimes.reduce((sum, d) => sum + d, 0) / execTimes.length : 0;

	const spend = summarizeMcpBuildSpend(config.mcpBuildSpend);
	const aggregates = {
		duration_s: Math.round(totalDurationMs / 100) / 10,
		avg_build_s: Math.round(avgBuildMs / 100) / 10,
		avg_exec_s: Math.round(avgExecMs / 100) / 10,
		unique_builds: uniqueBuilds,
		pass_rate_per_iter: computePassRatePerIter(evaluation),
		...(config.buildModel ? { build_model: config.buildModel } : {}),
		...(spend ? { total_build_cost_usd: spend.totalCostUsd, avg_build_turns: spend.avgTurns } : {}),
	};

	try {
		const project = await lsClient.readProject({ projectName: experimentName });
		// `updateProject` replaces `extra` wholesale — preserve it so auto-set
		// fields (splits, etc.) survive. Narrow via typeof guards rather than `as`.
		const existingExtra = isPlainObject(project.extra) ? project.extra : {};
		const existingMetadata = isPlainObject(existingExtra.metadata) ? existingExtra.metadata : {};
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

/**
 * Sum per-build `claude` spend into run-level numbers, or undefined when no
 * MCP builds were recorded (so non-MCP runs add nothing to their outputs).
 * Last-attempt semantics (see McpBuildSpend): totals are a lower bound when
 * builds were retried.
 */
function summarizeMcpBuildSpend(
	spend: McpBuildSpend[] | undefined,
): { builds: number; totalCostUsd: number; avgTurns: number } | undefined {
	if (!spend || spend.length === 0) return undefined;
	const totalCost = spend.reduce((sum, s) => sum + s.costUsd, 0);
	const totalTurns = spend.reduce((sum, s) => sum + s.turns, 0);
	return {
		builds: spend.length,
		totalCostUsd: Math.round(totalCost * 100) / 100,
		avgTurns: Math.round((totalTurns / spend.length) * 10) / 10,
	};
}

/**
 * Attach per-example pass metrics (pass_rate, pass_at_k, pass_hat_k) as
 * feedback on every run in the example's group. All N runs of the same example
 * carry the same value — that lets the LangSmith UI sort/filter individual
 * runs by their example's metric, and its per-experiment column aggregation
 * reduces to the mean across unique examples.
 */
async function writePerRunPassMetrics(config: {
	lsClient: Client;
	runs: Array<{ run: Run }>;
	logger: EvalLogger;
}): Promise<void> {
	const { lsClient, runs, logger } = config;

	// Group runs by reference_example_id, counting passes.
	const byExample = new Map<string, { runIds: string[]; passed: number; total: number }>();
	for (const { run } of runs) {
		const exampleId = run.reference_example_id;
		if (!exampleId) continue;
		const output = parseTargetOutput(run.outputs);
		if (!output) continue;
		// Incomplete rows (judge/verifier dead) carry no verdict — keep them out of
		// the pass_at_k/pass_hat_k denominator, mirroring feedbackExtractor.
		if (output.incomplete) continue;
		const entry = byExample.get(exampleId) ?? { runIds: [], passed: 0, total: 0 };
		entry.runIds.push(run.id);
		entry.total++;
		if (output.passed) entry.passed++;
		byExample.set(exampleId, entry);
	}

	// Individual writes are best-effort: a transient API error on one run
	// shouldn't block the rest, so we swallow per-promise and keep going.
	const feedbackWrites: Array<Promise<unknown>> = [];
	for (const { runIds, passed, total } of byExample.values()) {
		const passAtKValue = passAtK(total, passed, total);
		const passHatKValue = passHatK(total, passed, total);
		for (const runId of runIds) {
			feedbackWrites.push(
				lsClient.createFeedback(runId, 'pass_at_k', { score: passAtKValue }).catch(() => {}),
				lsClient.createFeedback(runId, 'pass_hat_k', { score: passHatKValue }).catch(() => {}),
			);
		}
	}

	await Promise.all(feedbackWrites);
	logger.verbose(
		`Wrote pass metrics feedback for ${String(byExample.size)} example(s) across ${String(runs.length)} run(s)`,
	);
}

// ---------------------------------------------------------------------------
// Direct mode: simple loop, no LangSmith dependency
// ---------------------------------------------------------------------------

async function runDirectLoop(config: RunConfig): Promise<{
	evaluation: MultiRunEvaluation;
	slugByTestCase: Map<WorkflowTestCase, string>;
}> {
	const { args, lanes, logger, testCasesWithFiles, prebuiltManifest, cleanupBuiltWorkflows } =
		config;

	const slugByTestCase = new Map<WorkflowTestCase, string>(
		testCasesWithFiles.map(({ testCase, fileSlug }) => [testCase, fileSlug]),
	);
	if (testCasesWithFiles.length === 0) {
		console.log('No workflow test cases selected (check --source / --filter / --exclude / --tier)');
		return { evaluation: { totalRuns: 0, testCases: [] }, slugByTestCase };
	}

	const totalScenarios = testCasesWithFiles.reduce(
		(sum, { testCase }) => sum + (testCase.executionScenarios ?? []).length,
		0,
	);
	logger.info(
		`Running ${String(testCasesWithFiles.length)} test case(s) with ${String(totalScenarios)} scenario(s) × ${String(args.iterations)} iteration(s) across ${String(lanes.length)} lane(s)`,
	);

	// Distribute test cases across lanes by source-order index. Each bucket carries
	// the original index so we can re-sort lane outputs back to source order — the
	// aggregator indexes per-iteration results positionally.
	const indexed = testCasesWithFiles.map((tc, origIdx) => ({ tc, origIdx }));
	const buckets = partitionRoundRobin(indexed, lanes.length);

	// Iterations are independent — run them in parallel. NOTE: this makes the
	// 4-per-lane build cap apply per iteration (lanes × iterations × 4 builds at
	// peak), which is why --build-via-mcp never reaches this loop: parseCliArgs
	// requires LangSmith for that mode, whose allocator caps builds per lane
	// globally.
	const allRunResults: WorkflowTestCaseResult[][] = await Promise.all(
		Array.from({ length: args.iterations }, async (_unused, iter) => {
			if (args.iterations > 1) {
				logger.info(`--- Iteration #${String(iter + 1)}/${String(args.iterations)} starting ---`);
			}
			const laneResults = await Promise.all(
				lanes.map(async (lane, laneIdx) => {
					const bucket = buckets[laneIdx];
					const laneTag =
						lanes.length > 1 ? ` [lane ${String(laneIdx + 1)}/${String(lanes.length)}]` : '';
					const results = await runWithConcurrency(
						bucket,
						async ({ tc }) => {
							const prebuiltWorkflowId = pickPrebuiltWorkflowId(
								prebuiltManifest,
								tc.fileSlug,
								iter,
							);
							try {
								const result = await runWorkflowTestCase({
									client: lane.client,
									baseUrl: lane.baseUrl,
									testCase: tc.testCase,
									timeoutMs: args.timeoutMs,
									createdCredentialIds: lane.createdCredentialIds,
									preRunWorkflowIds: lane.preRunWorkflowIds,
									claimedWorkflowIds: lane.claimedWorkflowIds,
									logger,
									keepWorkflows: args.keepWorkflows,
									laneTag,
									prebuiltWorkflowId,
									pinAiRoots: args.pinAiRoots,
								});
								if (
									prebuiltWorkflowId !== undefined &&
									cleanupBuiltWorkflows &&
									result.workflowBuildSuccess &&
									result.workflowId
								) {
									lane.workflowIdsToDelete.add(result.workflowId);
								}
								return result;
							} catch (error: unknown) {
								// runWorkflowTestCase guards its own scenario loop, but a throw
								// from the build phase (or a per-iteration budget abort) would
								// otherwise reject runWithConcurrency and take every OTHER case's
								// completed results down with it. Record this one case as an
								// aborted (framework_issue) result and keep the batch alive.
								const message = extractErrorMessage(error);
								logger.error(`  ERROR running ${tc.fileSlug}${laneTag}: ${message}`);
								return abortedWorkflowTestCaseResult(tc.testCase, lane.baseUrl, message);
							}
						},
						MAX_CONCURRENT_BUILDS,
					);
					return bucket.map((b, i) => ({ origIdx: b.origIdx, result: results[i] }));
				}),
			);
			const flat = laneResults.flat();
			flat.sort((a, b) => a.origIdx - b.origIdx);
			const iterationResults = flat.map((x) => x.result);
			// Capture each iteration as it completes (source-ordered, full-length) so
			// an abort in a LATER iteration still leaves runEvalAndPersist the ones
			// that finished — every captured array is a complete, index-aligned row.
			config.partialResults?.push(iterationResults);
			return iterationResults;
		}),
	);

	return { evaluation: aggregateResults(allRunResults, args.iterations), slugByTestCase };
}

// ---------------------------------------------------------------------------
// eval-results.json output (same shape as CI PR comment expects)
// ---------------------------------------------------------------------------

/**
 * Flatten per-iteration runs into a single list of test-case results for the
 * HTML report. Previously we rendered only `tc.runs[0]`, which silently hid
 * iterations 2..N — a flaky scenario that passed once and failed twice would
 * appear clean in the uploaded artifact. For multi-iteration runs we prefix
 * the opening user turn with its iteration number so the cards are
 * distinguishable at a glance.
 */
function flattenRunsForReport(evaluation: MultiRunEvaluation): WorkflowTestCaseResult[] {
	if (evaluation.totalRuns <= 1) {
		return evaluation.testCases.map((tc) => tc.runs[0]);
	}
	return evaluation.testCases.flatMap((tc) =>
		tc.runs.map((run, iter) => {
			// seedThread cases carry no authored conversation (the live turn comes
			// from the trace) — nothing to relabel.
			if (!run.testCase.conversation?.length) return run;
			const [opening, ...rest] = run.testCase.conversation;
			return {
				...run,
				testCase: {
					...run.testCase,
					conversation: [
						{
							...opening,
							text: `[iter ${String(iter + 1)}/${String(evaluation.totalRuns)}] ${opening.text}`,
						},
						...rest,
					],
				},
			};
		}),
	);
}

interface AggregateMetrics {
	/** Number of test cases with at least one successful build across iterations. */
	built: number;
	/** Total scenarios across all test cases. */
	scenariosTotal: number;
	/** Mean pass@k across units (scenarios + evaluated expectations), each at its terminal k (0..1). */
	passAtK: number;
	/** Mean pass^k across units (scenarios + evaluated expectations), each at its terminal k (0..1). */
	passHatK: number;
	/** Pass rate of each iteration formatted as e.g. "37% / 37% / 37%". */
	passRatePerIter: string;
}

/** Terminal pass@k/pass^k for a unit = its last evaluated k (totalRuns for scenarios, evaluatedCount for expectations). */
function terminalRate(arr: number[]): number {
	return arr[arr.length - 1] ?? 0;
}

function computeAggregateMetrics(evaluation: MultiRunEvaluation): AggregateMetrics {
	const { testCases } = evaluation;
	// Units = scenarios + evaluated build-expectations — mirrors the per-card badge and the
	// terminal per-case table so the headline rate can't disagree with them.
	const units = testCases.flatMap((tc) => [
		...tc.executionScenarios.filter((sa) => sa.evaluatedCount > 0),
		...tc.buildExpectations.filter((ea) => ea.evaluatedCount > 0),
	]);
	const total = units.length;
	const scenariosTotal = testCases.reduce((n, tc) => n + tc.executionScenarios.length, 0);
	const built = testCases.filter((tc) => tc.buildSuccessCount > 0).length;
	const passAtK =
		total > 0 ? units.reduce((sum, u) => sum + terminalRate(u.passAtK), 0) / total : 0;
	const passHatK =
		total > 0 ? units.reduce((sum, u) => sum + terminalRate(u.passHatK), 0) / total : 0;
	return {
		built,
		scenariosTotal,
		passAtK,
		passHatK,
		passRatePerIter: computePassRatePerIter(evaluation),
	};
}

/** Pass rate of each iteration (over units = scenarios + evaluated expectations). */
function computePassRatePerIter(evaluation: MultiRunEvaluation): string {
	const { totalRuns, testCases } = evaluation;
	const hasUnits = testCases.some(
		(tc) =>
			tc.executionScenarios.length > 0 || tc.buildExpectations.some((ea) => ea.evaluatedCount > 0),
	);
	if (!hasUnits) return '';
	const rates: string[] = [];
	for (let i = 0; i < totalRuns; i++) {
		let passed = 0;
		let total = 0;
		for (const tc of testCases) {
			for (const sa of tc.executionScenarios) {
				const runResult = sa.runs[i];
				if (runResult?.incomplete) continue;
				total++;
				if (runResult?.success) passed++;
			}
			// Count each scored verdict in this iteration directly — skips incomplete
			// (build-failed) verdicts and is robust to duplicate expectation strings.
			for (const verdict of tc.runs[i]?.buildExpectationResults ?? []) {
				if (verdict.incomplete) continue;
				total++;
				if (verdict.pass) passed++;
			}
		}
		rates.push(total > 0 ? `${String(Math.round((passed / total) * 100))}%` : 'n/a');
	}
	return rates.join(' / ');
}

// Re-run hint for the PR comment: a self-seeded dispatch against the PR head.
// Undefined outside CI or when not associated with a PR (EVAL_PR_NUMBER unset).
function ciRerunHint(): RerunHint | undefined {
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, EVAL_PR_NUMBER } = process.env;
	if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !EVAL_PR_NUMBER) return undefined;
	return {
		prNumber: EVAL_PR_NUMBER,
		dispatchUrl: `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/workflows/ci-instance-ai-evals.yml`,
	};
}

/** What `runEval` produces on success — the aggregation plus the LangSmith-only
 *  comparison metadata (undefined in direct-loop mode). */
export interface EvalRunOutput {
	evaluation: MultiRunEvaluation;
	experimentName?: string;
	experimentUrl?: string;
	outcome?: ComparisonOutcome;
	slugByTestCase?: Map<WorkflowTestCase, string>;
}

export interface PersistEvalConfig {
	logger: EvalLogger;
	outputDir: string | undefined;
	startTime: number;
	iterations: number;
	tier: CliArgs['tier'];
	commitSha: string | undefined;
	rerun: RerunHint | undefined;
	mcpBuildSpend: McpBuildSpend[];
}

export interface PersistedEval extends EvalRunOutput {
	gate: GateResult | undefined;
	jsonPath: string;
	prCommentPath: string;
}

/**
 * Run the eval via `runEval` and ALWAYS persist eval-results.json +
 * eval-pr-comment.md. On success returns the aggregation + write metadata so the
 * caller can render the HTML report / terminal summary.
 *
 * If `runEval` throws — a per-iteration budget/timeout abort, a lane meltdown, an
 * OOM — whatever it pushed into `partialResults` before throwing is aggregated
 * and written before the error is re-thrown. Aggregation already tolerates
 * missing/incomplete entries, so the scenarios that already completed survive
 * instead of the dispatcher finding no file and discarding the entire run.
 */
export async function runEvalAndPersist(
	config: PersistEvalConfig,
	runEval: (partialResults: WorkflowTestCaseResult[][]) => Promise<EvalRunOutput>,
): Promise<PersistedEval> {
	const partialResults: WorkflowTestCaseResult[][] = [];
	let persisted = false;
	try {
		const out = await runEval(partialResults);
		// Gated tiers report an absolute green verdict in place of the baseline comparison.
		const gate = isGatedTier(config.tier)
			? evaluateGate(out.evaluation, { slugByTestCase: out.slugByTestCase })
			: undefined;
		const { jsonPath, prCommentPath } = writeEvalResults(
			out.evaluation,
			Date.now() - config.startTime,
			config.outputDir,
			out.experimentName,
			out.outcome,
			config.commitSha,
			out.slugByTestCase,
			config.rerun,
			gate,
			config.mcpBuildSpend,
			out.experimentUrl,
		);
		persisted = true;
		return { ...out, gate, jsonPath, prCommentPath };
	} finally {
		if (!persisted) {
			try {
				const evaluation: MultiRunEvaluation =
					partialResults.length > 0
						? aggregateResults(partialResults, partialResults.length)
						: { totalRuns: config.iterations, testCases: [] };
				const { jsonPath } = writeEvalResults(
					evaluation,
					Date.now() - config.startTime,
					config.outputDir,
					undefined,
					undefined,
					config.commitSha,
					undefined,
					config.rerun,
					undefined,
					config.mcpBuildSpend,
					undefined,
				);
				config.logger.error(
					`Eval run did not finish cleanly — wrote partial results (${String(partialResults.length)} iteration(s)) to ${jsonPath}`,
				);
			} catch (writeError: unknown) {
				config.logger.error(
					`Failed to write partial eval results: ${extractErrorMessage(writeError)}`,
				);
			}
		}
	}
}

export function writeEvalResults(
	evaluation: MultiRunEvaluation,
	duration: number,
	outputDir: string | undefined,
	experimentName: string | undefined,
	outcome: ComparisonOutcome | undefined,
	commitSha: string | undefined,
	slugByTestCase: Map<WorkflowTestCase, string> | undefined,
	rerun: RerunHint | undefined,
	gate: GateResult | undefined,
	mcpBuildSpend?: McpBuildSpend[],
	experimentUrl?: string,
): { jsonPath: string; prCommentPath: string } {
	const { totalRuns, testCases } = evaluation;
	const metrics = computeAggregateMetrics(evaluation);
	const verification = rollupCaseVerification(testCases);

	const result = outcome?.kind === 'ok' ? outcome.result : undefined;

	const checksSummary = aggregateWorkflowChecks(evaluation);
	// `claude` build spend (--build-via-mcp only) — keeps a cost record in the
	// artifact even when LangSmith isn't configured.
	const buildSpendSummary = summarizeMcpBuildSpend(mcpBuildSpend);

	const report = {
		timestamp: new Date().toISOString(),
		duration,
		totalRuns,
		experimentName,
		experimentUrl,
		summary: {
			testCases: testCases.length,
			built: metrics.built,
			scenariosTotal: metrics.scenariosTotal,
			passAtK: metrics.passAtK,
			passHatK: metrics.passHatK,
			passRatePerIter: metrics.passRatePerIter,
			// Cases where nothing could be scored (all units incomplete / skipped) —
			// reported apart from the pass rate, never as a silent pass.
			notVerified: verification.notVerified,
			...(checksSummary ? { workflowChecks: checksSummary } : {}),
			...(buildSpendSummary ? { mcpBuild: buildSpendSummary } : {}),
		},
		// Structured comparison payload only — the rendered markdown lives in
		// the sibling `eval-pr-comment.md` file so consumers can pick the format
		// they want without re-running the eval. `comparisonStatus` records why
		// the comparison was skipped when applicable, so JSON consumers can
		// distinguish "no baseline yet" from "regression detection broke".
		comparison: result
			? {
					baseline: result.baseline.experimentName,
					result: serializeComparison(result),
				}
			: undefined,
		comparisonStatus: outcome?.kind ?? 'not_attempted',
		comparisonError: outcome?.kind === 'fetch_failed' ? outcome.error : undefined,
		// Absolute green-gate verdict for curated tiers (undefined for baseline-compared runs).
		gate,
		testCases: testCases.map((tc) => ({
			name: caseDisplayPrompt(tc.testCase, tc.runs[0]?.transcript).slice(0, 70),
			testCaseFile: slugByTestCase?.get(tc.testCase),
			// `notVerified` when no scenario or expectation was scored across runs —
			// consumers must not treat a zero pass rate here as a pass.
			status: tc.status,
			buildSuccessCount: tc.buildSuccessCount,
			totalRuns,
			workflowChecksPerRun: tc.runs.map((run) =>
				run.workflowChecks ? statusMap(run.workflowChecks) : null,
			),
			buildExpectationResultsPerRun: tc.runs.map((run) => run.buildExpectationResults ?? null),
			buildExpectations: tc.buildExpectations.map((ea) => ({
				expectation: ea.expectation,
				passCount: ea.passCount,
				evaluatedCount: ea.evaluatedCount,
				passAtK: terminalRate(ea.passAtK),
				passHatK: terminalRate(ea.passHatK),
			})),
			threadIds: tc.runs.map((run) => run.threadId ?? null),
			scenarios: tc.executionScenarios.map((sa) => ({
				name: sa.scenario.name,
				passCount: sa.passCount,
				evaluatedCount: sa.evaluatedCount,
				totalRuns,
				passAtK: terminalRate(sa.passAtK),
				passHatK: terminalRate(sa.passHatK),
				runs: sa.runs.map((sr, runIndex) => ({
					workflowId: sr.workflowId ?? tc.runs[runIndex]?.workflowId ?? null,
					passed: sr.success,
					...(sr.incomplete ? { incomplete: true } : {}),
					score: sr.score,
					reasoning: sr.reasoning,
					failureCategory: sr.failureCategory,
					rootCause: sr.rootCause,
					execErrors: sr.evalResult?.errors ?? [],
					evalResult: sr.evalResult,
				})),
			})),
		})),
	};

	const targetDir = outputDir ?? process.cwd();
	mkdirSync(targetDir, { recursive: true });
	const jsonPath = join(targetDir, 'eval-results.json');
	writeFileSync(jsonPath, JSON.stringify(report, null, 2));

	// Always write the rendered PR comment — the markdown formatter handles
	// both with-comparison and no-baseline cases. CI consumes this file
	// directly; local users get a copy-pasteable artifact.
	const prCommentPath = join(targetDir, 'eval-pr-comment.md');
	writeFileSync(
		prCommentPath,
		formatComparisonMarkdown(evaluation, outcome, {
			commitSha,
			slugByTestCase,
			rerun,
			gate,
			passMetrics: { passAtK: metrics.passAtK, passHatK: metrics.passHatK },
			experimentUrl,
		}),
	);

	return { jsonPath, prCommentPath };
}

/**
 * Convert ComparisonResult into a JSON-serializable shape (Maps don't survive
 * JSON.stringify by default).
 */
function serializeComparison(result: ComparisonResult): {
	pr: { experimentName: string };
	baseline: { experimentName: string };
	aggregate: ComparisonResult['aggregate'];
	evaluationUnits: ComparisonResult['evaluationUnits'];
	prOnly: ComparisonResult['prOnly'];
	baselineOnly: ComparisonResult['baselineOnly'];
	failureCategories: ComparisonResult['failureCategories'];
} {
	return {
		pr: result.pr,
		baseline: result.baseline,
		aggregate: result.aggregate,
		evaluationUnits: result.evaluationUnits,
		prOnly: result.prOnly,
		baselineOnly: result.baselineOnly,
		failureCategories: result.failureCategories,
	};
}

// ---------------------------------------------------------------------------
// Comparison vs the pinned baseline experiment
// ---------------------------------------------------------------------------

/**
 * Best-effort comparison. Returns a tagged outcome so the PR comment can
 * distinguish "no baseline yet" / "this run IS the baseline" from a real
 * regression-detection outage (LangSmith down, fetch failure). Never throws
 * — the eval run is not gated on the comparison.
 */
async function tryRunComparison(config: {
	lsClient: Client;
	prExperimentName: string;
	evaluation: MultiRunEvaluation;
	testCasesWithFiles: WorkflowTestCaseWithFile[];
	baselinePrefix: string;
	logger: EvalLogger;
}): Promise<ComparisonOutcome> {
	const { lsClient, prExperimentName, evaluation, testCasesWithFiles, baselinePrefix, logger } =
		config;

	try {
		const baselineName = await findLatestBaseline(lsClient, baselinePrefix);
		if (!baselineName) {
			// Strip the trailing hyphen so the hint names the experiment, not the lookup prefix.
			const baselineExperimentName = baselinePrefix.replace(/-$/, '');
			logger.verbose(
				'No baseline experiment found — skipping comparison. ' +
					`Run with --experiment-name ${baselineExperimentName} to create one.`,
			);
			return { kind: 'no_baseline' };
		}
		if (baselineName === prExperimentName) {
			logger.verbose('Current run is the baseline — skipping comparison.');
			return { kind: 'self_baseline', experimentName: baselineName };
		}

		logger.info(`Comparing against baseline: ${baselineName}`);
		const baseline = await fetchBaselineBucket(lsClient, baselineName);
		const pr = bucketFromEvaluation(evaluation, testCasesWithFiles, prExperimentName);
		return { kind: 'ok', result: compareBuckets(pr, baseline) };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		logger.warn(`Comparison vs baseline failed: ${msg}`);
		return { kind: 'fetch_failed', error: msg };
	}
}

// Only auto-run as the CLI entry point. Importing this module (e.g. from a unit
// test that exercises the exported runEvalAndPersist / writeEvalResults seams)
// must not kick off a real eval run against process.argv.
if (!process.env.VITEST) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}
