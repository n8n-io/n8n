import { UnexpectedError, UnimplementedError } from '../common';
import type { ExternalDependencies, IStepExecutor } from '../dependencies';
import type { GraphNode } from '../graph';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { StepSlots } from './execution.types';
import type { StepError, StepRecord, StepStore } from './step-store';

/**
 * Handles the `step:ready` step event: claims the step (`queued → running`),
 * runs it through the executor for its step type, records the outcome, and
 * reports back to the orchestration worker with `step:completed`.
 *
 * A step that cannot run — no executor, an input shape we don't support yet —
 * is recorded as `failed` rather than left `running`, so the execution has a
 * legible outcome instead of stalling.
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
		const claimed = await this.stepStore.claimStep(event.stepId);
		if (!claimed) return;

		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);
		if (step.executionId !== event.executionId) {
			throw new UnexpectedError(
				`step ${step.id} belongs to execution ${step.executionId}, but the event claims ${event.executionId}`,
			);
		}

		// Only a failure to run the step fails it. A store error propagates instead —
		// recording `failed` on a step whose side effects happened would be a lie.
		let run: { ok: true; outputs: StepSlots } | { ok: false; error: unknown };
		try {
			run = { ok: true, outputs: await this.runStep(step, execution) };
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
			type: 'step:completed',
			executionId: event.executionId,
			stepId: event.stepId,
		});
	}

	private async runStep(step: StepRecord, execution: ExecutionRecord): Promise<StepSlots> {
		const node = execution.graph.nodes.find((candidate) => candidate.id === step.nodeId);
		if (!node) {
			throw new UnexpectedError(
				`step ${step.id} references node ${step.nodeId}, which is absent from the execution graph`,
			);
		}

		const inputs = await this.gatherInputs(execution, node, step.id);
		const executor = this.executorFor(node, step.id);
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

	/**
	 * Inputs for `node`, routed slot to slot: each incoming edge copies the output
	 * slot it leaves from into the input slot it arrives at.
	 */
	private async gatherInputs(
		execution: ExecutionRecord,
		node: GraphNode,
		stepId: string,
	): Promise<StepSlots> {
		const incoming = execution.graph.edges.filter((edge) => edge.to === node.id);
		if (incoming.length === 0) {
			// Steps are planned only for a completed step's successors, so a step
			// without a predecessor means the graph and the step rows disagree.
			throw new UnexpectedError(
				`step ${stepId} runs node ${node.id}, which has no predecessor in the execution graph`,
			);
		}

		const predecessorIds = [...new Set(incoming.map((edge) => edge.from))];
		const outputsByNodeId = await this.stepStore.loadStepOutputs(execution.id, predecessorIds);

		const inputs: StepSlots = [];
		for (const edge of incoming) {
			if (inputs[edge.inputIndex] !== undefined) {
				// v1 runs the node once per incoming branch rather than combining them,
				// which needs several step rows for one node — the unique step key
				// forbids that until it gains a run dimension.
				throw new UnimplementedError(
					`step ${stepId} runs node ${node.id}, which has more than one edge into input ${edge.inputIndex}; running a node once per incoming branch is not supported yet`,
				);
			}
			inputs[edge.inputIndex] = outputsByNodeId[edge.from]?.[edge.outputIndex] ?? null;
		}

		// An input slot nothing connects to reads as not taken, not as a hole.
		for (let slot = 0; slot < inputs.length; slot++) inputs[slot] ??= null;

		return inputs;
	}

	/**
	 * The executor for `node`'s step type. Step types the engine runs itself
	 * (`wait`, `subworkflow`, `batch`) don't reach this seam, and aren't built yet.
	 */
	private executorFor(node: GraphNode, stepId: string): IStepExecutor {
		if (node.type === 'v1-node') {
			const executor = this.dependencies.v1StepExecutor;
			if (!executor) {
				throw new UnimplementedError(
					`step ${stepId}: no executor configured for v1-node steps; the host must supply one in integrated mode`,
				);
			}
			return executor;
		}

		throw new UnimplementedError(`step ${stepId}: no executor for step type ${node.type}`);
	}
}

function toStepError(error: unknown): StepError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { name: 'Error', message: String(error) };
}
