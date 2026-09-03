import { UnexpectedError, UnimplementedError, type JsonValue } from '../common';
import type { ExternalDependencies, IStepExecutor, StepExecutionResult } from '../dependencies';
import {
	deriveLoops,
	isBatchStepConfig,
	type GraphEdge,
	type GraphNode,
	type WorkflowLoop,
} from '../graph';
import type { LifecycleEventPublisher } from '../lifecycle-events';
import { runBatchStep } from './batch-step';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import {
	stepKeyId,
	isSettledStatus,
	hasResumeCondition,
	type StepError,
	type StepKey,
	type StepKeyId,
	type StepSlots,
	type WaitDeclaration,
} from './execution.types';
import { classifyEdge, sourceRow } from './iteration-mapping';
import { exitSourcesInto, loadTerminalIterations } from './loop-ledger';
import type { StepRecord, StepStore } from './step-store';
import { createStoreLoopReader } from './store-loop-reader';
import { validateStepContext } from './validate-step-context';

/**
 * Handles the `step:ready` step event: claims the step (`queued -> running`),
 * runs it through the executor for its step type, records what came back, and
 * reports back to the orchestration worker with `step:settled`.
 *
 * What comes back is an outcome or a wait. An outcome — outputs or an error —
 * settles the step, and is announced. A wait suspends it instead
 * (`running -> waiting`): the step still owes the execution a settlement, so
 * nothing is announced and no successor is planned until it resumes.
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
		private readonly lifecycleEventPublisher: LifecycleEventPublisher,
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

		// The engine runs a batch step itself, so it has no executor to look up.
		const executor = node.type === 'batch' ? undefined : this.executorFor(step, node);

		if (execution.status !== 'running') {
			// The execution is no longer running, so we don't run the step.
			// The step is left `running` for reconciliation (CAT-2938) or
			// internal consistency checks (CAT-3930) to resolve.
			return;
		}

		// This worker won the claim, so it is the one that announces the start.
		this.lifecycleEventPublisher.publish({ type: 'step:started', ...stepEventFields(step, node) });

		// A deadline resume emits what the declaration captured, so the node does
		// not run again and has no inputs to gather. Every other dispatch does,
		// and the gather stays outside the `try` below on purpose: the errors it
		// raises are the engine's own bookkeeping, not the node's, so they leave
		// the step running rather than recording it failed. In the future that is
		// handled by either:
		// - Reconciliation (CAT-2938) taking over the step and retrying it for transient errors
		// - Internal consistency checks (CAT-3930) detecting a misconfigured graph and failing the execution
		const dispatch: { kind: 'deadline' } | { kind: 'run'; inputs: StepSlots } =
			step.resume?.kind === 'deadline'
				? { kind: 'deadline' }
				: { kind: 'run', inputs: await this.gatherInputs(execution, step) };

		// Only a failure to run the step fails it. A store error propagates instead —
		// recording `failed` on a step whose side effects happened would be a lie.
		let run:
			| { kind: 'outputs'; outputs: StepSlots }
			| { kind: 'wait'; wait: WaitDeclaration }
			| { kind: 'error'; error: unknown };
		try {
			let result: StepExecutionResult;
			if (dispatch.kind === 'deadline') {
				// The declaration already holds what this step emits, so the node does
				// not run again and no executor is involved.
				result = { outputs: capturedDeadlineOutputs(step) };
			} else if (executor) {
				result = await this.runStep(step, execution, node, dispatch.inputs, executor);
			} else {
				result = { outputs: await this.runBatchNode(step, execution, node) };
			}
			run = result.wait
				? { kind: 'wait', wait: result.wait }
				: { kind: 'outputs', outputs: result.outputs };
		} catch (error) {
			run = { kind: 'error', error };
		}

		let recorded: boolean;
		if (run.kind === 'outputs') {
			recorded = await this.stepStore.completeStep(event.stepId, run.outputs);
		} else if (run.kind === 'wait') {
			recorded = await this.stepStore.suspendStep(event.stepId, run.wait);
		} else {
			recorded = await this.stepStore.failStep(event.stepId, toStepError(run.error));
		}

		// Recording is a CAS on `running`, so losing it means something else took the
		// step over while we ran — announce only outcomes we actually wrote, and let
		// whoever holds it now announce theirs. TODO(CAT-2938): reconciliation is the
		// only thing that can take a step over, and it doesn't exist yet.
		if (!recorded) return;

		// A wait is no outcome: nothing settled, so nothing is announced and no
		// planning follows. TODO(CAT-2928): `step:waiting` surfaces it to the UI.
		if (run.kind === 'wait') return;

		// Before the settled event, or the execution could announce its end first.
		// Outputs ride along so a consumer needs no read to render them.
		this.lifecycleEventPublisher.publish(
			run.kind === 'outputs'
				? { type: 'step:completed', ...stepEventFields(step, node), outputs: run.outputs }
				: { type: 'step:failed', ...stepEventFields(step, node) },
		);

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
	): Promise<StepExecutionResult> {
		// The result is stored without inspection - which slots fired, or what a
		// wait means to the node, is not this handler's concern. The one exception
		// is a wait nothing could ever end, which would strand the execution.
		const result = await executor.execute({
			node,
			inputs,
			context: {
				executionId: execution.id,
				stepId: step.id,
				workflowId: execution.workflowId,
				mode: execution.mode,
				iteration: step.iteration,
			},
			...(step.resume?.kind === 'request'
				? { resumeRequest: { payload: step.resume.payload } }
				: {}),
		});

		if (result.wait && !hasResumeCondition(result.wait)) {
			throw new UnexpectedError(
				`step ${step.id} declares a wait that can never resume: it names neither a deadline nor a resume request`,
			);
		}

		return result;
	}

	/** Runs one pass of a batch node, in place of an executor. */
	private async runBatchNode(
		step: StepRecord,
		execution: ExecutionRecord,
		node: GraphNode,
	): Promise<StepSlots> {
		if (!isBatchStepConfig(node.config)) {
			throw new UnexpectedError(
				`step ${step.id} runs batch node ${step.nodeId}, whose config has no whole batch size of at least 1`,
			);
		}

		const loops = deriveLoops(execution.graph);
		const loop = loops.find((l) => l.batchNodeId === step.nodeId);
		if (!loop) {
			throw new UnexpectedError(
				`step ${step.id} runs batch node ${step.nodeId}, which heads no loop in the execution graph`,
			);
		}

		// An earlier loop feeding this one is read at its last pass, not its first.
		const terminalIterations = await loadTerminalIterations(
			this.stepStore,
			execution.id,
			exitSourcesInto(execution.graph, loops, [step.nodeId]),
		);
		const reader = createStoreLoopReader(
			this.stepStore,
			execution.id,
			loops,
			loop,
			terminalIterations,
		);
		return await runBatchStep(node.config, step.iteration, reader);
	}

	/** Inputs for `node`, each slot taken from the row its edge reads. */
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

		const loops = deriveLoops(execution.graph);
		// Only an exit edge reads the row that ended a loop, so a step with no exit
		// edge needs no such read at all.
		const terminalIterations = await loadTerminalIterations(
			this.stepStore,
			execution.id,
			exitSourcesInto(execution.graph, loops, [step.nodeId]),
		);
		const reads = resolveInputReads(incomingEdges, loops, step, terminalIterations);

		// One key per distinct row: a predecessor wired to two input slots is read
		// twice but loaded once.
		const rows = await this.stepStore.loadStepsByKeys(execution.id, [
			...new Map(reads.map(({ key }) => [stepKeyId(key), key])).values(),
		]);

		// Array of length equal to the highest input slot plus one.
		// The entries are `null` placeholders filled by the loop immediately below.
		const inputs: StepSlots = Array.from(
			{ length: Math.max(...reads.map(({ edge }) => edge.inputIndex)) + 1 },
			() => null,
		);

		for (const { edge, key } of reads) {
			inputs[edge.inputIndex] = readEdgeValue(edge, key, step, rows);
		}

		return inputs;
	}

	/**
	 * The executor for `node`'s step type. Step types the engine runs itself don't
	 * reach this seam: `batch` is handled before it, and `wait` and `subworkflow`
	 * aren't built yet.
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

/**
 * Which row each incoming edge reads for this step, one per input slot.
 *
 * An edge that connects nothing at this iteration is dropped, which is what lets
 * a batch node carry both an entry edge and a return edge on slot 0: they never
 * apply at the same iteration, so per iteration the slot still has one source.
 * Two edges that do both apply are the unsupported convergence case.
 */
export function resolveInputReads(
	incomingEdges: GraphEdge[],
	loops: WorkflowLoop[],
	step: Pick<StepRecord, 'id' | 'nodeId' | 'iteration'>,
	terminalIterations: Map<string, number>,
): Array<{ edge: GraphEdge; key: StepKey }> {
	const reads = incomingEdges.flatMap((edge) => {
		const source = sourceRow(
			edge,
			classifyEdge(edge, loops),
			step,
			terminalIterations.get(edge.from),
		);
		if (source.kind === 'row') return [{ edge, key: source.key }];
		if (source.kind === 'none') return [];
		// The planner queues a step only once every row it reads exists, so a loop
		// that has not ended means the rows and the plan disagree.
		throw new UnexpectedError(
			`step ${step.id} reads node ${edge.from} across a loop that has not ended`,
		);
	});

	if (reads.length === 0) {
		throw new UnexpectedError(
			`step ${step.id} runs node ${step.nodeId}, which no edge reaches at iteration ${step.iteration}`,
		);
	}

	const filledSlots: Set<number> = new Set();
	for (const { edge } of reads) {
		if (filledSlots.has(edge.inputIndex)) {
			// TODO(CAT-3982): same-slot convergence gets a defined meaning. We
			// should have rejected this graph at validation time.
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId}, which has more than one edge into input slot ${edge.inputIndex}; validated graphs have at most one edge per input slot`,
			);
		}
		filledSlots.add(edge.inputIndex);
	}

	return reads;
}

/**
 * The value an edge delivers: the source's output slot for a completed
 * predecessor, `null` for a dead edge (predecessor settled without completing,
 * or left the slot unfilled).
 */
function readEdgeValue(
	edge: GraphEdge,
	source: StepKey,
	step: StepRecord,
	rows: Record<StepKeyId, StepRecord>,
): JsonValue {
	const row = rows[stepKeyId(source)];
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

/** The identifiers every step event carries. */
function stepEventFields(step: StepRecord, node: GraphNode) {
	return {
		executionId: step.executionId,
		stepId: step.id,
		nodeId: step.nodeId,
		nodeName: node.name,
		iteration: step.iteration,
		at: new Date().toISOString(),
	};
}

function toStepError(error: unknown): StepError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack };
	}
	return { name: 'Error', message: String(error) };
}

/**
 * The outputs a deadline resume emits, taken from the declaration on the row.
 * `WaitDeclaration` pairs a deadline with its outputs, so an absent one means
 * the row disagrees with the contract - and a row is a write from outside the
 * type system.
 */
function capturedDeadlineOutputs(step: StepRecord): StepSlots {
	const outputs = step.wait?.outputsAtDeadline;
	if (!outputs) {
		throw new UnexpectedError(
			`step ${step.id} resumes at its deadline but its declaration captured no outputs`,
		);
	}
	return outputs;
}
