import type { INodeExecutionData, ISourceData, NodeConnectionType } from 'n8n-workflow';

/**
 * A step run reported to the editor. Kept after it settles so a redelivered
 * event is ignored instead of appending a duplicate.
 */
export class EngineV2StepRun {
	/** Whether the step's outcome has been reported. */
	settled = false;
	/** Whether the step is reported as waiting and has not resumed since. */
	waiting = false;

	constructor(
		/** Pairs this run's `nodeExecuteAfter` with its `nodeExecuteAfterData`. */
		readonly executionIndex: number,
		readonly startTime: number,
		/** Where the editor shows the run. A tool call goes under the node that declared it. */
		readonly placement: EngineV2RunPlacement = MAIN_PLACEMENT,
	) {}
}

/** Where a step run sits in the editor's run data. */
export interface EngineV2RunPlacement {
	nodeName?: string;
	/** The run's index in the editor's runs of its node. Spawned steps point at it. */
	runIndex: number;
	/** The connection type of the outputs: `main`, or `ai_tool` for a tool call. */
	connectionType: NodeConnectionType;
	source: ISourceData[];
}

const MAIN_PLACEMENT: EngineV2RunPlacement = { runIndex: 0, connectionType: 'main', source: [] };

/** State needed to relay one execution's lifecycle events to the editor. */
export class EngineV2PushSession {
	/** Ordering counter for `nodeExecuteBefore`/`nodeExecuteAfter`; starts at 0. */
	sequenceNumber = 0;
	/** Next `ITaskData.executionIndex` to hand out. */
	nextExecutionIndex = 0;
	/** Step runs keyed by the engine's step id. */
	readonly steps = new Map<string, EngineV2StepRun>();
	/** How many spawned runs each node has had, so each tool call gets the next run index. */
	readonly spawnedRunCountByNode = new Map<string, number>();
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
