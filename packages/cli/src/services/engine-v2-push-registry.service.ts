import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type { INodeExecutionData } from 'n8n-workflow';

/**
 * A step run reported to the editor. Kept after it settles so a redelivered
 * event is ignored instead of appending a duplicate.
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

/** State needed to relay one execution's lifecycle events to the editor. */
export class EngineV2PushSession {
	/** Ordering counter for `nodeExecuteBefore`/`nodeExecuteAfter`; starts at 0. */
	sequenceNumber = 0;
	/** Next `ITaskData.executionIndex` to hand out. */
	nextExecutionIndex = 0;
	/** Step runs keyed by the engine's step id. */
	readonly steps = new Map<string, EngineV2StepRun>();
	/** When the last lifecycle event for this execution arrived. */
	lastSeenAt = Date.now();

	constructor(
		/** The only routing key {@link Push.send} accepts. */
		readonly pushRef: string,
		readonly workflowId: string,
		/**
		 * The trigger's outputs, since the engine never announces it as a step.
		 * Cleared once emitted — pinned data can be large.
		 */
		public trigger?: { nodeName: string; outputs: INodeExecutionData[][] },
	) {}
}

/** Long enough to outlive a run that idles between steps, e.g. on a wait. */
const SESSION_TTL_MS = 12 * Time.hours.toMilliseconds;

/** Hard ceiling on the map, in case many runs stall inside the TTL. */
const MAX_SESSIONS = 500;

/**
 * Correlates a data-plane execution id with the editor session that started it.
 *
 * Lifecycle events carry no session id, so the push ref is recorded here at
 * dispatch and read back as events arrive.
 */
@Service()
export class EngineV2PushRegistry {
	/** Ordered least recently seen first, so eviction reads from the front. */
	private readonly sessions = new Map<string, EngineV2PushSession>();

	register(
		executionId: string,
		init: Pick<EngineV2PushSession, 'pushRef' | 'workflowId' | 'trigger'>,
	): void {
		this.evict();
		this.sessions.set(
			executionId,
			new EngineV2PushSession(init.pushRef, init.workflowId, init.trigger),
		);
	}

	get(executionId: string): EngineV2PushSession | undefined {
		const session = this.sessions.get(executionId);
		if (!session) return undefined;

		session.lastSeenAt = Date.now();
		// Re-insert to move the session to the back of the eviction order.
		this.sessions.delete(executionId);
		this.sessions.set(executionId, session);

		return session;
	}

	release(executionId: string): void {
		this.sessions.delete(executionId);
	}

	/**
	 * No `cancelled` event exists, so a session whose terminal event never
	 * arrives would live forever. Swept on write instead of on a timer, so
	 * there's no interval to manage.
	 */
	private evict(): void {
		const cutoff = Date.now() - SESSION_TTL_MS;
		for (const [executionId, session] of this.sessions) {
			if (session.lastSeenAt >= cutoff) break; // rest are newer
			this.sessions.delete(executionId);
		}

		// Leave room for the caller's session, so the cap holds after the insert.
		while (this.sessions.size >= MAX_SESSIONS) {
			const oldest = this.sessions.keys().next().value;
			if (oldest === undefined) break;
			this.sessions.delete(oldest);
		}
	}
}
