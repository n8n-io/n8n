import type { StepSlots, StepStatus } from '../execution';

/**
 * A response an execution produces for whoever started it.
 *
 * Distinct from a lifecycle event, which reports that something happened. This
 * is the answer itself, and something is waiting for it.
 */
export type ExecutionResponse = EndedMessage;

/** The run is over. Always the last response an execution sends. */
export interface EndedMessage {
	type: 'ended';
	executionId: string;
	workflowId: string;
	status: 'completed' | 'failed';
	/**
	 * The step whose settling ended the run.
	 *
	 * `outputs` is `null` when that step was skipped or failed, so a consumer
	 * that needs the data has to look further. The engine reports what ended the
	 * run, not what a caller would like to answer with.
	 */
	lastStep: {
		nodeId: string;
		nodeName: string;
		status: StepStatus;
		outputs: StepSlots | null;
	};
}
