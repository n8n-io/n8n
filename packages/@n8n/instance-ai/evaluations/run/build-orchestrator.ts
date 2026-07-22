// ---------------------------------------------------------------------------
// Build orchestrator — the build phase of an eval run behind an explicit seam
// (TRUST-261). Owns the per-(iteration, fileSlug) build cache, lane
// acquisition/retry against transient transport failures, and the per-build
// side-band capture (transcript, expectation verdicts, agent context, run
// debug) that reshape/target consume later. Deliberately LangSmith-blind: the
// traceable lane wrappers are constructed by the caller and injected as
// `LaneState`, so tracing stays a caller concern.
// ---------------------------------------------------------------------------

import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import type { LaneAllocator } from './lane-allocator';
import { selectAuthorExpectations } from '../build-expectations/select';
import { allFailVerdicts, verifyBuildExpectations } from '../build-expectations/verifier';
import type { CliArgs } from '../cli/args';
import { buildWorkflowViaMcp, type McpBuildSettings } from '../cli/mcp-builder';
import type { N8nClient } from '../clients/n8n-client';
import { captureThreadRunDebug } from '../harness/capture-run-debug';
import type { EvalLogger } from '../harness/logger';
import {
	fetchPrebuiltBuild,
	pickPrebuiltWorkflowId,
	type PrebuiltManifest,
} from '../harness/prebuilt-workflows';
import {
	effectiveTimeoutMs,
	fetchAgentScenarioContext,
	findAgentArtifactRef,
	runWorkflowChecks,
	type BuildResult,
	type executeAgentScenario,
	type executeScenario,
} from '../harness/runner';
import { isTransientNetworkError } from '../harness/transient-error';
import type {
	BuildExpectationResult,
	ExecutionScenario,
	TranscriptTurn,
	WorkflowTestCase,
} from '../types';
import { conversationUserTurnsAsText } from '../utils/conversation-text';

/** Attempts (initial + retries) for a build hitting transient network errors. */
export const MAX_BUILD_ATTEMPTS = 3;

export interface Lane {
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
export interface McpBuildSpend {
	costUsd: number;
	turns: number;
}

export type BuildArgs = Pick<
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

/** A lane plus the allocator-managed counters and the caller-provided (traced)
 *  build/execute wrappers. `runner` is the underlying Lane (n8n client,
 *  credential state) — named distinctly so it doesn't shadow loop variables. */
export interface LaneState {
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
	tracedExecuteAgent: (execArgs: {
		agentId: string;
		scenario: ExecutionScenario;
		agentContext: string;
		buildTrace?: BuildResult['buildTrace'];
		timeoutMs: number;
		testCaseName?: string;
	}) => Promise<Awaited<ReturnType<typeof executeAgentScenario>>>;
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

// Direct fetch (not N8nClient) so a hung lane can't stall the probe.
export async function laneHealthy(lane: LaneState): Promise<boolean> {
	try {
		const res = await fetch(`${lane.runner.baseUrl}/healthz/readiness`, {
			signal: AbortSignal.timeout(5_000),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export interface CachedBuild {
	build: BuildResult;
	lane: LaneState;
	buildDurationMs: number;
}

export interface BuildOrchestratorDeps {
	args: CliArgs;
	logger: EvalLogger;
	laneStates: LaneState[];
	allocator: LaneAllocator<LaneState>;
	testCaseByFileSlug: Map<string, WorkflowTestCase>;
	prebuiltManifest?: PrebuiltManifest;
	cleanupBuiltWorkflows: boolean;
	mcpBuildLogDir?: string;
	mcpBuildSpend: McpBuildSpend[];
	// Side-band sinks owned by the caller: reshape/target read them after the
	// build phase, keyed by threadId or the `iteration:fileSlug` build key.
	transcriptByThreadId: Map<string, TranscriptTurn[]>;
	buildExpectationsByKey: Map<string, Promise<BuildExpectationResult[]>>;
	runDebugByThreadId: Map<string, Promise<InstanceAiRunDebugResponse[]>>;
	agentContextByKey: Map<string, Promise<string>>;
}

export interface BuildOrchestrator {
	getOrBuild: (iteration: number, fileSlug: string) => Promise<CachedBuild>;
	/** Live cache — `releaseCaseRow` deletes cleaned entries; the end-of-run pass drains the rest. */
	buildCache: Map<string, Promise<CachedBuild>>;
	/** Transport-evicted builds whose artifacts still need the end-of-run drain. */
	orphanedBuilds: Array<{ build: BuildResult; client: N8nClient }>;
	buildDurations: Map<string, number>;
}

export function createBuildOrchestrator(deps: BuildOrchestratorDeps): BuildOrchestrator {
	const {
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
	} = deps;

	// A build that sat out its timeout against a dead lane reports "Run timed
	// out", not "fetch failed" — so any failed build also health-probes its lane.
	async function isTransportFailure(build: BuildResult, lane: LaneState): Promise<boolean> {
		if (build.success) return false;
		if (build.error !== undefined && isTransientNetworkError(build.error)) return true;
		return !(await laneHealthy(lane));
	}

	const buildCache = new Map<string, Promise<CachedBuild>>();
	// Transport-evicted builds leave buildCache before any cleanup pass sees
	// them, but their artifacts (restored workflows, data tables, thread — and
	// with it the sandbox) are real. Stash them for the end-of-run drain; the
	// lane may be mid-restart at eviction time, so immediate cleanup can't work.
	const orphanedBuilds: Array<{ build: BuildResult; client: N8nClient }> = [];
	const buildDurations = new Map<string, number>();

	function stashTranscript(build: BuildResult): void {
		if (build.threadId && build.transcript) {
			transcriptByThreadId.set(build.threadId, build.transcript);
		}
	}

	// Agent config + skills, fetched once per build and shared by every
	// scenario row of the case (the agent analog of the cached workflow JSON).
	function stashAgentContext(key: string, client: N8nClient, build: BuildResult): void {
		const agentRef = findAgentArtifactRef(build.artifactRefs);
		if (!agentRef) return;
		agentContextByKey.set(key, fetchAgentScenarioContext(client, agentRef, logger));
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

	async function getOrBuild(iteration: number, fileSlug: string): Promise<CachedBuild> {
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
			stashAgentContext(key, lane.runner.client, build);
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

	return { getOrBuild, buildCache, orphanedBuilds, buildDurations };
}
