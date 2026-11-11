import { UnexpectedError, UnimplementedError, type JsonValue } from '../common';
import type {
	ExternalDependencies,
	IStepExecutor,
	SubExecutionDeclaration,
	StepExecutionResult,
} from '../dependencies';
import { deriveLoops, isBatchStepConfig, type GraphNode } from '../graph';
import type { LifecycleEventPublisherFactory } from '../lifecycle-events';
import { createResponseEmitter, type ExecutionResponseSender } from '../response-channel';
import { runBatchStep } from './batch-step';
import type { OrchestrationMessage, StepReadyEvent, WorkQueue } from '../queue';
import type { ExecutionRecord, ExecutionStore } from './execution-store';
import {
	stepKeyId,
	isLiveExecutionStatus,
	hasResumeCondition,
	type ResumeCause,
	type SubExecutionResumeCause,
	type StepError,
	type StepKeyId,
	type StepSlots,
	type StepSource,
	type ExecutorWaitDeclaration,
} from './execution.types';
import { exitSourcesInto, loadTerminalIterations } from './loop-ledger';
import { InvalidParentLinkError, type StartExecutionService } from './start-execution.service';
import type { StepRecord, StepStore } from './step-store';
import { createStoreLoopReader } from './store-loop-reader';
import { validateStepContext } from './validate-step-context';

/** A resume that emits outputs the engine already holds, so no node code runs. */
type ReplayCause = Exclude<ResumeCause, SubExecutionResumeCause>;

/**
 * How a step produces its result. A replay emits recorded outputs. A batch pass
 * the engine runs itself. A run goes through an executor: a first run, or a
 * sub-execution resume, which runs the node again with the outcome.
 */
type Dispatch =
	| { kind: 'replay'; cause: ReplayCause }
	| { kind: 'batch' }
	| {
			kind: 'run';
			executor: IStepExecutor;
			inputs: StepSlots;
			subExecutionResult?: SubExecutionResumeCause;
	  };

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
		private readonly lifecycleEventPublisherFactory: LifecycleEventPublisherFactory,
		private readonly responseSender: ExecutionResponseSender,
		private readonly startExecution: StartExecutionService,
		/** Called once a wait is on the row, so the sweeper can re-arm on its deadline. */
		private readonly onStepSuspended: () => void = () => {},
	) {}

	async handle(event: StepReadyEvent): Promise<void> {
		// Claim via CAS so a duplicate/redelivered event is a no-op.
		const step = await this.stepStore.claimStep(event.stepId);
		if (!step) return;

		// Read after the claim, so an execution that ended in between is seen
		// here and the step is not run.
		const execution = await this.executionStore.loadExecution(event.executionId);
		const node = validateStepContext(step, execution);

		if (!isLiveExecutionStatus(execution.status)) {
			// The execution ended after this step was announced, or after it was
			// claimed. Settle the row here, where both facts are known, so no
			// cancelled execution keeps a `running` step. Nothing is announced: the
			// step never ran, like the ones the cancellation sweep settles.
			await this.stepStore.cancelStep(step.id);
			return;
		}

		// This worker won the claim, so it is the one that announces the start.
		const lifecycleEventPublisher = this.lifecycleEventPublisherFactory.create(execution);
		lifecycleEventPublisher.publish({ type: 'step:started', ...stepEventFields(step, node) });

		// Decided outside the `try` below on purpose. Its errors are the engine's
		// own bookkeeping, not the node's, so they leave the step `running`
		// instead of recording it failed. In the future one of these resolves that:
		// - Reconciliation (CAT-2938) taking over the step and retrying it for transient errors
		// - Internal consistency checks (CAT-3930) detecting a misconfigured graph and failing the execution
		const dispatch = await this.dispatchFor(step, node, execution);

		// Only a failure to run the step fails it. A store error propagates instead —
		// recording `failed` on a step whose side effects happened would be a lie.
		let run:
			| { kind: 'outputs'; outputs: StepSlots }
			| { kind: 'wait'; wait: ExecutorWaitDeclaration }
			| { kind: 'subExecution'; subExecution: SubExecutionDeclaration }
			| { kind: 'error'; error: unknown };
		try {
			let result: StepExecutionResult;
			if (dispatch.kind === 'replay') {
				result = { outputs: recordedOutputs(step, dispatch.cause) };
			} else if (dispatch.kind === 'batch') {
				result = { outputs: await this.runBatchNode(step, execution, node) };
			} else {
				result = await this.runStep(step, execution, node, dispatch);
			}
			if (result.wait) {
				run = { kind: 'wait', wait: result.wait };
			} else if (result.subExecution) {
				run = { kind: 'subExecution', subExecution: result.subExecution };
			} else {
				run = { kind: 'outputs', outputs: result.outputs };
			}
		} catch (error) {
			run = { kind: 'error', error };
		}

		if (run.kind === 'subExecution') {
			const { subExecution } = run;
			if (subExecution.awaited) {
				await this.handleAwaitedSubExecution(event, step, execution, node, subExecution);
				return;
			}
			const started = await this.handleDetachedSubExecution(step, execution, subExecution);
			run =
				started.kind === 'error'
					? { kind: 'error', error: started.error }
					: { kind: 'outputs', outputs: subExecution.outputs };
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
		// planning follows.
		// TODO(CAT-2928): publish `step:waiting` so the UI can show it.
		if (run.kind === 'wait') {
			// Nudge first, so the sweeper's re-arm read runs beside the status
			// write rather than after it. Either order is correct.
			this.onStepSuspended();
			await this.executionStore.refreshLiveStatus(execution.id);
			return;
		}

		// Before the settled event, or the execution could announce its end first.
		// Outputs ride along so a consumer needs no read to render them.
		lifecycleEventPublisher.publish(
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

	/**
	 * Suspend the step on an awaited sub-execution, then start the sub-execution.
	 *
	 * We suspend first so the sub-execution never finishes before we suspend.
	 */
	private async handleAwaitedSubExecution(
		event: StepReadyEvent,
		step: StepRecord,
		execution: ExecutionRecord,
		node: GraphNode,
		subExecution: SubExecutionDeclaration,
	): Promise<void> {
		// A CAS on `running`: losing it means something else took the step over.
		const recorded = await this.stepStore.suspendStep(event.stepId, {
			subExecutionId: subExecution.executionId,
		});
		if (!recorded) return;
		// If the suspension results in no running steps, mark the execution as waiting.
		await this.executionStore.refreshLiveStatus(execution.id);

		const started = await this.startSubExecution(step, execution, subExecution);
		if (started.kind === 'started') return;

		const failed = await this.stepStore.failWaitingStep(step.id, toStepError(started.error));
		if (!failed) return;
		this.lifecycleEventPublisherFactory
			.create(execution)
			.publish({ type: 'step:failed', ...stepEventFields(step, node) });
		await this.orchestrationQueue.publish({
			type: 'step:settled',
			executionId: event.executionId,
			stepId: event.stepId,
		});
	}

	/** Starts a detached sub-execution. */
	private async handleDetachedSubExecution(
		step: StepRecord,
		execution: ExecutionRecord,
		subExecution: SubExecutionDeclaration,
	): Promise<{ kind: 'started' } | { kind: 'parent-ended' } | { kind: 'error'; error: unknown }> {
		const started = await this.startSubExecution(step, execution, subExecution);
		if (
			started.kind === 'error' &&
			started.error instanceof InvalidParentLinkError &&
			started.error.reason === 'execution-not-live'
		) {
			return { kind: 'parent-ended' };
		}
		return started;
	}

	/**
	 * Starts the sub-execution a step asked for, linked to the step that asked. The
	 * sub-execution inherits the mode and the caller context, and never the response
	 * expectation: a sub-execution does not answer the parent's caller.
	 */
	private async startSubExecution(
		step: StepRecord,
		execution: ExecutionRecord,
		subExecution: SubExecutionDeclaration,
	): Promise<{ kind: 'started' } | { kind: 'error'; error: unknown }> {
		try {
			await this.startExecution.start({
				executionId: subExecution.executionId,
				workflowId: subExecution.workflowId,
				graph: subExecution.graph,
				workflow: subExecution.workflow,
				triggerOutputs: subExecution.triggerOutputs,
				mode: execution.mode,
				callerContext: execution.callerContext,
				parent: { executionId: execution.id, stepId: step.id, awaited: subExecution.awaited },
			});
			return { kind: 'started' };
		} catch (error) {
			return { kind: 'error', error };
		}
	}

	/** How the step produces its result. */
	private async dispatchFor(
		step: StepRecord,
		node: GraphNode,
		execution: ExecutionRecord,
	): Promise<Dispatch> {
		const { resumeCause } = step;
		if (resumeCause !== null && resumeCause.kind !== 'subExecution') {
			return { kind: 'replay', cause: resumeCause };
		}
		if (node.type === 'batch') return { kind: 'batch' };
		return {
			kind: 'run',
			executor: this.executorFor(step, node),
			inputs: await this.gatherInputs(execution, step),
			...(resumeCause ? { subExecutionResult: resumeCause } : {}),
		};
	}

	private async runStep(
		step: StepRecord,
		execution: ExecutionRecord,
		node: GraphNode,
		{ executor, inputs, subExecutionResult }: Extract<Dispatch, { kind: 'run' }>,
	): Promise<StepExecutionResult> {
		// The slots are stored without inspection: which ones fired is the
		// settlement handler's concern. A declaration is not opaque in the same
		// way. The engine reads three of its fields to suspend and resume the
		// step, so it checks them here, where the step can still record as
		// failed. What the wait is for stays the node's.
		const result = await executor.execute({
			node,
			inputs,
			// If we're resuming from a sub-execution, we pass in the result so the
			// executor can use it to answer the sub-workflow call.
			...(subExecutionResult ? { resume: subExecutionResult } : {}),
			context: {
				executionId: execution.id,
				stepId: step.id,
				workflowId: execution.workflowId,
				mode: execution.mode,
				iteration: step.iteration,
				branch: step.branch,
				callerContext: execution.callerContext,
				responseExpectation: execution.responseExpectation,
			},
			respond: createResponseEmitter(this.responseSender, execution),
		});

		if (result.wait) validateWaitDeclaration(step.id, result.wait);

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

	/**
	 * Inputs for the step, each slot read from the source the planner recorded
	 * for it. The planner already chose which run of which predecessor feeds
	 * each slot, so no routing happens here.
	 */
	private async gatherInputs(execution: ExecutionRecord, step: StepRecord): Promise<StepSlots> {
		if (!step.sources) {
			// Only the trigger has no sources, and it never gathers inputs.
			throw new UnexpectedError(
				`step ${step.id} runs node ${step.nodeId} but records no sources to read`,
			);
		}

		const keys = step.sources
			.filter((source): source is StepSource => source !== null)
			.map(({ nodeId, iteration, branch }) => ({ nodeId, iteration, branch }));
		// One key per distinct row: a predecessor wired to two input slots is read
		// twice but loaded once.
		const rows = await this.stepStore.loadStepsByKeys(execution.id, [
			...new Map(keys.map((key) => [stepKeyId(key), key])).values(),
		]);

		return step.sources.map((source) =>
			source === null ? null : readSourceValue(source, step, rows),
		);
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
 * The value a source delivers: the output slot it names. The planner records
 * only live sources, so the step it names completed and filled that slot.
 */
function readSourceValue(
	source: StepSource,
	step: StepRecord,
	rows: Record<StepKeyId, StepRecord>,
): JsonValue {
	const row = rows[stepKeyId(source)];
	if (row?.status !== 'completed') {
		// A step is planned only once every source completed, so running on a
		// fabricated empty input would mask a planner/store inconsistency.
		throw new UnexpectedError(
			`step ${step.id} reads node ${source.nodeId} run ${source.branch}, which has not completed`,
		);
	}
	return row.outputs?.[source.outputIndex] ?? null;
}

/** The identifiers every step event carries. */
function stepEventFields(step: StepRecord, node: GraphNode) {
	return {
		executionId: step.executionId,
		stepId: step.id,
		nodeId: step.nodeId,
		nodeName: node.name,
		iteration: step.iteration,
		branch: step.branch,
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
 * The outputs a replay emits. A request's were produced where the request
 * arrived, and a deadline's were captured when the step suspended.
 *
 * `WaitDeclaration` pairs a deadline with its outputs, so an absent one means
 * the row disagrees with the contract — and a row is a write from outside the
 * type system.
 */
function recordedOutputs(step: StepRecord, cause: ReplayCause): StepSlots {
	if (cause.kind === 'request') return cause.outputs;

	const outputs = step.waitDeclaration?.outputsAtDeadline;
	if (!outputs) {
		throw new UnexpectedError(
			`step ${step.id} resumes at its deadline but its declaration captured no outputs`,
		);
	}
	return outputs;
}

/**
 * Rejects a declaration that would strand the execution. Throwing records the
 * step as failed, which a wait nothing can end would never do on its own.
 */
function validateWaitDeclaration(stepId: string, wait: ExecutorWaitDeclaration): void {
	if (!hasResumeCondition(wait)) {
		throw new UnexpectedError(
			`step ${stepId} declares a wait that can never resume: it names neither a deadline nor a resume binding`,
		);
	}

	// `suspendStep` derives `wait_till` from this value, so one no date can be
	// made from fails that write and leaves the claimed step running.
	if (wait.resumeAt !== undefined && Number.isNaN(Date.parse(wait.resumeAt))) {
		throw new UnexpectedError(
			`step ${stepId} declares a wait with a deadline that is not a date: ${wait.resumeAt}`,
		);
	}

	// The engine emits these when the deadline fires, and it never runs the step
	// again to produce them. Without this check the wait suspends, and the sweep
	// finds the gap at the deadline instead, with the step already `queued`.
	if (wait.resumeAt !== undefined && wait.outputsAtDeadline === undefined) {
		throw new UnexpectedError(
			`step ${stepId} declares a wait with a deadline but no outputs to emit at it`,
		);
	}
}
