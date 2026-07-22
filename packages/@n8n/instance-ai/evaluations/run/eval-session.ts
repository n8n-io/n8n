// ---------------------------------------------------------------------------
// Eval session — the shared per-run assembly both drivers build on
// (TRUST-261): lane wrappers → work-stealing allocator → build orchestrator →
// case pipeline, plus the side-band sinks written at build time and the
// end-of-run artifact drain. The only driver-specific piece is `wrap`, the
// tracing hook around each lane's build/execute functions: the LangSmith
// driver passes traceable(), the direct driver passes identity — so trace
// shape stays a driver concern and the assembly exists exactly once.
// ---------------------------------------------------------------------------

import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import {
	createBuildOrchestrator,
	laneHealthy,
	type BuildArgs,
	type BuildOrchestrator,
	type Lane,
	type LaneState,
	type McpBuildSpend,
} from './build-orchestrator';
import { createCasePipeline, type CasePipeline } from './case-pipeline';
import { LaneAllocator } from './lane-allocator';
import type { CliArgs } from '../cli/args';
import type { WorkflowTestCaseWithFile } from '../data/workflows';
import type { EvalLogger } from '../harness/logger';
import type { PrebuiltManifest } from '../harness/prebuilt-workflows';
import {
	buildWorkflow,
	cleanupBuild,
	executeAgentScenario,
	executeScenario,
	workflowExpectedForCase,
	type BuildResult,
} from '../harness/runner';
import type {
	BuildExpectationResult,
	ExecutionScenario,
	TranscriptTurn,
	WorkflowTestCase,
} from '../types';

// n8n degrades above ~4 concurrent builds (per lane).
export const MAX_CONCURRENT_BUILDS = 4;

/** Names of the wrapped lane functions — the LangSmith driver uses them as trace span names. */
export type LaneFnName = 'workflow_build' | 'scenario_execution' | 'agent_scenario_execution';

/** Tracing hook around each lane's build/execute functions. Identity for the
 *  direct driver; traceable() for the LangSmith driver. */
export type TraceWrap = <TArg, TResult>(
	name: LaneFnName,
	laneNum: number,
	fn: (arg: TArg) => Promise<TResult>,
) => (arg: TArg) => Promise<TResult>;

export interface EvalSessionConfig {
	args: CliArgs;
	lanes: Lane[];
	logger: EvalLogger;
	testCasesWithFiles: WorkflowTestCaseWithFile[];
	prebuiltManifest?: PrebuiltManifest;
	cleanupBuiltWorkflows: boolean;
	mcpBuildLogDir?: string;
	mcpBuildSpend: McpBuildSpend[];
	wrap: TraceWrap;
}

export interface ResolvedSideBand {
	transcriptByThreadId: Map<string, TranscriptTurn[]>;
	/** Keyed by the build-cache key (`iteration:fileSlug`), not threadId, so prebuilt
	 *  builds (no threadId) still attach their outcome-expectation verdicts. */
	buildExpectations: Map<string, BuildExpectationResult[]>;
	runDebug: Map<string, InstanceAiRunDebugResponse[]>;
}

export interface EvalSession {
	laneStates: LaneState[];
	orchestrator: BuildOrchestrator;
	pipeline: CasePipeline;
	testCaseByFileSlug: Map<string, WorkflowTestCase>;
	slugByTestCase: Map<WorkflowTestCase, string>;
	transcriptByThreadId: Map<string, TranscriptTurn[]>;
	/** Await the promises stashed at build time (expectation verdicts, run debug)
	 *  into plain Maps for reshape. Call after all rows have completed. */
	resolveSideBand: () => Promise<ResolvedSideBand>;
	/** End-of-run artifact drain (no-op with --keep-workflows): cache entries
	 *  that had no rows run — or whose per-case cleanup failed — plus
	 *  transport-evicted orphans. */
	drainBuilds: () => Promise<void>;
}

export function createEvalSession(config: EvalSessionConfig): EvalSession {
	const {
		args,
		lanes,
		logger,
		testCasesWithFiles,
		prebuiltManifest,
		cleanupBuiltWorkflows,
		mcpBuildLogDir,
		mcpBuildSpend,
		wrap,
	} = config;

	// Stash transcripts by threadId so reshape can merge them in — the row
	// output schema doesn't carry the full transcript.
	const transcriptByThreadId = new Map<string, TranscriptTurn[]>();
	// Build-expectation verdicts, judged once per build and merged by the build-cache
	// key (`iteration:fileSlug`) rather than threadId — so prebuilt/MCP builds, which
	// have no threadId, still get their outcome expectations judged and counted.
	// Fired during getOrBuild, awaited in resolveSideBand.
	const buildExpectationsByKey = new Map<string, Promise<BuildExpectationResult[]>>();
	const runDebugByThreadId = new Map<string, Promise<InstanceAiRunDebugResponse[]>>();

	// Rows carry only per-scenario fields. The build-side fields (conversation,
	// expectations, declared credentials) are sourced locally, keyed by fileSlug.
	const testCaseByFileSlug = new Map<string, WorkflowTestCase>();
	const slugByTestCase = new Map<WorkflowTestCase, string>();
	for (const { testCase, fileSlug } of testCasesWithFiles) {
		testCaseByFileSlug.set(fileSlug, testCase);
		slugByTestCase.set(testCase, fileSlug);
	}

	const laneStates: LaneState[] = lanes.map((lane, idx) => {
		const laneNum = idx + 1;
		const laneTag = lanes.length > 1 ? ` [lane ${String(laneNum)}/${String(lanes.length)}]` : '';
		return {
			runner: lane,
			laneNum,
			activeBuilds: 0,
			inflightKeys: new Set<string>(),
			tracedBuild: wrap(
				'workflow_build',
				laneNum,
				async (buildArgs: BuildArgs) =>
					await buildWorkflow({
						client: lane.client,
						conversation: buildArgs.conversation,
						messageBudget: buildArgs.messageBudget,
						credentials: buildArgs.credentials,
						seedFile: buildArgs.seedFile,
						priorConversation: buildArgs.priorConversation,
						seedThread: buildArgs.seedThread,
						executionScenarios: buildArgs.executionScenarios,
						createdCredentialIds: lane.createdCredentialIds,
						timeoutMs: buildArgs.timeoutMs,
						preRunWorkflowIds: lane.preRunWorkflowIds,
						claimedWorkflowIds: lane.claimedWorkflowIds,
						logger,
						laneTag,
						workflowExpected: workflowExpectedForCase(buildArgs),
					}),
			),
			tracedExecute: wrap(
				'scenario_execution',
				laneNum,
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
			),
			tracedExecuteAgent: wrap(
				'agent_scenario_execution',
				laneNum,
				async (execArgs: {
					agentId: string;
					scenario: ExecutionScenario;
					agentContext: string;
					buildTrace?: BuildResult['buildTrace'];
					timeoutMs: number;
					testCaseName?: string;
				}) =>
					await executeAgentScenario(
						lane.client,
						execArgs.agentId,
						execArgs.scenario,
						execArgs.agentContext,
						logger,
						execArgs.timeoutMs,
						execArgs.testCaseName,
						execArgs.buildTrace,
					),
			),
		};
	});

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

	// Agent config + skills, fetched once per build and shared by every
	// scenario row of the case (the agent analog of the cached workflow JSON).
	const agentContextByKey = new Map<string, Promise<string>>();

	const orchestrator = createBuildOrchestrator({
		args,
		logger,
		laneStates,
		allocator,
		testCaseByFileSlug,
		prebuiltManifest,
		cleanupBuiltWorkflows,
		mcpBuildLogDir,
		mcpBuildSpend,
		transcriptByThreadId,
		buildExpectationsByKey,
		runDebugByThreadId,
		agentContextByKey,
	});

	const pipeline = createCasePipeline({
		args,
		logger,
		testCaseByFileSlug,
		orchestrator,
		buildExpectationsByKey,
		agentContextByKey,
		runDebugByThreadId,
	});

	const resolveSideBand = async (): Promise<ResolvedSideBand> => {
		const buildExpectations = new Map<string, BuildExpectationResult[]>();
		for (const [key, verdictsPromise] of buildExpectationsByKey) {
			buildExpectations.set(key, await verdictsPromise);
		}
		const runDebug = new Map<string, InstanceAiRunDebugResponse[]>();
		for (const [threadId, runDebugPromise] of runDebugByThreadId) {
			runDebug.set(threadId, await runDebugPromise);
		}
		return { transcriptByThreadId, buildExpectations, runDebug };
	};

	const drainBuilds = async (): Promise<void> => {
		if (args.keepWorkflows) return;
		// Entries still here had no rows run, or their per-case cleanup failed
		// (releaseCaseRow leaves those cached so this pass can retry them).
		await Promise.all(
			[...orchestrator.buildCache.values()].map(async (promise) => {
				try {
					const { build, lane } = await promise;
					await cleanupBuild(lane.runner.client, build, logger);
				} catch {
					// Best-effort
				}
			}),
		);
		await Promise.all(
			orchestrator.orphanedBuilds.map(async ({ build, client }) => {
				try {
					await cleanupBuild(client, build, logger);
				} catch {
					// Best-effort — the lane may still be unreachable
				}
			}),
		);
	};

	return {
		laneStates,
		orchestrator,
		pipeline,
		testCaseByFileSlug,
		slugByTestCase,
		transcriptByThreadId,
		resolveSideBand,
		drainBuilds,
	};
}
