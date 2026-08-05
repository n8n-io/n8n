import { UnexpectedError, UnimplementedError, type JsonValue } from '../common';
import type { ExternalDependencies, IStepExecutor } from '../dependencies';
import type { GraphNode, WorkflowGraph } from '../graph';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import { loadStepContext } from './load-step-context';
import type { StepError, StepRecord, StepStore } from './step-store';

/**
 * Handles the `step:ready` step event: claims the step (`queued → running`),
 * runs it through the executor for its step type, records the outcome, and
 * reports back to the orchestration worker with `step:completed`.
 *
 * A step that cannot run — no executor, an input shape we don't support yet —
 * makes the handler throw: before the claim the event is rejected with the
 * step untouched, after it the step is left `running` for reconciliation
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
		const { step, execution, node } = await loadStepContext(
			this.executionStore,
			this.stepStore,
			event,
		);
		const executor = this.executorFor(step, node);

		// Claim via CAS so a duplicate/redelivered event is a no-op.
		const claimed = await this.stepStore.claimStep(event.stepId);
		if (!claimed) return;

		// NOTE: an unexpected error in gathering inputs will leave the step
		// running. In the future, this will be handled by either:
		// - Reconciliation (CAT-2938) taking over the step and retrying it for transient errors
		// - Internal consistency checks (CAT-3930) detecting a misconfigured graph and failing the execution
		const inputs = await this.gatherInputs(execution, step);

		// Only a failure to run the step fails it. A store error propagates instead —
		// recording `failed` on a step whose side effects happened would be a lie.
		let run: { ok: true; outputs: JsonValue } | { ok: false; error: unknown };
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
			type: 'step:completed',
			executionId: event.executionId,
			stepId: event.stepId,
		});
	}

	private async runStep(
		step: StepRecord,
		execution: ExecutionRecord,
		node: GraphNode,
		inputs: JsonValue,
		executor: IStepExecutor,
	): Promise<JsonValue> {
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
	private async gatherInputs(execution: ExecutionRecord, step: StepRecord): Promise<JsonValue> {
		const incoming = execution.graph.edges.filter((edge) => edge.to === step.nodeId);
		if (incoming.length === 0) {
			// Steps are planned only for a completed step's successors, so a step
			// without a predecessor means the graph and the step rows disagree.
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId}, which has no predecessor in the execution graph`,
			);
		}
		// The pass-through below hands over the whole output, so anything but a
		// single first-output-to-first-input edge would misroute data.
		// TODO(CAT-2874): route inputs by connection slot.
		const [edge] = incoming;
		if (incoming.length > 1 || edge.outputIndex !== 0 || edge.inputIndex !== 0) {
			throw new UnimplementedError(
				`step ${step.id} runs node ${step.nodeId}, whose inputs use connection slots; routing by slot is not supported yet`,
			);
		}

		const predecessorId = edge.from;
		// The trigger's step row is recorded already-completed and carries no
		// outputs, so its payload comes off the execution instead.
		// NOTE: proper trigger handling has not been built yet. We'll clean this up
		// when we get there.
		if (isTrigger(execution.graph, predecessorId)) return execution.triggerPayload;

		const outputsByNodeId = await this.stepStore.loadStepOutputs(execution.id, [predecessorId]);
		return outputsByNodeId[predecessorId] ?? null;
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

function isTrigger(graph: WorkflowGraph, nodeId: string): boolean {
	return graph.nodes.find((node) => node.id === nodeId)?.type === 'trigger';
}

function toStepError(error: unknown): StepError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { name: 'Error', message: String(error) };
}
