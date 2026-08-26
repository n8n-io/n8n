import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { fromStepInputs } from '@n8n/node-engine-compatibility';
import type { ExecutionStatus, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { WorkflowOperationError } from 'n8n-workflow';

import { Push } from '@/push';
import type { EngineV2PushSession } from '@/services/engine-v2-push-registry.service';
import { EngineV2PushRegistry, EngineV2StepRun } from '@/services/engine-v2-push-registry.service';
import { getItemCountByConnectionType } from '@/utils/get-item-count-by-connection-type';

/** One step's identity on the push wire; the editor keys on the node name. */
type StepUpdate = Extract<LifecycleEvent, { stepId: string }>;

/**
 * The engine reports that a step failed but not why: error detail stays off the
 * status wire and is re-queried from the data plane instead, which the control
 * plane has no path for yet. Without an `error` the editor renders a failed node
 * as if it had succeeded, so stand one in.
 *
 * TODO(CAT-2878 follow-up): carry the real failure through and drop this.
 */
const STEP_FAILURE_DESCRIPTION = 'Engine 2.0 does not report error detail yet.';

/**
 * Relays the data plane's lifecycle events to the editor as push messages.
 *
 * A translation layer and nothing more: it maps `LifecycleEvent`s onto the push
 * messages the editor already handles for v1 runs, so no frontend code has to
 * know which engine produced an execution. Mirrors `hookFunctionsPush`, which is
 * where the v1 path does the same job from execution lifecycle hooks.
 */
@Service()
export class EngineStatusPushRelay {
	constructor(
		private readonly registry: EngineV2PushRegistry,
		private readonly push: Push,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('engine-v2');
	}

	relay(events: LifecycleEvent[]): void {
		for (const update of events) {
			const session = this.registry.get(update.executionId);
			// No session: a production run, a run started before this process, or one
			// already finished. Dropping is correct — the stream is a freshness
			// signal, and the data plane stays the source of truth.
			if (!session) continue;

			try {
				this.relayOne(update, session);
			} catch (error) {
				// One bad update must not cost the rest of the batch: the data plane
				// does not retry, so whatever we drop here is gone for good.
				this.logger.error('Failed to relay engine status update to the editor', {
					executionId: update.executionId,
					type: update.type,
					error,
				});
			}
		}
	}

	private relayOne(update: LifecycleEvent, session: EngineV2PushSession): void {
		switch (update.type) {
			case 'execution:started':
				return this.onExecutionStarted(update.executionId, update.at, session);
			case 'step:started':
				return this.onStepStarted(update, session);
			case 'step:completed':
				return this.onStepSettled(update, session, fromStepInputs(update.outputs));
			case 'step:failed':
				return this.onStepSettled(update, session, undefined);
			case 'execution:completed':
				return this.onExecutionFinished(update.executionId, update.workflowId, 'success', session);
			case 'execution:failed':
				return this.onExecutionFinished(update.executionId, update.workflowId, 'error', session);
		}
	}

	/**
	 * Emits the trigger's run.
	 *
	 * No `executionStarted` message: the editor already built its execution
	 * scaffold from the run response, and `executionStarted` would overwrite that
	 * scaffold's run data — including reused and pinned data — with the empty set
	 * this path has. The trigger is the one thing missing, because the engine
	 * records it as already completed and so never announces it as a step.
	 */
	private onExecutionStarted(executionId: string, at: string, session: EngineV2PushSession): void {
		const { trigger } = session;
		// Cleared before use, so a redelivered `execution:started` cannot emit the
		// run twice and the (potentially large) pinned payload does not linger.
		session.trigger = undefined;
		// Without a trigger to start from we cannot name the node the outputs
		// belong to, so there is nothing to report.
		if (!trigger) return;

		// Not tracked in `steps`: the trigger has no step id, and the cleared
		// `session.trigger` above is already what stops a second report.
		const run = new EngineV2StepRun(session.nextExecutionIndex++, Date.parse(at));

		this.sendNodeExecuteBefore(executionId, trigger.nodeName, run, session);
		this.sendNodeExecuteAfter(executionId, trigger.nodeName, run, session, {
			executionTime: 0,
			outputs: trigger.outputs,
		});
	}

	private onStepStarted(update: StepUpdate, session: EngineV2PushSession): void {
		if (session.steps.has(update.stepId)) return;

		const run = new EngineV2StepRun(session.nextExecutionIndex++, Date.parse(update.at));
		session.steps.set(update.stepId, run);

		this.sendNodeExecuteBefore(update.executionId, update.nodeName, run, session);
	}

	/**
	 * @param outputs The step's output slots, or `undefined` when it failed.
	 */
	private onStepSettled(
		update: StepUpdate,
		session: EngineV2PushSession,
		outputs: INodeExecutionData[][] | undefined,
	): void {
		const started = session.steps.get(update.stepId);
		if (started?.settled) return;

		// A lost `step:started` must not lose the outcome too. Allocating here still
		// appends a run, which is what the editor needs.
		const run = started ?? new EngineV2StepRun(session.nextExecutionIndex++, Date.parse(update.at));
		run.settled = true;
		session.steps.set(update.stepId, run);

		this.sendNodeExecuteAfter(update.executionId, update.nodeName, run, session, {
			// Both timestamps come off the same clock in the same process.
			executionTime: Math.max(0, Date.parse(update.at) - run.startTime),
			outputs,
		});
	}

	private onExecutionFinished(
		executionId: string,
		workflowId: string,
		status: ExecutionStatus,
		session: EngineV2PushSession,
	): void {
		this.push.send(
			{ type: 'executionFinished', data: { executionId, workflowId, status } },
			session.pushRef,
		);

		// Also what makes a redelivered terminal update a no-op: the next lookup
		// finds no session.
		this.registry.release(executionId);
	}

	private sendNodeExecuteBefore(
		executionId: string,
		nodeName: string,
		run: EngineV2StepRun,
		session: EngineV2PushSession,
	): void {
		this.push.send(
			{
				type: 'nodeExecuteBefore',
				data: {
					executionId,
					nodeName,
					sequenceNumber: session.sequenceNumber++,
					// The engine does not report v1 input lineage, so `source` is empty.
					data: { startTime: run.startTime, executionIndex: run.executionIndex, source: [] },
				},
			},
			session.pushRef,
		);
	}

	private sendNodeExecuteAfter(
		executionId: string,
		nodeName: string,
		run: EngineV2StepRun,
		session: EngineV2PushSession,
		result: { executionTime: number; outputs: INodeExecutionData[][] | undefined },
	): void {
		const { executionTime, outputs } = result;
		// Every engine output slot is a `main` slot: the graph's edges carry an
		// output index and no connection type, so nothing else is representable.
		const data = outputs ? { main: outputs } : undefined;

		const taskData: ITaskData = {
			startTime: run.startTime,
			executionIndex: run.executionIndex,
			source: [],
			executionTime,
			executionStatus: outputs ? 'success' : 'error',
			data,
			...(outputs
				? {}
				: {
						error: new WorkflowOperationError(
							'Node execution failed',
							undefined,
							STEP_FAILURE_DESCRIPTION,
						),
					}),
		};

		const itemCountByConnectionType = getItemCountByConnectionType(data);
		const { data: _withheld, ...trimmed } = taskData;

		this.push.send(
			{
				type: 'nodeExecuteAfter',
				data: {
					executionId,
					nodeName,
					sequenceNumber: session.sequenceNumber++,
					data: trimmed,
					itemCountByConnectionType,
				},
			},
			session.pushRef,
		);

		// A failed step produced nothing, so there is no second message to send and
		// the editor keeps the empty placeholder the message above implies.
		if (!data) return;

		// TODO(CAT-2878 follow-up): the v1 path runs this through
		// `ExecutionRedactionServiceProxy` before it leaves the server. Wiring that
		// here needs a resolved user, which the v2 path does not carry yet.

		// Sent as a binary frame for the same reason the v1 path does: the editor
		// receives it as an ArrayBuffer and hands it to a worker without a copy.
		const asBinary = true;
		this.push.send(
			{
				type: 'nodeExecuteAfterData',
				data: { executionId, nodeName, data: taskData, itemCountByConnectionType },
			},
			session.pushRef,
			asBinary,
		);
	}
}
