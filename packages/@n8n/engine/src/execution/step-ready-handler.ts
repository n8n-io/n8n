import { UnexpectedError, UnimplementedError } from '../common';
import type { ExternalDependencies, IStepExecutor } from '../dependencies';
import type { GraphNode } from '../graph';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import type { StepSlots } from './execution.types';
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
			type: 'step:completed',
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

		// Graph validation only constrains edges, not what a node emits: a
		// single-wired If passes it and still fires two slots. Until branching
		// lands, an outcome the slot model can't yet represent fails the step, so
		// the execution gets a legible error instead of misrouted data.
		// TODO(CAT-2874): multi-slot outputs become routable with branching.
		if (outputs.length > 1) {
			throw new UnimplementedError(
				`step ${step.id} runs node ${step.nodeId}, which produced ${outputs.length} output slots; only output slot 0 is supported yet`,
			);
		}
		// TODO(CAT-2874): an unfilled connected slot becomes a dead branch with
		// settlement; until then it is unrepresentable.
		const hasSuccessors = execution.graph.edges.some((edge) => edge.from === step.nodeId);
		if (hasSuccessors && (outputs.length === 0 || outputs[0] === null)) {
			throw new UnimplementedError(
				`step ${step.id} runs node ${step.nodeId}, which did not fire output slot 0 despite having successors; branch selection is not supported yet`,
			);
		}

		return outputs;
	}

	/**
	 * Inputs for `node`, routed by slot: its one incoming edge copies the
	 * predecessor's output slot 0 into input slot 0. The trigger is no special
	 * case — its step row carries the captured payload as its outputs.
	 *
	 * The slot checks below cannot fail for a graph that passed
	 * `validateExecutableGraph`; they guard against state written by a
	 * differently-shaped engine version or a store bug.
	 */
	private async gatherInputs(execution: ExecutionRecord, step: StepRecord): Promise<StepSlots> {
		const incoming = execution.graph.edges.filter((edge) => edge.to === step.nodeId);
		if (incoming.length === 0) {
			// Steps are planned only for a completed step's successors, so a step
			// without a predecessor means the graph and the step rows disagree.
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId}, which has no predecessor in the execution graph`,
			);
		}
		if (incoming.length > 1) {
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId}, which has ${incoming.length} incoming edges; validated graphs have at most one edge per input slot`,
			);
		}
		const [edge] = incoming;
		if (edge.outputIndex !== 0 || edge.inputIndex !== 0) {
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId} through edge slots ${edge.outputIndex} → ${edge.inputIndex}; validated graphs only use slot 0`,
			);
		}

		const outputsByNodeId = await this.stepStore.loadStepOutputs(execution.id, [edge.from]);
		const predecessorOutputs = outputsByNodeId[edge.from] ?? [];
		if (predecessorOutputs.length > 1) {
			throw new UnexpectedError(
				`step ${step.id} reads node ${edge.from}, whose step recorded more than one output slot; the write-time guard admits only slot 0`,
			);
		}

		return [predecessorOutputs[0] ?? null];
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

function toStepError(error: unknown): StepError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { name: 'Error', message: String(error) };
}
