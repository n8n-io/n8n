import { toEngineConnections, type WorkflowJSON } from '@n8n/workflow-sdk';
import { NodeConnectionTypes } from 'n8n-workflow';

import { prepareVerificationRun, type PreparedVerificationRun } from './prepare-run';
import type { ExecutionRunResult, VerifyToolInput, WorkflowTaskService } from './types';
import type { Logger } from '../../../logger';
import type { InstanceAiExecutionService } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { firstPageOmissions } from '../../workflows/next-workflow-build';
import { contractLoopsOf } from '../../workflows/workflow-validation-warnings';

/**
 * Node contracts: verification reads a node with a declared output live, so the drift check sees
 * the real response. A live read can fail for reasons that are not in the workflow: a placeholder
 * host, a credential without access, an API that is down. Then the declared fixture stands in, and
 * the run repeats once, so the failure never reads as a workflow error.
 */

export interface LiveReadFailure {
	readonly nodeName: string;
	readonly reason: string;
}

const MAX_REASON_CHARS = 160;

const oneLine = (text: string) => {
	const line = text.replace(/\s+/g, ' ').trim();
	return line.length > MAX_REASON_CHARS ? `${line.slice(0, MAX_REASON_CHARS - 1)}…` : line;
};

/**
 * The live reads that failed in a run: each one with a node error, or, when the run stopped with
 * no node error (e.g. at the time-out) and not after another node, each one that did not finish.
 */
export function failedLiveReads(
	result: ExecutionRunResult,
	liveReadNodeNames: readonly string[],
): LiveReadFailure[] {
	const errors = result.nodeErrors ?? [];
	const failed = liveReadNodeNames.flatMap((nodeName) => {
		const error = errors.find((entry) => entry.nodeName === nodeName);
		return error
			? [{ nodeName, reason: oneLine(error.message ?? result.error ?? 'unknown error') }]
			: [];
	});
	const stoppedAt = result.lastNodeExecuted;
	if (
		failed.length > 0 ||
		errors.length > 0 ||
		result.status === 'success' ||
		!result.error ||
		(stoppedAt !== undefined && !liveReadNodeNames.includes(stoppedAt))
	) {
		return failed;
	}
	const finished = new Set(result.executedNodeNames ?? []);
	const stopped = oneLine(result.error);
	return liveReadNodeNames
		.filter((nodeName) => !finished.has(nodeName))
		.map((nodeName) => ({ nodeName, reason: stopped }));
}

/** The output of a loop check that ends the loop: `CHECK_DONE` in `@n8n/workflow-sdk/next`. */
const LOOP_DONE_OUTPUT = 0;

type RunOptions = NonNullable<Parameters<InstanceAiExecutionService['run']>[2]>;

/**
 * The run options for the live reads of a verification run. Each read sends one request: the
 * engine runs it once and gives that output to its later runs, and a paged read runs without its
 * page inputs. The same response on each pass can keep a loop from meeting its exit condition, so
 * each loop that holds a live read ends at its pass limit, as with `onLimit: 'continue'`.
 */
export async function liveReadRunOptions(
	workflow: WorkflowJSON | undefined,
	liveReadNodeNames: readonly string[],
): Promise<Pick<RunOptions, 'readOnceNodeNames' | 'omitParameters' | 'redirectOutputs'>> {
	if (liveReadNodeNames.length === 0) return {};
	if (!workflow) return { readOnceNodeNames: [...liveReadNodeNames] };
	const { loopNodeNames } = await import('@n8n/workflow-sdk/next');
	const readIds = new Set(
		workflow.nodes.flatMap((node) =>
			node.name && node.id && liveReadNodeNames.includes(node.name) ? [node.id] : [],
		),
	);
	const connections = toEngineConnections(workflow.connections);
	const redirectOutputs = (await contractLoopsOf(workflow)).flatMap(({ headId, nodeIds }) => {
		const head = workflow.nodes.find((node) => node.id === headId)?.name;
		if (!head || !nodeIds.some((id) => readIds.has(id))) return [];
		const { check, limit } = loopNodeNames(head);
		const output = (connections[check]?.[NodeConnectionTypes.Main] ?? []).findIndex((targets) =>
			targets?.some(({ node }) => node === limit),
		);
		return output > LOOP_DONE_OUTPUT
			? [{ nodeName: check, output, asOutput: LOOP_DONE_OUTPUT }]
			: [];
	});
	const omitParameters = firstPageOmissions(workflow, liveReadNodeNames);
	return {
		readOnceNodeNames: [...liveReadNodeNames],
		...(omitParameters.length > 0 ? { omitParameters } : {}),
		...(redirectOutputs.length > 0 ? { redirectOutputs } : {}),
	};
}

/** The outcome patch that pins the declared fixture of each failed live read. */
export function pinnedLiveReadsPatch(
	outcome: WorkflowBuildOutcome,
	failures: readonly LiveReadFailure[],
): Pick<WorkflowBuildOutcome, 'nodeSimulationPlan' | 'simulationFixtures' | 'liveReadFallbacks'> {
	const reasons = new Map(failures.map(({ nodeName, reason }) => [nodeName, reason]));
	const fallbacks = Object.entries(outcome.liveReadFallbacks ?? {});
	const verdictOf = (nodeName: string, reason: string) => ({
		nodeName,
		verdict: 'simulate' as const,
		reason: `Live read failed: ${reason}`,
		confidence: 'high' as const,
		source: 'deterministic' as const,
	});
	const plan = outcome.nodeSimulationPlan ?? [];
	const planned = new Set(plan.map(({ nodeName }) => nodeName));
	const remaining = fallbacks.filter(([nodeName]) => !reasons.has(nodeName));
	return {
		nodeSimulationPlan: [
			...plan.map((verdict) => {
				const reason = reasons.get(verdict.nodeName);
				return reason === undefined ? verdict : verdictOf(verdict.nodeName, reason);
			}),
			...failures
				.filter(({ nodeName }) => !planned.has(nodeName))
				.map(({ nodeName, reason }) => verdictOf(nodeName, reason)),
		],
		simulationFixtures: {
			...outcome.simulationFixtures,
			...Object.fromEntries(fallbacks.filter(([nodeName]) => reasons.has(nodeName))),
		},
		liveReadFallbacks: remaining.length > 0 ? Object.fromEntries(remaining) : undefined,
	};
}

/** One line for the result: which live reads failed, why, and that it is no workflow error. */
export const liveReadNote = (failures: readonly LiveReadFailure[]) =>
	`The live read of ${failures.map(({ nodeName, reason }) => `"${nodeName}" failed (${reason})`).join(' and of ')}, so verification pinned the declared fixture instead. This is not a workflow error: do not edit the workflow for it.`;

/**
 * Runs the pass and, when a live read fails, pins the declared fixture of that node in the build
 * outcome and runs once more. Later runs of this build then pin the node too.
 */
export async function runWithLiveReadFallback(args: {
	buildOutcome: WorkflowBuildOutcome;
	prepared: PreparedVerificationRun;
	input: Pick<VerifyToolInput, 'fixtureOverrides' | 'allowZeroItemFixtures'>;
	run: (prepared: PreparedVerificationRun) => Promise<ExecutionRunResult>;
	workflowTaskService: WorkflowTaskService;
	abortSignal?: AbortSignal;
	logger: Logger;
}): Promise<{
	result: ExecutionRunResult;
	buildOutcome: WorkflowBuildOutcome;
	prepared: PreparedVerificationRun;
	failures: LiveReadFailure[];
}> {
	const { buildOutcome, prepared, input, run, workflowTaskService, abortSignal, logger } = args;
	const first = await run(prepared);
	const failures = abortSignal?.aborted ? [] : failedLiveReads(first, prepared.liveReadNodeNames);
	if (failures.length === 0) return { result: first, buildOutcome, prepared, failures };
	const patch = pinnedLiveReadsPatch(buildOutcome, failures);
	const outcome = { ...buildOutcome, ...patch };
	const repinned = prepareVerificationRun(outcome, input);
	// The pinned nodes are simulated now, so the overrides that passed before pass again.
	if (repinned.kind === 'blocked') return { result: first, buildOutcome, prepared, failures: [] };
	const second = await run(repinned.prepared);
	const stoppedAgain =
		!first.nodeErrors?.length &&
		second.status !== 'success' &&
		!second.nodeErrors?.length &&
		second.error === first.error;
	// The run stops the same way with the reads pinned, so the live reads were not the cause.
	if (stoppedAgain) return { result: first, buildOutcome, prepared, failures: [] };
	await workflowTaskService.updateBuildOutcome(buildOutcome.workItemId, patch).catch((error) =>
		logger.warn('verify-built-workflow: could not store the pinned live reads', {
			workItemId: buildOutcome.workItemId,
			error: error instanceof Error ? error.message : String(error),
		}),
	);
	return { result: second, buildOutcome: outcome, prepared: repinned.prepared, failures };
}
