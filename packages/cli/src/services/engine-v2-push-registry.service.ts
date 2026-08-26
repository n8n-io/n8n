import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { INodeExecutionData } from 'n8n-workflow';

/**
 * A step run the editor has been told about. Kept after the step settles rather
 * than deleted, so a redelivered update is ignored instead of appending a second
 * run under a fresh index.
 */
export class EngineV2StepRun {
	/** Whether the step's outcome has been reported. */
	settled = false;

	constructor(
		/** Pairs this run's `nodeExecuteAfter` with its `nodeExecuteAfterData`. */
		readonly executionIndex: number,
		readonly startTime: number,
	) {}
}

/** What relaying one execution's status updates to the editor needs. */
export class EngineV2PushSession {
	/** Ordering counter for `nodeExecuteBefore`/`nodeExecuteAfter`; starts at 0. */
	sequenceNumber = 0;
	/** Next `ITaskData.executionIndex` to hand out. */
	nextExecutionIndex = 0;
	/** Step runs keyed by the engine's step id. */
	readonly steps = new Map<string, EngineV2StepRun>();
	readonly registeredAt = Date.now();

	constructor(
		/** The only routing key {@link Push.send} accepts. */
		readonly pushRef: string,
		readonly workflowId: string,
		/**
		 * The trigger the run started from, and the outputs the dispatcher handed the
		 * engine. The engine records the trigger as an already-completed step and so
		 * never announces it, which would leave the editor showing an un-run trigger.
		 * Cleared once emitted — pinned trigger data can be large.
		 */
		public trigger?: { nodeName: string; outputs: INodeExecutionData[][] },
	) {}
}

/** Long enough to outlive any manual run, short enough to bound the map. */
const SESSION_TTL_MS = 60 * Time.minutes.toMilliseconds;

/**
 * Correlates a data-plane execution id with the editor session that started it.
 *
 * The status stream carries no way to name a session, so the push ref is
 * recorded here when the run is dispatched and read back when its updates
 * arrive. Lives in the control plane rather than on the wire: which editor tab
 * is watching is not the engine's concern.
 */
@Service()
export class EngineV2PushRegistry {
	private readonly sessions = new Map<string, EngineV2PushSession>();

	register(
		executionId: string,
		init: Pick<EngineV2PushSession, 'pushRef' | 'workflowId' | 'trigger'>,
	): void {
		this.evictStale();
		this.sessions.set(
			executionId,
			new EngineV2PushSession(init.pushRef, init.workflowId, init.trigger),
		);
	}

	get(executionId: string): EngineV2PushSession | undefined {
		return this.sessions.get(executionId);
	}

	release(executionId: string): void {
		this.sessions.delete(executionId);
	}

	/**
	 * Status delivery is at-most-once and there is no `cancelled` update, so a
	 * session whose terminal event never arrives would live forever. Swept on
	 * write rather than on a timer: nothing enters the map without a `register`,
	 * so the map is bounded by the runs started inside one TTL window, and there
	 * is no interval to unref or shut down.
	 */
	private evictStale(): void {
		const cutoff = Date.now() - SESSION_TTL_MS;
		for (const [executionId, session] of this.sessions) {
			if (session.registeredAt < cutoff) this.sessions.delete(executionId);
		}
	}
}
