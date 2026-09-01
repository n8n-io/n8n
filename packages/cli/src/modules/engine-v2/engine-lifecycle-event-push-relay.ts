import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { fromStepInputs } from '@n8n/node-engine-compatibility';
import type { ExecutionStatus, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { WorkflowOperationError } from 'n8n-workflow';

import { Push } from '@/push';
import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';
import type { EngineV2PushSession } from '@/services/engine-v2-push-session';
import { EngineV2StepRun } from '@/services/engine-v2-push-session';
import { getItemCountByConnectionType } from '@/utils/get-item-count-by-connection-type';

/** A lifecycle event scoped to one step. */
type StepUpdate = Extract<LifecycleEvent, { stepId: string }>;

/**
 * Placeholder error: no failure detail is available yet, and without an
 * `error` the editor would show a failed step as successful.
 *
 * TODO(CAT-2878 follow-up): carry the real failure through and drop this.
 */
const STEP_FAILURE_DESCRIPTION = 'Engine 2.0 does not report error detail yet.';

/**
 * Relays engine lifecycle events to the editor as push messages.
 *
 * Reuses the push messages v1 runs already send, so the frontend needs no
 * engine-specific code.
 */
@Service()
export class EngineLifecycleEventPushRelay {
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
			// No session means nothing is watching this run — safe to drop.
			if (!session) continue;

			try {
				this.relayOne(update, session);
			} catch (error) {
				// Isolate failures so one bad event doesn't drop the rest of the batch.
				this.logger.error('Failed to relay engine lifecycle event to the editor', {
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
	 * Reports the trigger's run, since the engine never announces it as a step.
	 *
	 * Sends no `executionStarted`: the editor already promoted the run from the
	 * dispatch response, and the message would overwrite its run data with an
	 * empty scaffold. Runs the editor did not start need it — TODO(CAT-4258).
	 */
	private onExecutionStarted(executionId: string, at: string, session: EngineV2PushSession): void {
		const { trigger } = session;
		// Clear before use so a redelivery can't re-emit the run or hold onto
		// the (possibly large) pinned data.
		session.trigger = undefined;
		// No trigger, no node to report outputs for.
		if (!trigger) return;

		// The trigger has no step id, so it isn't tracked in `steps`.
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

		// A missing `step:started` must not lose the outcome too.
		const run = started ?? new EngineV2StepRun(session.nextExecutionIndex++, Date.parse(update.at));
		session.steps.set(update.stepId, run);

		this.sendNodeExecuteAfter(update.executionId, update.nodeName, run, session, {
			// Same clock, same process — the difference is safe to trust.
			executionTime: Math.max(0, Date.parse(update.at) - run.startTime),
			outputs,
		});

		run.settled = true;
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

		// Releasing here makes a redelivered terminal event a no-op.
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
					// No input lineage to report, so `source` is empty. See CAT-4265.
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
		// Every output slot is `main`: no other connection type exists here.
		const data = outputs ? { main: outputs } : undefined;

		const taskData: ITaskData = {
			startTime: run.startTime,
			executionIndex: run.executionIndex,
			// No input lineage to report, so `source` is empty. See CAT-4265.
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

		// A failed step has no data, so there's no second message to send.
		if (!data) return;

		// TODO(CAT-2878 follow-up): redact this before sending; needs a resolved
		// user, which isn't available here yet.

		// Binary avoids a copy: the editor hands it straight to a worker.
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
