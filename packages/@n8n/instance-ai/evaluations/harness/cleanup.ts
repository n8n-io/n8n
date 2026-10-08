// ---------------------------------------------------------------------------
// Build cleanup + shared runner utilities
//
// Post-build cleanup of created artifacts, per-case timeout policy, bounded
// concurrency, binary workflow checks, and the shared failure summaries /
// synthetic results both drivers rely on.
// ---------------------------------------------------------------------------

import { findAgentArtifactRef } from './agent-execution';
import type { BuildResult } from './build-workflow';
import type { EvalLogger } from './logger';
import { classifyScenarioExecutionError } from './transient-error';
import { SONNET_MODEL } from '../../src/utils/eval-agents';
import { runBinaryChecks } from '../binaryChecks/index';
import type { BinaryCheckContext, CheckOutcome } from '../binaryChecks/types';
import { N8nApiError } from '../clients/n8n-client';
import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import type { CapturedEvent, WorkflowTestCase, WorkflowTestCaseResult } from '../types';

/**
 * Per-case budget: `complex` cases get 1.5× the base timeout. The heaviest
 * builds (multi-agent fan-outs, 5-integration pipelines) legitimately run at
 * the shared default's cap — observed 777–900s with 4/10 builds timing out on
 * weekly-social-content-scheduler in run 29012884140 — while the default must
 * NOT rise globally (see the DEFAULT_TIMEOUT_MS comment in build-workflow.ts:
 * a generous default lets starved scenarios amplify the contention that
 * starved them). Keyed off the authored `complexity` field so the budget
 * travels with the case (incl. through the lang-tracer mirror) instead of a
 * bespoke per-case knob.
 */
export function effectiveTimeoutMs(
	complexity: WorkflowTestCase['complexity'] | undefined,
	baseMs: number,
): number {
	return complexity === 'complex' ? Math.round(baseMs * 1.5) : baseMs;
}

function eventPayload(event: CapturedEvent): Record<string, unknown> {
	return typeof event.data.payload === 'object' && event.data.payload !== null
		? (event.data.payload as Record<string, unknown>)
		: event.data;
}

/**
 * Best-effort explanation for a run that produced no workflow, drawn from the
 * captured event stream. Tool errors are most specific; run-level `error`
 * events (e.g. the terminal-fallback emitted when the run throws before doing
 * any work — a crashed sandbox, a failed model call) carry the actual failure
 * reason and must be surfaced, otherwise a crashed run reports nothing at all.
 */
export function summarizeMissingWorkflowError(events: CapturedEvent[]): string {
	const toolErrors = events
		.filter((e) => e.type === 'tool-error')
		.map((e) => {
			const payload = eventPayload(e);
			const toolError = payload.error ?? payload.message;
			return typeof toolError === 'string' ? toolError : 'unknown tool error';
		});
	if (toolErrors.length > 0) return `Tool errors: ${toolErrors.join('; ')}`;

	const runErrors = events
		.filter((e) => e.type === 'error')
		.map((e) => {
			const payload = eventPayload(e);
			const runError = payload.content ?? payload.error ?? payload.message;
			return typeof runError === 'string' ? runError : 'unknown agent error';
		});
	if (runErrors.length > 0) return `Agent error: ${runErrors.join('; ')}`;

	const agentText = events
		.filter((e) => e.type === 'text-delta')
		.map((e) => {
			const payload = eventPayload(e);
			if (typeof e.data.text === 'string') return e.data.text;
			return typeof payload.text === 'string' ? payload.text : '';
		})
		.join('');
	if (agentText.length > 0) return `Agent response: ${agentText.slice(0, 500)}`;

	return 'No workflow produced — no error details captured';
}

/**
 * Synthetic result for a test case whose run threw before it could produce one
 * (a budget/timeout abort, a lane meltdown, an OOM). Recording it — instead of
 * letting the throw reject the batch — keeps every OTHER case's already-completed
 * results, and keeps this case index-aligned so the aggregator counts it rather
 * than losing the whole run. One `framework_issue` row per declared scenario
 * carries the pinned cross-repo contract (timeout-flavoured rootCause for budget
 * aborts) so the lang-tracer side buckets it as infra, not product quality.
 */
export function abortedWorkflowTestCaseResult(
	testCase: WorkflowTestCase,
	baseUrl: string,
	errorMessage: string,
): WorkflowTestCaseResult {
	const classified = classifyScenarioExecutionError(errorMessage);
	return {
		testCase,
		workflowBuildSuccess: false,
		buildError: errorMessage,
		n8nBaseUrl: baseUrl,
		executionScenarioResults: (testCase.executionScenarios ?? []).map((scenario) => ({
			scenario,
			success: false,
			score: 0,
			...classified,
		})),
	};
}

/** The log line for one artifact kind. Says so when a delete or the project
 *  lookup failed: a bare "Cleaned up" would mask the leak the retry exists for. */
function reportCleanup(noun: string, count: number, ok: boolean): string {
	return ok
		? `  Cleaned up ${String(count)} ${noun}`
		: `  Could not clean up every one of ${String(count)} ${noun}; retrying at end of run`;
}

/**
 * Clean up workflows, data tables, seeded folders and projects, and any built
 * agent created during a build.
 *
 * Returns false when any deletion failed so callers can retry later.
 */
export async function cleanupBuild(
	client: N8nClient,
	build: BuildResult,
	logger: EvalLogger,
): Promise<boolean> {
	let clean = true;
	let workflowsClean = true;

	// A workflow that is already gone is the state this wants, not a failure: the
	// end-of-run retry re-runs this on the same build, so every id a first pass
	// took comes back gone. n8n reports that as 403 to the eval user, who holds
	// `workflow:delete` globally, and as 404 to a member. `deleteWorkflow`
	// swallows both already. The check is repeated here because any client that
	// does not would deadlock the folders below, which wait on this flag. Only a
	// real failure may hold them back.
	for (const id of build.createdWorkflowIds) {
		try {
			await client.deleteWorkflow(id);
		} catch (error: unknown) {
			if (error instanceof N8nApiError && (error.status === 403 || error.status === 404)) continue;
			workflowsClean = false; // Best-effort cleanup
		}
	}
	clean = workflowsClean;

	// Project-scoped artifacts: each id on its own, best-effort, so one failure
	// never shields the rest. Returns false when any delete (or the project
	// lookup) failed. Callers await it before folding into `clean`: a `&&=`
	// would skip the whole kind once an earlier kind failed.
	const deleteEachInProject = async (
		ids: Iterable<string>,
		remove: (projectId: string, id: string) => Promise<void>,
	): Promise<boolean> => {
		let ok = true;
		try {
			const projectId = await client.getPersonalProjectId();
			for (const id of ids) {
				try {
					await remove(projectId, id);
				} catch {
					ok = false;
				}
			}
		} catch {
			ok = false; // Non-fatal — project ID lookup may fail
		}
		return ok;
	};

	// Agent-anchored builds create a first-class Agent, and a seed may have restored
	// one — delete both with the rest of the build's artifacts so no caller has to
	// remember to. A seeded agent the live turn also edited appears in both.
	const agentRef = findAgentArtifactRef(build.artifactRefs);
	const agentIds = new Set([...(agentRef ? [agentRef.id] : []), ...(build.createdAgentIds ?? [])]);
	if (agentIds.size > 0) {
		const agentsClean = await deleteEachInProject(agentIds, async (projectId, id) => {
			await client.deleteAgent(projectId, id);
		});
		clean = clean && agentsClean;
	}

	if (build.createdDataTableIds.length > 0) {
		const tablesClean = await deleteEachInProject(
			build.createdDataTableIds,
			async (projectId, id) => {
				await client.deleteDataTable(projectId, id);
			},
		);
		clean = clean && tablesClean;
		logger.verbose(reportCleanup('data table(s)', build.createdDataTableIds.length, tablesClean));
	}

	// The root folders a seed created (the delete cascades to subfolders). Held
	// back until every workflow this tracked is gone: a folder delete does not
	// delete what it still holds, it archives it and moves it to the project
	// root. The retry would then find the workflow but no folder, so the cleanup
	// could never complete. Left for the retry, which deletes the workflows first.
	//
	// `workflowsClean` does not promise the folder is empty. A build that
	// succeeded reports only the workflows its own turn created, so a seeded
	// workflow the agent never touched is not in `createdWorkflowIds` and is
	// still inside. That one is archived to the project root here rather than
	// deleted. `remapSeedArtifactIds` renames every iteration's seed, so nothing
	// turns ambiguous, and the next run's name-based eviction clears it.
	if (workflowsClean && build.createdFolderIds?.length) {
		const foldersClean = await deleteEachInProject(
			build.createdFolderIds,
			async (projectId, id) => {
				await client.deleteFolder(projectId, id);
			},
		);
		clean = clean && foldersClean;
		logger.verbose(reportCleanup('folder(s)', build.createdFolderIds.length, foldersClean));
	}

	// Projects a seed created. Deleted last of the artifacts, so anything the
	// run put inside one is already gone by its own path rather than vanishing with
	// the project.
	for (const id of build.createdProjectIds ?? []) {
		try {
			await client.deleteProject(id);
		} catch {
			clean = false; // Best-effort cleanup
		}
	}

	// Clears backend thread state (run-state registries, memory) that otherwise
	// grows one entry per build for the container's lifetime.
	if (build.threadId) {
		try {
			await client.deleteThread(build.threadId);
		} catch {
			clean = false; // Best-effort cleanup
		}
	}

	return clean;
}

// ---------------------------------------------------------------------------
// Concurrency control
// ---------------------------------------------------------------------------

/**
 * Run tasks with bounded concurrency. Like Promise.all but limits how many
 * tasks execute simultaneously to avoid API rate limits.
 */
export async function runWithConcurrency<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	limit: number,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;

	async function worker(): Promise<void> {
		while (nextIndex < items.length) {
			const index = nextIndex++;
			results[index] = await fn(items[index]);
		}
	}

	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => await worker());
	await Promise.all(workers);
	return results;
}

export async function runWorkflowChecks(args: {
	workflow: WorkflowResponse | undefined;
	prompt: string;
	agentText: string | undefined;
	/** Per-live-turn failed build-workflow attempt counts; feeds the efficiency check. */
	failedBuildsPerTurn?: number[];
	logger: EvalLogger;
}): Promise<CheckOutcome[] | undefined> {
	if (!args.workflow) return undefined;

	const modelId = hasAnthropicKey() ? SONNET_MODEL : undefined;
	const ctx: BinaryCheckContext = {
		prompt: args.prompt,
		...(modelId ? { modelId } : {}),
		...(args.agentText ? { agentTextResponse: args.agentText } : {}),
		...(args.failedBuildsPerTurn ? { failedBuildsPerTurn: args.failedBuildsPerTurn } : {}),
	};

	try {
		const { outcomes } = await runBinaryChecks(args.workflow, ctx);
		const failed = outcomes.filter((o) => o.status === 'fail');
		if (failed.length > 0) {
			args.logger.info(
				`  Workflow checks: ${String(failed.length)} failing (${failed.map((o) => o.name).join(', ')})`,
			);
		}
		const errored = outcomes.filter((o) => o.status === 'error');
		if (errored.length > 0) {
			args.logger.warn(
				`  Workflow checks: ${String(errored.length)} errored, excluded from scoring (${errored.map((o) => o.name).join(', ')})`,
			);
		}
		return outcomes;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		args.logger.warn(`  Workflow checks errored: ${message}`);
		return undefined;
	}
}

function hasAnthropicKey(): boolean {
	return [
		process.env.N8N_AI_ANTHROPIC_KEY,
		process.env.ANTHROPIC_API_KEY,
		process.env.N8N_INSTANCE_AI_MODEL_API_KEY,
	].some((value) => Boolean(value?.trim()));
}
