import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { LifecycleEvent, StepError } from '@n8n/engine';
import { fromStepInputs, fromV1ErrorDetails } from '@n8n/node-engine-compatibility';
import type { ExecutionStatus, INodeExecutionData, ITaskData } from 'n8n-workflow';

import { Push } from '@/push';
import { EngineV2PushRegistry } from '@/services/engine-v2-push-registry.service';
import type { EngineV2PushSession } from '@/services/engine-v2-push-session';
import { EngineV2StepRun } from '@/services/engine-v2-push-session';
import { getItemCountByConnectionType } from '@/utils/get-item-count-by-connection-type';

/** A lifecycle event scoped to one step. */
type StepUpdate = Extract<LifecycleEvent, { stepId: string }>;

/**
 * How a step settled. A completed step may have no outputs: the channel
 * sender drops them from the event when the frame is over its size limit.
 */
type StepOutcome =
	| { status: 'success'; outputs: INodeExecutionData[][] | undefined }
	| { status: 'error'; error: StepError };

/** What a `nodeExecuteAfter` message reports: an outcome, or a wait with none yet. */
type StepReport = StepOutcome | { status: 'waiting' };

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
				return this.onStepSettled(update, session, {
					status: 'success',
					outputs: update.outputs && fromStepInputs(update.outputs),
				});
			case 'step:failed':
				return this.onStepSettled(update, session, { status: 'error', error: update.error });
			case 'step:waiting':
				return this.onStepWaiting(update, session);
			case 'execution:completed':
				return this.onExecutionFinished(update.executionId, update.workflowId, 'success', session);
			case 'execution:failed':
				return this.onExecutionFinished(update.executionId, update.workflowId, 'error', session);
			case 'execution:cancelled':
				return this.onExecutionFinished(update.executionId, update.workflowId, 'canceled', session);
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
			report: { status: 'success', outputs: trigger.outputs },
		});
	}

	private onStepStarted(update: StepUpdate, session: EngineV2PushSession): void {
		const known = session.steps.get(update.stepId);
		if (known?.waiting && !known.settled) {
			// A resumed wait. Keep the first start time: the editor's logs drop a
			// start that matches an existing run, and would keep a newer one as a
			// stale "running" row.
			this.sendNodeExecuteBefore(update.executionId, update.nodeName, known, session);
			known.waiting = false;
			return;
		}
		if (known) return;

		const run = new EngineV2StepRun(session.nextExecutionIndex++, Date.parse(update.at));
		session.steps.set(update.stepId, run);

		this.sendNodeExecuteBefore(update.executionId, update.nodeName, run, session);
	}

	private onStepSettled(
		update: StepUpdate,
		session: EngineV2PushSession,
		outcome: StepOutcome,
	): void {
		const started = session.steps.get(update.stepId);
		if (started?.settled) return;

		const run = this.runFor(update, session);
		this.sendNodeExecuteAfter(update.executionId, update.nodeName, run, session, {
			executionTime: this.executionTimeOf(update, run),
			report: outcome,
		});

		run.settled = true;
	}

	/**
	 * Shows the node as waiting. The step's outcome comes later, with the same
	 * `executionIndex`, and the editor replaces the waiting run with it.
	 */
	private onStepWaiting(update: StepUpdate, session: EngineV2PushSession): void {
		const started = session.steps.get(update.stepId);
		if (started?.settled || started?.waiting) return;

		const run = this.runFor(update, session);
		this.sendNodeExecuteAfter(update.executionId, update.nodeName, run, session, {
			executionTime: this.executionTimeOf(update, run),
			report: { status: 'waiting' },
		});

		run.waiting = true;
	}

	/** The run `step:started` opened, or a new one so a lost start loses nothing else. */
	private runFor(update: StepUpdate, session: EngineV2PushSession): EngineV2StepRun {
		const run =
			session.steps.get(update.stepId) ??
			new EngineV2StepRun(session.nextExecutionIndex++, Date.parse(update.at));
		session.steps.set(update.stepId, run);
		return run;
	}

	private executionTimeOf(update: StepUpdate, run: EngineV2StepRun): number {
		// Same clock, same process — the difference is safe to trust.
		return Math.max(0, Date.parse(update.at) - run.startTime);
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
		result: { executionTime: number; report: StepReport },
	): void {
		const { executionTime, report } = result;
		const outputs = report.status === 'success' ? report.outputs : undefined;
		// Every output slot is `main`: no other connection type exists here.
		const data = outputs ? { main: outputs } : undefined;

		const taskData: ITaskData = {
			startTime: run.startTime,
			executionIndex: run.executionIndex,
			// No input lineage to report, so `source` is empty. See CAT-4265.
			source: [],
			executionTime,
			executionStatus: report.status,
			data,
			...(report.status === 'error'
				? {
						error: fromV1ErrorDetails(
							report.error.name,
							report.error.message,
							report.error.details,
						),
					}
				: {}),
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

		// No data, no second message: the step failed, waits, or its outputs were withheld.
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
