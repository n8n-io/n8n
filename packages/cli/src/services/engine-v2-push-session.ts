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
