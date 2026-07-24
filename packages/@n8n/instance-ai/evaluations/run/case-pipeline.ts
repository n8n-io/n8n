// ---------------------------------------------------------------------------
// Case pipeline — the per-row execution phase of an eval run (TRUST-261).
// One row = one scenario of one case in one iteration (scenario-less cases get
// a single build-only sentinel row). `runRow` owns the whole row lifecycle:
// build lookup (via the build orchestrator), sentinel/build-fail short
// circuits, the agent and workflow scenario loops with transient retry,
// expectation-verdict attachment, the framework_issue guard that keeps infra
// errors from being scored as builder regressions, and eager per-build
// cleanup when a build's last row completes. Both drivers (LangSmith
// evaluate() and the direct loop) run rows through here.
// ---------------------------------------------------------------------------

import type { InstanceAiRunDebugResponse } from '@n8n/api-types';

import type { BuildOrchestrator } from './build-orchestrator';
import { sentinelOutcomeFromVerdicts, type TargetOutput } from './reshape';
import type { CliArgs } from '../cli/args';
import type { EvalLogger } from '../harness/logger';
import {
	cleanupBuild,
	effectiveTimeoutMs,
	findAgentArtifactRef,
	scenariosRequireSerialSeeding,
	warnAgentSeedDataTablesIgnored,
	type ScenarioSeedContext,
} from '../harness/runner';
import {
	classifyScenarioExecutionError,
	extractErrorMessage,
	MAX_EXEC_ATTEMPTS,
	shouldRetryScenarioExecution,
} from '../harness/transient-error';
import { BUILD_ONLY_SCENARIO_NAME, type DatasetExampleInputs } from '../langsmith/dataset-sync';
import type { BuildExpectationResult, ExecutionScenario, WorkflowTestCase } from '../types';

/** Row inputs: the per-scenario fields (dataset example shape) plus the
 *  iteration tag the drivers stamp when expanding for N iterations. */
export type ScenarioRowInputs = DatasetExampleInputs & { _iteration?: number };

export interface CasePipelineDeps {
	args: CliArgs;
	logger: EvalLogger;
	testCaseByFileSlug: Map<string, WorkflowTestCase>;
	orchestrator: BuildOrchestrator;
	// Side-band state written at build time (by the orchestrator), read per row.
	buildExpectationsByKey: Map<string, Promise<BuildExpectationResult[]>>;
	agentContextByKey: Map<string, Promise<string>>;
	runDebugByThreadId: Map<string, Promise<InstanceAiRunDebugResponse[]>>;
}

export interface CasePipeline {
	/** Run one scenario row to a TargetOutput. Never rejects: build-phase
	 *  throws and budget aborts come back as framework_issue rows so a driver
	 *  finalizes and persists every OTHER row's completed results. */
	runRow: (inputs: ScenarioRowInputs) => Promise<TargetOutput>;
}

export function createCasePipeline(deps: CasePipelineDeps): CasePipeline {
	const {
		args,
		logger,
		testCaseByFileSlug,
		orchestrator,
		buildExpectationsByKey,
		agentContextByKey,
		runDebugByThreadId,
	} = deps;
	const { getOrBuild, buildCache } = orchestrator;

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
			// cleanupBuild also deletes any built agent (agent-anchored builds).
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

	// Per-build-key execution chain for seed-table cases (see runScenarioRow).
	const serialExecutionByKey = new Map<string, Promise<unknown>>();
	async function withSerialSeeding<T>(key: string, fn: () => Promise<T>): Promise<T> {
		const prev = serialExecutionByKey.get(key) ?? Promise.resolve();
		const next = prev.then(fn, fn);
		serialExecutionByKey.set(
			key,
			next.then(
				() => undefined,
				() => undefined,
			),
		);
		return await next;
	}

	const runRow = async (inputs: ScenarioRowInputs): Promise<TargetOutput> => {
		const iteration = inputs._iteration ?? 0;
		try {
			return await runScenarioRow(inputs, iteration);
		} catch (error: unknown) {
			// runScenarioRow guards scenario execution internally, but a build-phase
			// throw (getOrBuild) or a budget abort must not reject up to the driver
			// and abort the whole experiment — that would discard every OTHER row's
			// completed results. Record this row as an aborted (framework_issue)
			// output instead so the driver finalizes and writeEvalResults still runs.
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

	const runScenarioRow = async (
		inputs: ScenarioRowInputs,
		iteration: number,
	): Promise<TargetOutput> => {
		// Rows carry only the per-scenario prose; the authored scenario is the
		// source of truth for typed extras (seedDataTables) — merge it back so
		// table-backed scenarios seed their declared rows in both drivers.
		const authoredScenarios = testCaseByFileSlug.get(inputs.testCaseFile)?.executionScenarios ?? [];
		const scenario: ExecutionScenario = authoredScenarios.find(
			(s) => s.name === inputs.scenarioName,
		) ?? {
			name: inputs.scenarioName,
			description: inputs.scenarioDescription,
			dataSetup: inputs.dataSetup,
			successCriteria: inputs.successCriteria,
		};

		const {
			build,
			lane: builtOnLane,
			buildDurationMs,
			buildSpend,
		} = await getOrBuild(iteration, inputs.testCaseFile);
		const cacheKey = `${String(iteration)}:${inputs.testCaseFile}`;
		// `claude` spend for this case's build (--build-via-mcp only). Rides on
		// every row of the case like buildDurationMs — dedupe per (iteration, case)
		// when summing (persist takes the first defined value per iteration).
		const buildSpendFields = buildSpend
			? { buildCostUsd: buildSpend.costUsd, buildTurns: buildSpend.turns }
			: {};

		// Agent-anchored build: scenarios target the agent and a missing workflow is
		// not a build failure (helper workflows are its tools) — mirrors the direct loop.
		const agentRef = findAgentArtifactRef(build.artifactRefs);
		const agentRunnable = agentRef !== undefined && build.transcript !== undefined;

		// Stashed at build time with a `.catch` attached, so awaiting never rejects.
		// Awaited only after each branch's own work is done, keeping the judge off
		// the scenario critical path while persisting verdicts to run outputs.
		const verdictsPromise = buildExpectationsByKey.get(cacheKey);
		const attachExpectations = async (output: TargetOutput): Promise<TargetOutput> => {
			const verdicts = await verdictsPromise;
			return verdicts && verdicts.length > 0 ? { ...output, expectationResults: verdicts } : output;
		};

		// Build-only case — the build plus its expectation judging (in getOrBuild) is the
		// whole test; skip execution. The sentinel's outcome IS the expectation verdicts,
		// so LangSmith pass metrics stay truthful for scenario-less cases. Checked before
		// the workflowId guard because answer-only cases legitimately end without a
		// workflow (workflowExpectedForCase).
		if (inputs.scenarioName === BUILD_ONLY_SCENARIO_NAME && (build.success || agentRunnable)) {
			const verdicts = await verdictsPromise;
			const outcome = sentinelOutcomeFromVerdicts(verdicts);
			return {
				buildSuccess: true,
				workflowId: build.workflowId,
				...(agentRef ? { agentId: agentRef.id } : {}),
				...(agentRef ? { agentContext: await agentContextByKey.get(cacheKey) } : {}),
				passed: outcome.passed,
				score: outcome.score,
				reasoning: outcome.reasoning,
				failureCategory: outcome.failureCategory,
				...(outcome.incomplete ? { incomplete: true } : {}),
				execErrors: [],
				buildDurationMs,
				...buildSpendFields,
				execDurationMs: 0,
				nodeCount: build.workflowJsons[0]?.nodes.length ?? 0,
				threadId: build.threadId,
				workflowChecks: build.workflowChecks,
				workflowJson: build.workflowJsons[0],
				buildTrace: build.buildTrace,
				...(verdicts && verdicts.length > 0 ? { expectationResults: verdicts } : {}),
			};
		}

		if (!agentRunnable && (!build.success || !build.workflowId)) {
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
				...buildSpendFields,
				execDurationMs: 0,
				nodeCount: 0,
				threadId: build.threadId,
				workflowChecks: build.workflowChecks,
				buildTrace: build.buildTrace,
				planRejections: build.proxyDecisionStats?.rejection ?? 0,
			});
		}

		// Agent scenario path — real model, mocked tool HTTP. Mirrors the
		// workflow branch below (retry loop, framework_issue guard, output shape).
		if (agentRunnable && agentRef) {
			// Dataset rows don't carry seedDataTables — check the authored scenario.
			warnAgentSeedDataTablesIgnored(
				logger,
				scenario.name,
				testCaseByFileSlug
					.get(inputs.testCaseFile)
					?.executionScenarios?.find((s) => s.name === scenario.name)?.seedDataTables,
			);
			const agentExecStart = Date.now();
			const agentContext =
				(await agentContextByKey.get(cacheKey)) ?? '(agent configuration could not be fetched)';
			let agentResult;
			for (let attempt = 1; ; attempt++) {
				try {
					agentResult = await builtOnLane.tracedExecuteAgent({
						agentId: agentRef.id,
						scenario,
						agentContext,
						buildTrace: build.buildTrace,
						timeoutMs: effectiveTimeoutMs(
							testCaseByFileSlug.get(inputs.testCaseFile)?.complexity,
							args.timeoutMs,
						),
						testCaseName: inputs.testCaseFile,
					});
					break;
				} catch (error: unknown) {
					const errorMessage = extractErrorMessage(error);
					if (shouldRetryScenarioExecution(errorMessage, attempt)) {
						logger.warn(
							`    [${scenario.name}] agent execution attempt ${attempt}/${MAX_EXEC_ATTEMPTS} failed (${errorMessage}); retrying`,
						);
						await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
						continue;
					}
					logger.error(`    ERROR [${scenario.name}]: ${errorMessage}`);
					return await attachExpectations({
						buildSuccess: true,
						agentId: agentRef.id,
						agentContext,
						passed: false,
						score: 0,
						reasoning: `Agent scenario execution error: ${errorMessage}`,
						failureCategory: 'framework_issue',
						execErrors: [errorMessage],
						buildDurationMs,
						...buildSpendFields,
						execDurationMs: Date.now() - agentExecStart,
						nodeCount: 0,
						threadId: build.threadId,
						buildTrace: build.buildTrace,
						planRejections: build.proxyDecisionStats?.rejection ?? 0,
					});
				}
			}

			const agentFailureCategory = agentResult.success ? undefined : agentResult.failureCategory;
			const agentRootCause = agentResult.success ? undefined : agentResult.rootCause;
			return await attachExpectations({
				buildSuccess: true,
				agentId: agentRef.id,
				agentContext,
				agentEvalResult: agentResult.agentEvalResult,
				passed: agentResult.success,
				score: agentResult.score,
				reasoning: agentResult.reasoning,
				failureCategory: agentFailureCategory,
				rootCause: agentRootCause,
				...(agentResult.incomplete ? { incomplete: true } : {}),
				execErrors: agentResult.agentEvalResult?.errors ?? [],
				buildDurationMs,
				...buildSpendFields,
				execDurationMs: Date.now() - agentExecStart,
				nodeCount: 0,
				threadId: build.threadId,
				buildTrace: build.buildTrace,
				planRejections: build.proxyDecisionStats?.rejection ?? 0,
			});
		}
		if (!build.workflowId) {
			// agentRunnable without an agentRef is unreachable; this narrows for TS
			// and guards the workflow path below.
			throw new Error(`No runnable artifact for scenario ${scenario.name}`);
		}
		// Captured as a const so the narrowing survives into the closure below.
		const workflowId = build.workflowId;

		// Mirrors the retired direct loop (TRUST-311): a seeded row resets + seeds
		const seedContext: ScenarioSeedContext | undefined =
			build.threadId && build.seededScenarioTableIdsByName
				? { threadId: build.threadId, tableIdsByName: build.seededScenarioTableIdsByName }
				: undefined;
		// A scenario that declares seed tables must not run without them (MCP and
		// prebuilt builds never seed data tables) — executing anyway would grade the
		// workflow against empty tables and report the miss as a builder failure.
		if ((scenario.seedDataTables?.length ?? 0) > 0 && !seedContext) {
			const reason =
				'Scenario declares seedDataTables but the build provided no seeded-table mapping ' +
				'(MCP/prebuilt builds do not seed data tables) — refusing to run without the declared rows';
			logger.error(`    ERROR [${scenario.name}]: ${reason}`);
			return await attachExpectations({
				buildSuccess: true,
				workflowId,
				passed: false,
				score: 0,
				reasoning: reason,
				failureCategory: 'framework_issue',
				execErrors: [reason],
				buildDurationMs,
				...buildSpendFields,
				execDurationMs: 0,
				nodeCount: build.workflowJsons[0]?.nodes.length ?? 0,
				threadId: build.threadId,
				buildTrace: build.buildTrace,
				planRejections: build.proxyDecisionStats?.rejection ?? 0,
			});
		}
		const runWorkflowScenario = async (): Promise<TargetOutput> => {
			const execStart = Date.now();
			const nodeCount = build.workflowJsons[0]?.nodes.length ?? 0;
			let result;
			for (let attempt = 1; ; attempt++) {
				try {
					result = await builtOnLane.tracedExecute({
						workflowId,
						scenario,
						workflowJsons: build.workflowJsons,
						buildTrace: build.buildTrace,
						seedContext,
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
					// executeWithLlmMock / verifyChecklist would escape to the driver, come
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
						...buildSpendFields,
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
				...buildSpendFields,
				execDurationMs,
				nodeCount,
				threadId: build.threadId,
				workflowChecks: build.workflowChecks,
				workflowJson: build.workflowJsons[0],
				buildTrace: build.buildTrace,
				planRejections: build.proxyDecisionStats?.rejection ?? 0,
			});
		};
		// Scenarios of one case share tables by name, so seeded rows must not
		// interleave — the retired direct loop ran them at concurrency 1; rows now
		// arrive independently, so the gate is a per-build-key chain instead.
		return scenariosRequireSerialSeeding(authoredScenarios)
			? await withSerialSeeding(cacheKey, runWorkflowScenario)
			: await runWorkflowScenario();
	};

	return { runRow };
}
