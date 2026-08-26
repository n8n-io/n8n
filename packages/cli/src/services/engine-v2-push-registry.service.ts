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
	readonly registeredAt = Date.now();

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

/** Long enough to outlive any manual run, short enough to bound the map. */
const SESSION_TTL_MS = 60 * Time.minutes.toMilliseconds;

/**
 * Correlates a data-plane execution id with the editor session that started it.
 *
 * Lifecycle events carry no session id, so the push ref is recorded here at
 * dispatch and read back as events arrive.
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
	 * No `cancelled` event exists, so a session whose terminal event never
	 * arrives would live forever. Swept on write instead of on a timer, so
	 * there's no interval to manage.
	 */
	private evictStale(): void {
		const cutoff = Date.now() - SESSION_TTL_MS;
		for (const [executionId, session] of this.sessions) {
			if (session.registeredAt < cutoff) this.sessions.delete(executionId);
		}
	}
}
