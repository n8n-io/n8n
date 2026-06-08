import type { ITriggerResponse } from 'n8n-workflow';

/**
 * Holds the activated trigger responses for a single workflow, keyed by node id.
 * One entry per activated trigger node.
 */
export class WorkflowActiveTriggersState {
	private readonly triggersByNodeId = new Map<string, ITriggerResponse>();

	/** Records the trigger response produced when activating a trigger node. */
	add(nodeId: string, response: ITriggerResponse) {
		this.triggersByNodeId.set(nodeId, response);
	}

	/** Whether no trigger responses have been recorded yet. */
	get isEmpty() {
		return this.triggersByNodeId.size === 0;
	}

	/** All recorded trigger responses, in insertion order. */
	get triggerResponses(): ITriggerResponse[] {
		return Array.from(this.triggersByNodeId.values());
	}
}
