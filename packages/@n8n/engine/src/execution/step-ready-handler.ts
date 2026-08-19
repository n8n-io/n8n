import { UnexpectedError, UnimplementedError, type JsonValue } from '../common';
import type { ExternalDependencies, IStepExecutor } from '../dependencies';
import type { GraphEdge, GraphNode } from '../graph';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import { stepKeyId, isSettledStatus, type StepKeyId, type StepSlots } from './execution.types';
import type { StepError, StepRecord, StepStore } from './step-store';
import { validateStepContext } from './validate-step-context';

/**
 * Handles the `step:ready` step event: claims the step (`queued -> running`),
 * runs it through the executor for its step type, records the outcome, and
 * reports back to the orchestration worker with `step:settled`.
 *
 * A step that cannot run — no executor, an input shape we don't support yet —
 * makes the handler throw, leaving the step `running` for reconciliation
 * (CAT-2938) or internal consistency checks (CAT-3930) to resolve.
 */
export class StepReadyHandler {
	constructor(
		private readonly executionStore: ExecutionStore,
		private readonly stepStore: StepStore,
		private readonly orchestrationQueue: WorkQueue<OrchestrationMessage>,
		private readonly dependencies: ExternalDependencies,
	) {}

	async handle(event: StepReadyEvent): Promise<void> {
		// Claim via CAS so a duplicate/redelivered event is a no-op.
		const step = await this.stepStore.claimStep(event.stepId);
		if (!step) return;

		// NOTE: we would prefer to do this validation before the claim,
		// but we need to check the execution status AFTER the claim to
		// avoid executing a step for a failed or cancelled execution.
		// Reconciliation or a more robust consistency story will improve
		// this in the future (CAT-2938, CAT-3930).
		const execution = await this.executionStore.loadExecution(event.executionId);
		const node = validateStepContext(step, execution);
		const executor = this.executorFor(step, node);

		if (execution.status !== 'running') {
			// The execution is no longer running, so we don't run the step.
			// The step is left `running` for reconciliation (CAT-2938) or
			// internal consistency checks (CAT-3930) to resolve.
			return;
		}

		// NOTE: an unexpected error in gathering inputs will leave the step
		// running. In the future, this will be handled by either:
		// - Reconciliation (CAT-2938) taking over the step and retrying it for transient errors
		// - Internal consistency checks (CAT-3930) detecting a misconfigured graph and failing the execution
		const inputs = await this.gatherInputs(execution, step);

		// Only a failure to run the step fails it. A store error propagates instead —
		// recording `failed` on a step whose side effects happened would be a lie.
		let run: { ok: true; outputs: StepSlots } | { ok: false; error: unknown };
		try {
			run = {
				ok: true,
				outputs: await this.runStep(step, execution, node, inputs, executor),
			};
		} catch (error) {
			run = { ok: false, error };
		}

		const recorded = run.ok
			? await this.stepStore.completeStep(event.stepId, run.outputs)
			: await this.stepStore.failStep(event.stepId, toStepError(run.error));

		// Recording is a CAS on `running`, so losing it means something else took the
		// step over while we ran — announce only outcomes we actually wrote, and let
		// whoever holds it now announce theirs. TODO(CAT-2938): reconciliation is the
		// only thing that can take a step over, and it doesn't exist yet.
		if (!recorded) return;

		await this.orchestrationQueue.publish({
			type: 'step:settled',
			executionId: event.executionId,
			stepId: event.stepId,
		});
	}

	private async runStep(
		step: StepRecord,
		execution: ExecutionRecord,
		node: GraphNode,
		inputs: StepSlots,
		executor: IStepExecutor,
	): Promise<StepSlots> {
		// Outputs are stored without inspection. Which slots fired (including
		// none) is the settlement handler's concern when it plans successors.
		const { outputs } = await executor.execute({
			node,
			inputs,
			context: {
				executionId: execution.id,
				stepId: step.id,
				workflowId: execution.workflowId,
				mode: execution.mode,
			},
		});
		return outputs;
	}

	/** Inputs for `node`, each slot taken from its predecessor's output. */
	private async gatherInputs(execution: ExecutionRecord, step: StepRecord): Promise<StepSlots> {
		// These are all the edges that feed into the node this step runs.
		const incomingEdges = execution.graph.edges.filter((edge) => edge.to === step.nodeId);
		if (incomingEdges.length === 0) {
			// Steps are planned only for a settled step's successors, so a step
			// without a predecessor means the graph and the step rows disagree.
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId}, which has no predecessor in the execution graph`,
			);
		}

		validateIncomingEdges(incomingEdges, step);

		const predecessorNodeIds = [...new Set(incomingEdges.map((edge) => edge.from))];
		const predecessorSteps = await this.stepStore.loadStepsByKeys(
			execution.id,
			predecessorNodeIds.map((nodeId) => ({ nodeId, iteration: step.iteration })),
		);

		// Array of length equal to the highest input slot plus one.
		// The entries are `null` placeholders filled by the loop immediately below.
		const inputs: StepSlots = Array.from(
			{ length: Math.max(...incomingEdges.map((edge) => edge.inputIndex)) + 1 },
			() => null,
		);

		for (const edge of incomingEdges) {
			inputs[edge.inputIndex] = readEdgeValue(edge, step, predecessorSteps);
		}

		return inputs;
	}

	/**
	 * The executor for `node`'s step type. Step types the engine runs itself
	 * (`wait`, `subworkflow`, `batch`) don't reach this seam, and aren't built yet.
	 */
	private executorFor(step: StepRecord, node: GraphNode): IStepExecutor {
		if (node.type === 'v1-node') {
			const executor = this.dependencies.v1StepExecutor;
			if (!executor) {
				throw new UnimplementedError(
					`step ${step.id}: no executor configured for v1-node steps; the host must supply one in integrated mode`,
				);
			}
			return executor;
		}

		throw new UnimplementedError(`step ${step.id}: no executor for step type ${node.type}`);
	}
}

// Validate that the incoming edges meet our constraints. filledSlots tracks the filled
// input slots so we can detect multiple edges into the same slot.
function validateIncomingEdges(incomingEdges: GraphEdge[], step: StepRecord): void {
	const filledSlots: Set<number> = new Set();
	for (const edge of incomingEdges) {
		if (filledSlots.has(edge.inputIndex)) {
			// TODO(CAT-3982): same-slot convergence gets a defined meaning. We
			// should have rejected this graph at validation time.
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId}, which has more than one edge into input slot ${edge.inputIndex}; validated graphs have at most one edge per input slot`,
			);
		}
		filledSlots.add(edge.inputIndex);
	}
}

/**
 * The value an edge delivers: the source's output slot for a completed
 * predecessor, `null` for a dead edge (predecessor settled without completing,
 * or left the slot unfilled).
 */
function readEdgeValue(
	edge: GraphEdge,
	step: StepRecord,
	predecessorSteps: Record<StepKeyId, StepRecord>,
): JsonValue {
	const row = predecessorSteps[stepKeyId({ nodeId: edge.from, iteration: step.iteration })];
	if (!row || !isSettledStatus(row.status)) {
		// A step is planned only once every predecessor settled, so running on
		// a fabricated empty input would mask a planner/store inconsistency.
		throw new UnexpectedError(
			`step ${step.id} reads node ${edge.from}, whose step has not settled`,
		);
	}
	if (row.status !== 'completed') return null;
	return row.outputs?.[edge.outputIndex] ?? null;
}

function toStepError(error: unknown): StepError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { name: 'Error', message: String(error) };
}
