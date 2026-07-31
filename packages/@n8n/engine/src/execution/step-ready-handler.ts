import { UnexpectedError, UnimplementedError, type JsonValue } from '../common';
import type { ExternalDependencies, IStepExecutor } from '../dependencies';
import { getPredecessorNodeIds, type GraphNode, type WorkflowGraph } from '../graph';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { StepError, StepStore } from './step-store';

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

		let recorded: boolean;
		try {
			const outputs = await this.runStep(event);
			recorded = await this.stepStore.completeStep(event.stepId, outputs);
		} catch (error) {
			recorded = await this.stepStore.failStep(event.stepId, toStepError(error));
		}

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

	private async runStep(event: StepReadyEvent): Promise<JsonValue> {
		const [step, execution] = await Promise.all([
			this.stepStore.loadStep(event.stepId),
			this.executionStore.loadExecution(event.executionId),
		]);

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
	 * Inputs for `node`, taken from its predecessor's output. The trigger's output
	 * is the payload captured on the execution rather than a step output.
	 */
	private async gatherInputs(
		execution: ExecutionRecord,
		node: GraphNode,
		stepId: string,
	): Promise<JsonValue> {
		const predecessorIds = getPredecessorNodeIds(execution.graph, node.id);
		if (predecessorIds.length === 0) {
			// Steps are planned only for a completed step's successors, so a step
			// without a predecessor means the graph and the step rows disagree.
			throw new UnexpectedError(
				`step ${stepId} runs node ${node.id}, which has no predecessor in the execution graph`,
			);
		}
		if (predecessorIds.length > 1) {
			throw new UnimplementedError(
				`step ${stepId} runs node ${node.id}, which has more than one predecessor; combining inputs from several steps is not supported yet`,
			);
		}

		const [predecessorId] = predecessorIds;
		// The trigger's step row is recorded already-completed and carries no
		// outputs, so its payload comes off the execution instead.
		if (isTrigger(execution.graph, predecessorId)) return execution.triggerPayload;

		const outputsByNodeId = await this.stepStore.loadStepOutputs(execution.id, predecessorIds);
		return outputsByNodeId[predecessorId] ?? null;
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

function isTrigger(graph: WorkflowGraph, nodeId: string): boolean {
	return graph.nodes.find((node) => node.id === nodeId)?.type === 'trigger';
}

function toStepError(error: unknown): StepError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { name: 'Error', message: String(error) };
}
